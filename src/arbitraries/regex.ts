import {Arbitrary, NoArbitrary} from './internal.js'
import {ArbitraryInteger} from './ArbitraryInteger.js'
import {ArbitraryConstant} from './ArbitraryConstant.js'
import {ArbitraryArray} from './ArbitraryArray.js'
import {ArbitraryTuple} from './ArbitraryTuple.js'
import {ArbitraryComposite} from './ArbitraryComposite.js'
import {char} from './string.js'
import type {CharClassKey, IPv4Address, HttpUrl} from './types.js'

// Direct implementations to avoid circular dependencies
const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> => {
  if (min > max) return NoArbitrary
  if (min === max) return new ArbitraryConstant(min)
  return new ArbitraryInteger(min, max)
}

const constant = <A>(constant: A): Arbitrary<A> => new ArbitraryConstant(constant)

const array = <A>(arbitrary: Arbitrary<A>, min = 0, max = 10): Arbitrary<A[]> => {
  if (min > max) return NoArbitrary
  return new ArbitraryArray(arbitrary, min, max)
}

const tuple = <const U extends readonly Arbitrary<any>[]>(...arbitraries: U): Arbitrary<any> => {
  if (arbitraries.some(a => a === NoArbitrary)) return NoArbitrary
  return new ArbitraryTuple([...arbitraries])
}

const union = <A>(...arbitraries: Arbitrary<A>[]): Arbitrary<A> => {
  const filtered = arbitraries.filter(a => a !== NoArbitrary)
  if (filtered.length === 0) return NoArbitrary
  if (filtered.length === 1) return filtered[0]
  return new ArbitraryComposite(filtered)
}

const oneof = <const A extends readonly unknown[]>(elements: A): Arbitrary<A[number]> =>
  elements.length === 0 ? NoArbitrary : integer(0, elements.length - 1).map(i => elements[i])

// Local implementation of string to avoid circular dependency
const _string = (min = 2, max = 10, charArb = char()): Arbitrary<string> =>
  min === 0 && max === 0 ? constant('') : array(charArb, min, max).map(a => a.join(''))

/**
 * RegexCharClass represents a character class in a regular expression
 * Used for generating strings matching specific character sets
 */
type RegexCharClass = {
  /** Minimum number of occurrences */
  min: number;
  /** Maximum number of occurrences (Infinity for +, *) */
  max: number;
  /** Generator for this character class */
  generator: Arbitrary<string>;
}

/**
 * Maps common regex character classes to their corresponding arbitraries
 */
const charClassMap: Record<string, Arbitrary<string>> = {
  // Digit classes
  '\\d': integer(0, 9).map(String),
  '[0-9]': integer(0, 9).map(String),

  // Word character classes
  '\\w': union(
    char('a', 'z'),
    char('A', 'Z'),
    integer(0, 9).map(String),
    constant('_')
  ),
  '[a-zA-Z0-9_]': union(
    char('a', 'z'),
    char('A', 'Z'),
    integer(0, 9).map(String),
    constant('_')
  ),

  // Whitespace
  '\\s': oneof([' ', '\t', '\n', '\r', '\f', '\v']),

  // Any character (except newline)
  '.': char('\u0001', '\u{10FFFF}'),

  // Alphanumeric subsets
  '[a-z]': char('a', 'z'),
  '[A-Z]': char('A', 'Z'),
  '[a-zA-Z]': union(char('a', 'z'), char('A', 'Z')),

  // Special character classes
  '\\S': char().filter(c => !' \t\n\r\f\v'.includes(c)),
  '\\D': char().filter(c => !/\d/.test(c)),
  '\\W': char().filter(c => !/[a-zA-Z0-9_]/.test(c))
}

/**
 * Parses a simple regex pattern into a sequence of character classes
 * This handles a subset of regex syntax including:
 * - Basic character classes like \d, \w, [a-z]
 * - Quantifiers like *, +, ?, {n}, {n,m}
 * - Alternative sequences with |
 *
 * @param pattern The regex pattern to parse
 * @returns An array of RegexCharClass objects
 */
function parseRegexPattern(pattern: string | RegExp): RegexCharClass[] {
  const patternStr = pattern instanceof RegExp ? pattern.source : pattern

  // Handle simple alternation patterns directly
  if (/^\([^()]+\|[^()]+\)$/.test(patternStr)) {
    // Simple (a|b) pattern
    const options = patternStr.slice(1, -1).split('|')
    return [{
      min: 1,
      max: 1,
      generator: oneof(options)
    }]
  }

  // Simple regex parser - production code would use a proper parser
  const charClasses: RegexCharClass[] = []
  let i = 0

  while (i < patternStr.length) {
    const currentChar = patternStr[i]

    // Handle character classes
    if (currentChar === '\\' && i + 1 < patternStr.length) {
      // Escape sequence
      const escapeSeq = patternStr.substr(i, 2)
      if (charClassMap[escapeSeq] !== undefined) {
        const quantifier = parseQuantifier(patternStr, i + 2)
        charClasses.push({
          min: quantifier.min,
          max: quantifier.max,
          generator: charClassMap[escapeSeq]
        })
        i = quantifier.nextIndex
      } else {
        // Literal escaped character
        charClasses.push({
          min: 1,
          max: 1,
          generator: constant(patternStr[i + 1])
        })
        i += 2
      }
    } else if (currentChar === '[') {
      // Character class like [a-z]
      const endBracket = patternStr.indexOf(']', i)
      if (endBracket === -1) {
        throw new Error(`Invalid regex pattern: missing closing bracket for character class starting at position ${i}`, {
          cause: `Pattern parsing error at position ${i} in pattern: ${patternStr}`
        })
      }

      const charClass = patternStr.substring(i, endBracket + 1)
      if (charClassMap[charClass] !== undefined) {
        const quantifier = parseQuantifier(patternStr, endBracket + 1)
        charClasses.push({
          min: quantifier.min,
          max: quantifier.max,
          generator: charClassMap[charClass]
        })
        i = quantifier.nextIndex
      } else {
        // Custom character class - parse it
        const generator = parseCustomCharClass(charClass)
        const quantifier = parseQuantifier(patternStr, endBracket + 1)
        charClasses.push({
          min: quantifier.min,
          max: quantifier.max,
          generator
        })
        i = quantifier.nextIndex
      }
    } else if (currentChar === '.') {
      // Any character
      const quantifier = parseQuantifier(patternStr, i + 1)
      charClasses.push({
        min: quantifier.min,
        max: quantifier.max,
        generator: charClassMap['.']
      })
      i = quantifier.nextIndex
    } else if (currentChar === '|') {
      // For simple implementation, we'll treat | as an OR and make it a special case
      i++
    } else if (currentChar === '(' || currentChar === ')') {
      // Skip parentheses - handled separately for simple cases
      i++
    } else {
      // Literal character
      charClasses.push({
        min: 1,
        max: 1,
        generator: constant(currentChar)
      })
      i++
    }
  }

  return charClasses
}

/**
 * Parse quantifiers like *, +, ?, {n}, {n,m}
 */
function parseQuantifier(pattern: string, startIndex: number): { min: number, max: number, nextIndex: number } {
  if (startIndex >= pattern.length) {
    return {min: 1, max: 1, nextIndex: startIndex}
  }

  const char = pattern[startIndex]
  switch (char) {
    case '*':
      return {min: 0, max: Number.POSITIVE_INFINITY, nextIndex: startIndex + 1}
    case '+':
      return {min: 1, max: Number.POSITIVE_INFINITY, nextIndex: startIndex + 1}
    case '?':
      return {min: 0, max: 1, nextIndex: startIndex + 1}
    case '{': {
      const closeBrace = pattern.indexOf('}', startIndex)
      if (closeBrace === -1) {
        return {min: 1, max: 1, nextIndex: startIndex}
      }

      const rangeStr = pattern.substring(startIndex + 1, closeBrace)
      const rangeParts = rangeStr.split(',').map(p => p.trim())

      if (rangeParts.length === 1) {
        // {n}
        const count = parseInt(rangeParts[0], 10)
        return {min: count, max: count, nextIndex: closeBrace + 1}
      } else if (rangeParts.length === 2) {
        // {n,m}
        const min = rangeParts[0] !== '' ? parseInt(rangeParts[0], 10) : 0
        const max = rangeParts[1] !== '' ? parseInt(rangeParts[1], 10) : Number.POSITIVE_INFINITY
        return {min, max, nextIndex: closeBrace + 1}
      }

      return {min: 1, max: 1, nextIndex: closeBrace + 1}
    }
    default:
      return {min: 1, max: 1, nextIndex: startIndex}
  }
}

/**
 * Parse custom character classes like [a-zA-Z0-9]
 */
function parseCustomCharClass(charClass: string): Arbitrary<string> {
  // Remove brackets
  const content = charClass.slice(1, -1)
  let negate = false
  let startIndex = 0

  // Check for negation
  if (content.startsWith('^')) {
    negate = true
    startIndex = 1
  }

  const generators: Arbitrary<string>[] = []
  let i = startIndex

  while (i < content.length) {
    if (i + 2 < content.length && content[i + 1] === '-') {
      // Range like a-z
      generators.push(char(content[i], content[i + 2]))
      i += 3
    } else {
      // Single character
      generators.push(constant(content[i]))
      i++
    }
  }

  const combinedGenerator = union(...generators)

  if (negate) {
    // For negated classes, we generate any character and filter
    // This is inefficient but works for basic cases
    return char().filter(c => {
      try {
        const re = new RegExp(`[${content}]`)
        return !re.test(c)
      } catch (_e) {
        return true // If regex creation fails, don't filter
      }
    })
  }

  return combinedGenerator
}

/**
 * Generate a string from a sequence of character classes
 */
function generateStringFromCharClasses(charClasses: RegexCharClass[]): Arbitrary<string> {
  if (charClasses.length === 0) {
    return constant('')
  }

  // Generate arbitraries for each character class
  const arbitraries = charClasses.map(cc => {
    // Determine the actual bounds - handle infinity for max
    const actualMax = cc.max === Number.POSITIVE_INFINITY ?
      Math.min(10, Math.max(5, cc.min * 2)) : // Reasonable upper bound for infinite quantifiers
      cc.max

    // Generate the appropriate number of characters for this class
    return array(cc.generator, cc.min, actualMax).map(chars => chars.join(''))
  })

  // Combine all parts into a single string
  return tuple(...arbitraries).map(parts => parts.join(''))
}

/**
 * Creates an arbitrary that generates strings matching the given regex pattern
 *
 * @param pattern A string or RegExp representing the pattern to match
 * @param maxLength Optional maximum length for generated strings
 * @returns An arbitrary that generates strings matching the pattern
 */
export function regex(pattern: string | RegExp, maxLength: number = 100): Arbitrary<string> {
  try {
    // Validate the pattern
    if (typeof pattern === 'string') {

      new RegExp(pattern)
    }

    // Parse the pattern into character classes
    const charClasses = parseRegexPattern(pattern)

    // Generate a string arbitrary
    const arbitrary = generateStringFromCharClasses(charClasses)

    // Apply max length constraint and ensure pattern matching
    return arbitrary
      .filter(s => s.length <= maxLength)
      .filter(s => {
        try {
          const re = pattern instanceof RegExp ? pattern : new RegExp(`^${pattern}$`)
          return re.test(s)
        } catch (_e) {
          return false
        }
      })
  } catch (_e) {
    console.error('Error creating regex arbitrary:', _e)
    return NoArbitrary
  }
}

/**
 * Creates an arbitrary that generates strings matching common patterns
 */
export const patterns = {
  /**
   * Generates valid email addresses
   */
  email: (): Arbitrary<string> => {
    const localPartChars = union(
      char('a', 'z'),
      char('A', 'Z'),
      integer(0, 9).map(String),
      oneof(['_', '.', '-'])
    )

    const domainChars = union(
      char('a', 'z'),
      char('A', 'Z'),
      integer(0, 9).map(String),
      constant('-')
    )

    const localPart = array(localPartChars, 1, 64).map(chars => chars.join(''))
      .filter(s => !s.startsWith('.') && !s.endsWith('.') && !s.includes('..'))

    const domainPart = array(
      array(domainChars, 1, 63).map(chars => chars.join(''))
        .filter(s => !s.startsWith('-') && !s.endsWith('-')),
      1, 5
    ).map(parts => parts.join('.'))

    return tuple(localPart, domainPart).map(([local, domain]) => `${local}@${domain}`)
      .filter(email => {
        // Ensure it matches a reasonable email regex
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        return emailRegex.test(email)
      })
  },

  /**
   * Generates strings matching a UUID v4 pattern
   */
  uuid: (): Arbitrary<string> => {
    const hexDigit = oneof('0123456789abcdef'.split(''))

    return tuple(
      // 8 hex digits
      array(hexDigit, 8, 8),
      // 4 hex digits
      array(hexDigit, 4, 4),
      // 4 hex digits, first digit must be 4 (version 4 UUID)
      tuple(constant('4'), array(hexDigit, 3, 3)),
      // 4 hex digits, first digit must be 8, 9, a, or b
      tuple(oneof(['8', '9', 'a', 'b']), array(hexDigit, 3, 3)),
      // 12 hex digits
      array(hexDigit, 12, 12)
    ).map(([a, b, c, d, e]) => {
      return `${a.join('')}-${b.join('')}-${c[0]}${c[1].join('')}-${d[0]}${d[1].join('')}-${e.join('')}`
    })
  },

  /**
   * Generates strings matching IP v4 addresses
   */
  ipv4: (): Arbitrary<IPv4Address> => {
    const octet = integer(0, 255)
    return tuple(octet, octet, octet, octet)
      .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}` as IPv4Address)
  },

  /**
   * Generates strings matching URLs
   */
  url: (): Arbitrary<HttpUrl> => {
    const protocol = oneof(['http', 'https'] as const)

    const domainChars = union(
      char('a', 'z'),
      char('A', 'Z'),
      integer(0, 9).map(String),
      constant('-')
    )

    const domain = array(
      array(domainChars, 1, 63)
        .map(chars => chars.join(''))
        .filter(s => !s.startsWith('-') && !s.endsWith('-')),
      1, 5
    ).map(parts => parts.join('.'))

    const pathSegment = array(
      union(
        char('a', 'z'),
        char('A', 'Z'),
        integer(0, 9).map(String),
        oneof(['_', '-', '.', '~', ':', '@', '!', '$', '&', "'", '(', ')', '*', '+', ',', ';', '='])
      ),
      0, 10
    ).map(chars => chars.join(''))

    const path = array(pathSegment, 0, 5)
      .map(segments => segments.length > 0 ? `/${segments.join('/')}` : '')

    const queryParam = tuple(
      array(union(char('a', 'z'), char('A', 'Z'), integer(0, 9).map(String)), 1, 10).map(chars => chars.join('')),
      array(union(char('a', 'z'), char('A', 'Z'), integer(0, 9).map(String)), 0, 10).map(chars => chars.join(''))
    ).map(([key, value]) => value !== '' ? `${key}=${value}` : key)

    const query = array(queryParam, 0, 3)
      .map(params => params.length > 0 ? `?${params.join('&')}` : '')

    const hash = array(
      union(char('a', 'z'), char('A', 'Z'), integer(0, 9).map(String)),
      0, 10
    ).map(chars => chars.length > 0 ? `#${chars.join('')}` : '')

    return tuple(protocol, domain, path, query, hash)
      .map(([protocol, domain, path, query, hash]) => {
        return `${protocol}://${domain}${path}${query}${hash}` as HttpUrl
      })
  }
}

/**
 * Handles shrinking for regex-based strings by trying to maintain the pattern while reducing length
 */
export function shrinkRegexString(s: string, pattern: RegExp | string): string[] {
  const regex = pattern instanceof RegExp ? pattern : new RegExp(`^${pattern}$`)

  // Basic shrinking strategies:

  // 1. Remove characters if possible while still matching
  const shrinkOptions: string[] = []

  // Try removing characters one by one from different positions
  for (let i = 0; i < s.length; i++) {
    const shortened = s.slice(0, i) + s.slice(i + 1)
    if (regex.test(shortened)) {
      shrinkOptions.push(shortened)
    }
  }

  // 2. Replace sequences of repeated characters with fewer repetitions
  // Find repeating character sequences
  const repeats = s.match(/(.)\1+/g)
  if (repeats !== null) {
    for (const repeat of repeats) {
      const char = repeat[0]
      const count = repeat.length

      // Try reducing the repetition while maintaining validity
      for (let newCount = 1; newCount < count; newCount++) {
        const shortened = s.replace(repeat, char.repeat(newCount))
        if (regex.test(shortened)) {
          shrinkOptions.push(shortened)
        }
      }
    }
  }

  // 3. Simplify character choices
  // Replace characters with simpler ones if they still match the pattern
  const simplifyMappings: Record<string, string[]> = {
    // Replace digits with smaller ones
    '9': ['0', '1'],
    '8': ['0', '1'],
    '7': ['0', '1'],
    '6': ['0', '1'],
    '5': ['0', '1'],
    '4': ['0', '1'],
    '3': ['0', '1'],
    '2': ['0', '1'],
    '1': ['0'],

    // Replace uppercase with lowercase if applicable
    'Z': ['a'],
    'Y': ['a'],
    // ... other character simplifications
  }

  for (let i = 0; i < s.length; i++) {
    const char = s[i]
    const simplifications = simplifyMappings[char]

    if (simplifications !== undefined) {
      for (const simpler of simplifications) {
        const simplified = s.slice(0, i) + simpler + s.slice(i + 1)
        if (regex.test(simplified)) {
          shrinkOptions.push(simplified)
        }
      }
    }
  }

  return shrinkOptions.filter((value, index, self) =>
    self.indexOf(value) === index && value !== s && regex.test(value)
  )
}
