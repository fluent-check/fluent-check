import {type Arbitrary, NoArbitrary} from './internal.js'
import {integer, constant, array, tuple, union, oneof} from './index.js'
import {char} from './string.js'
import type {IPv4Address, HttpUrl} from './types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RegexCharClass represents a character class in a regular expression
 * Used for generating strings matching specific character sets
 */
type RegexCharClass = {
  /** Minimum number of occurrences */
  min: number
  /** Maximum number of occurrences (Infinity for +, *) */
  max: number
  /** Generator for this character class */
  generator: Arbitrary<string>
}

type QuantifierResult = {
  min: number
  max: number
  nextIndex: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MAX_LENGTH = 100
const INFINITE_QUANTIFIER_MAX = 10
const INFINITE_QUANTIFIER_MIN_MULTIPLIER = 2

// Character code constants
const CHAR_CODE_0 = 0x30
const CHAR_CODE_9 = 0x39
const CHAR_CODE_1 = 0x31
const CHAR_CODE_A_UPPER = 0x41
const CHAR_CODE_Z_UPPER = 0x5A
const CHAR_CODE_A_LOWER = 0x61
const CHAR_CODE_Z_LOWER = 0x7A

// ─────────────────────────────────────────────────────────────────────────────
// Character Set Builders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an arbitrary for alphanumeric characters (a-z, A-Z, 0-9)
 */
function alphanumericChars(): Arbitrary<string> {
  return union(
    char('a', 'z'),
    char('A', 'Z'),
    integer(0, 9).map(String)
  )
}

/**
 * Creates an arbitrary for word characters (a-z, A-Z, 0-9, _)
 */
function wordChars(): Arbitrary<string> {
  return union(
    alphanumericChars(),
    constant('_')
  )
}

/**
 * Creates an arbitrary for domain-valid characters (a-z, A-Z, 0-9, -)
 */
function domainChars(): Arbitrary<string> {
  return union(
    alphanumericChars(),
    constant('-')
  )
}

/**
 * Creates an arbitrary for email local part characters
 */
function emailLocalPartChars(): Arbitrary<string> {
  return union(
    wordChars(),
    oneof(['.', '-'])
  )
}

/**
 * Creates a string arbitrary from an array of character arbitraries
 */
function stringFromChars(charArb: Arbitrary<string>, min: number, max: number): Arbitrary<string> {
  return array(charArb, min, max).map(chars => chars.join(''))
}

/**
 * Creates a domain name arbitrary
 */
function domainName(minParts = 1, maxParts = 5): Arbitrary<string> {
  const domainPart = stringFromChars(domainChars(), 1, 63)
    .filter(s => !s.startsWith('-') && !s.endsWith('-'))

  return array(domainPart, minParts, maxParts)
    .map(parts => parts.join('.'))
}

// ─────────────────────────────────────────────────────────────────────────────
// Character Class Map
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps common regex character classes to their corresponding arbitraries
 * Uses lazy evaluation to avoid circular dependencies
 */
function getCharClassMap(): Record<string, Arbitrary<string>> {
  return {
    // Digit classes
    '\\d': integer(0, 9).map(String),
    '[0-9]': integer(0, 9).map(String),

    // Word character classes
    '\\w': wordChars(),
    '[a-zA-Z0-9_]': wordChars(),

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
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern Parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse quantifiers like *, +, ?, {n}, {n,m}
 */
function parseQuantifier(pattern: string, startIndex: number): QuantifierResult {
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
        const part = rangeParts[0] ?? ''
        if (part === '') {
          return {min: 1, max: 1, nextIndex: closeBrace + 1}
        }
        const count = parseInt(part, 10)
        return {min: count, max: count, nextIndex: closeBrace + 1}
      } else if (rangeParts.length === 2) {
        // {n,m}
        const [minPart, maxPart] = rangeParts
        const hasMin = minPart !== undefined && minPart !== ''
        const hasMax = maxPart !== undefined && maxPart !== ''
        const min = hasMin ? parseInt(minPart, 10) : 0
        const max = hasMax ? parseInt(maxPart, 10) : Number.POSITIVE_INFINITY
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
    const currentChar = content[i]
    if (currentChar === undefined) break
    if (i + 2 < content.length && content[i + 1] === '-') {
      // Range like a-z
      const endChar = content[i + 2]
      if (endChar !== undefined) {
        generators.push(char(currentChar, endChar))
      }
      i += 3
    } else {
      // Single character
      generators.push(constant(currentChar))
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
      } catch {
        return true // If regex creation fails, don't filter
      }
    })
  }

  return combinedGenerator
}

/**
 * Creates a RegexCharClass from a generator and quantifier
 */
function createCharClass(
  generator: Arbitrary<string>,
  quantifier: QuantifierResult
): RegexCharClass {
  return {
    min: quantifier.min,
    max: quantifier.max,
    generator
  }
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
    return [createCharClass(oneof(options), {min: 1, max: 1, nextIndex: 0})]
  }

  const charClasses: RegexCharClass[] = []
  let i = 0

  while (i < patternStr.length) {
    const currentChar = patternStr[i]

    // Handle escape sequences
    if (currentChar === '\\' && i + 1 < patternStr.length) {
      const escapeSeq = patternStr.substr(i, 2)
      const charClassMap = getCharClassMap()
      const charClass = charClassMap[escapeSeq]
      if (charClass !== undefined) {
        const quantifier = parseQuantifier(patternStr, i + 2)
        charClasses.push(createCharClass(charClass, quantifier))
        i = quantifier.nextIndex
      } else {
        // Literal escaped character
        const escapedChar = patternStr[i + 1]
        if (escapedChar !== undefined) {
          charClasses.push(createCharClass(
            constant(escapedChar),
            {min: 1, max: 1, nextIndex: 0}
          ))
        }
        i += 2
      }
    } else if (currentChar === '[') {
      // Character class like [a-z]
      const endBracket = patternStr.indexOf(']', i)
      if (endBracket === -1) {
        const msg = `Invalid regex pattern: missing closing bracket at position ${i}`
        throw new Error(msg, {
          cause: `Pattern parsing error at position ${i} in pattern: ${patternStr}`
        })
      }

      const charClass = patternStr.substring(i, endBracket + 1)
      const charClassMap = getCharClassMap()
      const generator = charClassMap[charClass] ?? parseCustomCharClass(charClass)
      const quantifier = parseQuantifier(patternStr, endBracket + 1)
      charClasses.push(createCharClass(generator, quantifier))
      i = quantifier.nextIndex
    } else if (currentChar === '.') {
      // Any character
      const quantifier = parseQuantifier(patternStr, i + 1)
      const charClassMap = getCharClassMap()
      const dotArbitrary = charClassMap['.']
      if (dotArbitrary !== undefined) {
        charClasses.push(createCharClass(dotArbitrary, quantifier))
      }
      i = quantifier.nextIndex
    } else if (currentChar === '|') {
      // For simple implementation, we'll treat | as an OR and make it a special case
      i++
    } else if (currentChar === '(' || currentChar === ')') {
      // Skip parentheses - handled separately for simple cases
      i++
    } else {
      // Literal character
      if (currentChar !== undefined) {
        charClasses.push(createCharClass(
          constant(currentChar),
          {min: 1, max: 1, nextIndex: 0}
        ))
      }
      i++
    }
  }

  return charClasses
}

// ─────────────────────────────────────────────────────────────────────────────
// String Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate actual max for infinite quantifiers
 */
function calculateActualMax(min: number, max: number): number {
  if (max === Number.POSITIVE_INFINITY) {
    return Math.min(INFINITE_QUANTIFIER_MAX, Math.max(5, min * INFINITE_QUANTIFIER_MIN_MULTIPLIER))
  }
  return max
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
    const actualMax = calculateActualMax(cc.min, cc.max)
    return stringFromChars(cc.generator, cc.min, actualMax)
  })

  // Combine all parts into a single string
  return tuple(...arbitraries).map(parts => parts.join(''))
}

/**
 * Creates a regex pattern matcher filter
 */
function createPatternMatcher(pattern: string | RegExp): (s: string) => boolean {
  return (s: string) => {
    try {
      const re = pattern instanceof RegExp ? pattern : new RegExp(`^${pattern}$`)
      return re.test(s)
    } catch {
      return false
    }
  }
}

/**
 * Creates an arbitrary that generates strings matching the given regex pattern
 *
 * @param pattern A string or RegExp representing the pattern to match
 * @param maxLength Optional maximum length for generated strings
 * @returns An arbitrary that generates strings matching the pattern
 */
export function regex(pattern: string | RegExp, maxLength: number = DEFAULT_MAX_LENGTH): Arbitrary<string> {
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
    const patternMatcher = createPatternMatcher(pattern)
    return arbitrary
      .filter(s => s.length <= maxLength)
      .filter(patternMatcher)
  } catch (e) {
    console.error('Error creating regex arbitrary:', e)
    return NoArbitrary
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern Presets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an arbitrary that generates strings matching common patterns
 */
export const patterns = {
  /**
   * Generates valid email addresses
   */
  email: (): Arbitrary<string> => {
    const localPart = stringFromChars(emailLocalPartChars(), 1, 64)
      .filter(s => !s.startsWith('.') && !s.endsWith('.') && !s.includes('..'))

    const domain = domainName(1, 5)

    return tuple(localPart, domain)
      .map(([local, domain]) => `${local}@${domain}`)
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
      // Type assertion needed for template literal type matching
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}` as IPv4Address)
  },

  /**
   * Generates strings matching URLs
   */
  url: (): Arbitrary<HttpUrl> => {
    const protocol = oneof(['http', 'https'] as const)
    const domain = domainName(1, 5)

    const pathChars = union(
      alphanumericChars(),
      oneof(['_', '-', '.', '~', ':', '@', '!', '$', '&', "'", '(', ')', '*', '+', ',', ';', '='])
    )

    const pathSegment = stringFromChars(pathChars, 0, 10)
    const path = array(pathSegment, 0, 5)
      .map(segments => segments.length > 0 ? `/${segments.join('/')}` : '')

    const queryParam = tuple(
      stringFromChars(alphanumericChars(), 1, 10),
      stringFromChars(alphanumericChars(), 0, 10)
    ).map(([key, value]) => value !== '' ? `${key}=${value}` : key)

    const query = array(queryParam, 0, 3)
      .map(params => params.length > 0 ? `?${params.join('&')}` : '')

    const hashChars = stringFromChars(alphanumericChars(), 0, 10)
    const hash = hashChars.map(chars => chars.length > 0 ? `#${chars}` : '')

    return tuple(protocol, domain, path, query, hash)
      .map(([protocol, domain, path, query, hash]) => {
        return `${protocol}://${domain}${path}${query}${hash}` as HttpUrl
      })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shrinking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets simpler character alternatives for shrinking
 */
function getSimplerChars(char: string): string[] {
  const code = char.charCodeAt(0)
  const simplifications: string[] = []

  // Digits: shrink toward 0, then 1
  if (code >= CHAR_CODE_0 && code <= CHAR_CODE_9) {
    if (code > CHAR_CODE_0) simplifications.push('0')
    if (code > CHAR_CODE_1) simplifications.push('1')
    return simplifications
  }

  // Uppercase letters: shrink toward 'a' (lowercase)
  if (code >= CHAR_CODE_A_UPPER && code <= CHAR_CODE_Z_UPPER) {
    simplifications.push('a')
    return simplifications
  }

  // Lowercase letters: shrink toward 'a'
  if (code >= CHAR_CODE_A_LOWER && code <= CHAR_CODE_Z_LOWER) {
    if (code > CHAR_CODE_A_LOWER) simplifications.push('a')
    return simplifications
  }

  return simplifications
}

/**
 * Creates a regex pattern matcher for shrinking
 */
function createShrinkMatcher(pattern: RegExp | string): (s: string) => boolean {
  const regex = pattern instanceof RegExp ? pattern : new RegExp(`^${pattern}$`)
  return (s: string) => regex.test(s)
}

/**
 * Shrinks by removing characters at different positions
 */
function shrinkByRemoval(s: string, matcher: (s: string) => boolean): string[] {
  const shrinkOptions: string[] = []
  for (let i = 0; i < s.length; i++) {
    const shortened = s.slice(0, i) + s.slice(i + 1)
    if (matcher(shortened)) {
      shrinkOptions.push(shortened)
    }
  }
  return shrinkOptions
}

/**
 * Shrinks by reducing repeated character sequences
 */
function shrinkByRepetition(s: string, matcher: (s: string) => boolean): string[] {
  const shrinkOptions: string[] = []
  const repeats = s.match(/(.)\1+/g)

  if (repeats !== null) {
    for (const repeat of repeats) {
      const char = repeat[0]
      if (char === undefined) continue
      const count = repeat.length

      // Try reducing the repetition while maintaining validity
      for (let newCount = 1; newCount < count; newCount++) {
        const shortened = s.replace(repeat, char.repeat(newCount))
        if (matcher(shortened)) {
          shrinkOptions.push(shortened)
        }
      }
    }
  }

  return shrinkOptions
}

/**
 * Shrinks by simplifying character choices
 */
function shrinkBySimplification(s: string, matcher: (s: string) => boolean): string[] {
  const shrinkOptions: string[] = []

  for (let i = 0; i < s.length; i++) {
    const char = s[i]
    if (char === undefined) continue
    const simplifications = getSimplerChars(char)

    for (const simpler of simplifications) {
      const simplified = s.slice(0, i) + simpler + s.slice(i + 1)
      if (matcher(simplified)) {
        shrinkOptions.push(simplified)
      }
    }
  }

  return shrinkOptions
}

/**
 * Handles shrinking for regex-based strings by trying to maintain the pattern while reducing length
 */
export function shrinkRegexString(s: string, pattern: RegExp | string): string[] {
  const matcher = createShrinkMatcher(pattern)

  // Collect all shrinking strategies
  const shrinkOptions = [
    ...shrinkByRemoval(s, matcher),
    ...shrinkByRepetition(s, matcher),
    ...shrinkBySimplification(s, matcher)
  ]

  // Deduplicate and filter
  return shrinkOptions.filter((value, index, self) =>
    self.indexOf(value) === index && value !== s && matcher(value)
  )
}
