# Regular Expression Arbitrary Design in FluentCheck

## Abstract

This document presents the design and implementation of regular expression-based string generation in FluentCheck, a property-based testing framework for TypeScript. We introduce a compositional approach that maps regex patterns to hierarchical arbitrary structures, enabling efficient generation and shrinking of strings that match specified patterns. The implementation provides support for common regex constructs while addressing the unique challenges of string generation within property-based testing.

## 1. Introduction

Regular expressions are a powerful tool for pattern matching and validation in software development. In property-based testing, generating strings that match specific regex patterns is essential for testing parsers, validators, and other text processing functions. The challenges of regex-based string generation include:

1. Interpreting the regex syntax to create matching strings
2. Generating diverse samples to adequately cover the pattern space
3. Providing efficient shrinking capabilities while maintaining pattern compliance
4. Handling potentially infinite pattern spaces (e.g., with `*` or `+` quantifiers)

Our approach addresses these challenges through a systematic mapping of regex constructs to composable arbitraries.

## 2. Architectural Design

The implementation follows a layered architecture:

1. **Parser Layer**: Transforms regex patterns into intermediate representations
2. **Mapping Layer**: Maps pattern components to appropriate arbitrary generators
3. **Generation Layer**: Produces string values matching the pattern
4. **Shrinking Layer**: Reduces counterexamples while maintaining pattern compliance
5. **Pattern Library**: Provides pre-defined arbitraries for common string formats

This layered design allows for modularity and extensibility while providing a clean separation of concerns.

## 3. Algorithmic Approach

### 3.1 Pattern Parsing and Representation

The core of our implementation is the `parseRegexPattern` function, which transforms a regex pattern into a sequence of `RegexCharClass` objects. Each `RegexCharClass` represents a component of the pattern with:

```typescript
type RegexCharClass = {
  /** Minimum number of occurrences */
  min: number;
  /** Maximum number of occurrences (Infinity for +, *) */
  max: number;
  /** Generator for this character class */
  generator: Arbitrary<string>;
}
```

This representation allows us to track both the character class itself and its quantifiers. The parsing algorithm traverses the pattern string, identifying:

- Character classes (`\d`, `\w`, `[a-z]`, etc.)
- Escaped literals (`\n`, `\.`, etc.)
- Quantifiers (`*`, `+`, `?`, `{n}`, `{n,m}`)
- Alternatives (`|`)
- Groups (`(...)`)

For example, the pattern `/\d{3}-\w+/` would be parsed into two `RegexCharClass` objects:
1. `{min: 3, max: 3, generator: digitGenerator}`
2. `{min: 1, max: 10, generator: wordCharGenerator}` (with `-` as a literal in between)

### 3.2 Character Class Mapping

Character classes are mapped to arbitraries using a dictionary-based approach:

```typescript
const charClassMap: Record<string, Arbitrary<string>> = {
  '\\d': integer(0, 9).map(String),
  '\\w': union(
    char('a', 'z'),
    char('A', 'Z'),
    integer(0, 9).map(String),
    constant('_')
  ),
  // ...other mappings
}
```

This mapping provides the building blocks for constructing string generators. For custom character classes like `[a-f0-9]`, we parse the range expressions and compose appropriate arbitraries.

### 3.3 Quantifier Handling

Quantifiers are parsed using a recursive descent approach to handle nested structures. The `parseQuantifier` function extracts:

- Fixed counts: `{n}`
- Ranges: `{n,m}`
- Special quantifiers: `*` (0 or more), `+` (1 or more), `?` (0 or 1)

For unbounded quantifiers (`*` and `+`), we set reasonable limits based on the minimum requirement to avoid generating excessively long strings:

```typescript
const actualMax = cc.max === Number.POSITIVE_INFINITY ? 
  Math.min(10, Math.max(5, cc.min * 2)) : // Reasonable upper bound
  cc.max
```

### 3.4 String Generation via Composition

The key insight in our approach is the compositional nature of regex patterns. We leverage this by mapping each component to its corresponding arbitrary and then composing these arbitraries to generate the full string.

For generation, we use:

1. The `array` arbitrary to repeat character classes according to their quantifiers
2. The `tuple` arbitrary to sequence pattern components
3. The `map` function to transform component arrays into strings
4. The `filter` function to ensure generated strings match the original pattern

```typescript
function generateStringFromCharClasses(charClasses: RegexCharClass[]): Arbitrary<string> {
  // Generate arbitraries for each character class
  const arbitraries = charClasses.map(cc => {
    return array(cc.generator, cc.min, cc.actualMax).map(chars => chars.join(''))
  })
  
  // Combine all parts into a single string
  return tuple(...arbitraries).map(parts => parts.join(''))
}
```

### 3.5 Alternative Handling

Alternative patterns (using `|`) represent a distinct challenge. We handle them through:

1. Special case detection for simple patterns like `(a|b)`
2. Transformation into equivalent structural representations
3. Creation of union arbitraries that select among alternatives

For simple alternative patterns like `/(cat|dog)/`, we detect this structure and use a more efficient representation:

```typescript
if (/^\([^()]+\|[^()]+\)$/.test(patternStr)) {
  // Simple (a|b) pattern
  const options = patternStr.slice(1, -1).split('|')
  return [{
    min: 1,
    max: 1,
    generator: oneof(options)
  }]
}
```

## 4. Shrinking Strategy

Shrinking is a critical aspect of property-based testing, allowing for the reduction of counterexamples to their simplest form. Our regex shrinking strategy employs multiple techniques while ensuring the shrunk strings still match the original pattern:

### 4.1 Character Removal

We attempt to remove characters from the string while maintaining pattern compliance:

```typescript
for (let i = 0; i < s.length; i++) {
  const shortened = s.slice(0, i) + s.slice(i + 1)
  if (regex.test(shortened)) {
    shrinkOptions.push(shortened)
  }
}
```

### 4.2 Repetition Reduction

For repeated character sequences, we try to reduce the repetition count:

```typescript
const repeats = s.match(/(.)\1+/g)
if (repeats) {
  for (const repeat of repeats) {
    const char = repeat[0]
    const count = repeat.length
    
    for (let newCount = 1; newCount < count; newCount++) {
      const shortened = s.replace(repeat, char.repeat(newCount))
      if (regex.test(shortened)) {
        shrinkOptions.push(shortened)
      }
    }
  }
}
```

### 4.3 Character Simplification

We attempt to replace complex characters with simpler ones:

```typescript
const simplifyMappings: Record<string, string[]> = {
  '9': ['0', '1'],
  '8': ['0', '1'],
  // ...more mappings
}
```

These strategies work together to provide a comprehensive shrinking approach that maintains pattern compliance while simplifying counterexamples.

## 5. Pattern Library

Beyond the generic regex support, we provide a library of pre-defined pattern generators for common string formats:

### 5.1 Email Addresses

The email address generator composes multiple arbitraries to create valid email addresses:

```typescript
email: (): Arbitrary<string> => {
  const localPartChars = union(/* character set for local part */)
  const domainChars = union(/* character set for domain */)
  
  const localPart = array(localPartChars, 1, 64)
    .map(chars => chars.join(''))
    .filter(/* validation rules */)
  
  const domainPart = array(
    array(domainChars, 1, 63)
      .map(chars => chars.join(''))
      .filter(/* validation rules */),
    1, 5
  ).map(parts => parts.join('.'))
  
  return tuple(localPart, domainPart)
    .map(([local, domain]) => `${local}@${domain}`)
    .filter(/* final validation */)
}
```

### 5.2 UUID Generation

The UUID generator leverages tuple composition to ensure the proper structure and version formatting:

```typescript
uuid: (): Arbitrary<string> => {
  const hexDigit = oneof('0123456789abcdef'.split(''))
  
  return tuple(
    array(hexDigit, 8, 8),
    array(hexDigit, 4, 4),
    tuple(constant('4'), array(hexDigit, 3, 3)), // Version 4
    tuple(oneof(['8', '9', 'a', 'b']), array(hexDigit, 3, 3)),
    array(hexDigit, 12, 12)
  ).map(([a, b, c, d, e]) => 
    `${a.join('')}-${b.join('')}-${c[0]}${c[1].join('')}-${d[0]}${d[1].join('')}-${e.join('')}`
  )
}
```

## 6. Theoretical Foundations

Our approach draws from several theoretical foundations:

1. **Regular Language Theory**: Regular expressions define regular languages, which can be generated by finite state machines.

2. **Compositional Semantics**: The meaning of a complex pattern is a function of the meaning of its parts, allowing for a compositional approach to generation.

3. **Probabilistic Generation**: While ensuring pattern compliance, we employ probabilistic selection to generate diverse samples.

4. **Shrinking as Optimization**: The shrinking process can be viewed as an optimization problem where we seek to minimize complexity while maintaining pattern validity.

## 7. Limitations and Future Work

The current implementation has several limitations:

1. **Complex Pattern Support**: Advanced regex features like lookahead/lookbehind assertions are not fully supported.

2. **Performance Optimization**: Generation of strings matching complex patterns can be computationally expensive.

3. **Distribution Control**: The distribution of generated strings could be improved to better cover the pattern space.

## 8. Conclusion

The regex-based string generation in FluentCheck demonstrates how compositional techniques can be applied to generate complex strings matching specific patterns. By mapping regex constructs to arbitraries and composing them systematically, we provide a flexible and extensible framework for testing string processing code.

## References

1. Claessen, K., & Hughes, J. (2000). QuickCheck: A lightweight tool for random testing of Haskell programs. ACM SIGPLAN Notices, 35(9), 268-279.

2. Dubois, O. (2020). Fast-check: Property based testing for JavaScript. GitHub repository. https://github.com/dubzzz/fast-check

3. Thompson, K. (1968). Programming Techniques: Regular expression search algorithm. Communications of the ACM, 11(6), 419-422.

4. Hopcroft, J. E., & Ullman, J. D. (1979). Introduction to automata theory, languages, and computation. Addison-Wesley. 