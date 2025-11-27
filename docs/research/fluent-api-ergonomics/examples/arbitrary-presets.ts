/**
 * Proof-of-concept: Common arbitrary presets
 * 
 * This demonstrates shorthand factories for frequently-used
 * arbitrary configurations.
 */

import * as fc from '../../../src/index.js';
import type { Arbitrary } from '../../../src/arbitraries/index.js';

// ============================================================================
// Integer Presets
// ============================================================================

/** Positive integers (1 to MAX_SAFE_INTEGER) */
const positiveInt = (): Arbitrary<number> => 
  fc.integer(1, Number.MAX_SAFE_INTEGER);

/** Negative integers (MIN_SAFE_INTEGER to -1) */
const negativeInt = (): Arbitrary<number> => 
  fc.integer(Number.MIN_SAFE_INTEGER, -1);

/** Non-zero integers */
const nonZeroInt = (): Arbitrary<number> => 
  fc.union(negativeInt(), positiveInt());

/** Byte values (0-255) */
const byte = (): Arbitrary<number> => 
  fc.integer(0, 255);

/** Small positive integers (1-100), useful for sizes */
const smallPositive = (): Arbitrary<number> => 
  fc.integer(1, 100);

/** Percentage values (0-100) */
const percentage = (): Arbitrary<number> => 
  fc.real(0, 100);

// ============================================================================
// String Presets
// ============================================================================

/** Non-empty strings */
const nonEmptyString = (maxLength = 100): Arbitrary<string> => 
  fc.string(1, maxLength);

/** Word characters only (alphanumeric + underscore) */
const word = (minLength = 1, maxLength = 20): Arbitrary<string> => 
  fc.string(minLength, maxLength, fc.union(
    fc.char('a', 'z'),
    fc.char('A', 'Z'),
    fc.char('0', '9'),
    fc.constant('_')
  ));

/** Valid identifier (starts with letter, then word chars) */
const identifier = (maxLength = 20): Arbitrary<string> => {
  if (maxLength < 1) return fc.constant('');
  
  const firstChar = fc.union(fc.char('a', 'z'), fc.char('A', 'Z'));
  
  if (maxLength === 1) {
    return firstChar;
  }
  
  const restChars = fc.string(0, maxLength - 1, fc.union(
    fc.char('a', 'z'),
    fc.char('A', 'Z'),
    fc.char('0', '9'),
    fc.constant('_')
  ));
  
  return fc.tuple(firstChar, restChars).map(([first, rest]) => first + rest);
};

/** Whitespace-only strings */
const whitespace = (maxLength = 10): Arbitrary<string> => 
  fc.string(1, maxLength, fc.oneof([' ', '\t', '\n', '\r'] as const));

/** Hex strings (for colors, hashes, etc.) */
const hexString = (length: number): Arbitrary<string> => 
  fc.string(length, length, fc.hex());

// ============================================================================
// Collection Presets
// ============================================================================

/** Non-empty arrays */
const nonEmptyArray = <A>(arb: Arbitrary<A>, maxLength = 10): Arbitrary<A[]> => 
  fc.array(arb, 1, maxLength);

/** Pairs (2-tuples of same type) */
const pair = <A>(arb: Arbitrary<A>): Arbitrary<[A, A]> => 
  fc.tuple(arb, arb);

/** Triple (3-tuples of same type) */
const triple = <A>(arb: Arbitrary<A>): Arbitrary<[A, A, A]> => 
  fc.tuple(arb, arb, arb);

// ============================================================================
// Nullable/Optional Presets
// ============================================================================

/** Nullable values (T | null) */
const nullable = <A>(arb: Arbitrary<A>): Arbitrary<A | null> => 
  fc.union(arb, fc.constant(null));

/** Optional values (T | undefined) */
const optional = <A>(arb: Arbitrary<A>): Arbitrary<A | undefined> => 
  fc.union(arb, fc.constant(undefined));

/** Maybe values (T | null | undefined) */
const maybe = <A>(arb: Arbitrary<A>): Arbitrary<A | null | undefined> => 
  fc.union(arb, fc.constant(null), fc.constant(undefined));

// ============================================================================
// Export all presets in a namespace
// ============================================================================

const presets = {
  // Integers
  positiveInt,
  negativeInt,
  nonZeroInt,
  byte,
  smallPositive,
  percentage,
  
  // Strings
  nonEmptyString,
  word,
  identifier,
  whitespace,
  hexString,
  
  // Collections
  nonEmptyArray,
  pair,
  triple,
  
  // Nullable
  nullable,
  optional,
  maybe,
};

// ============================================================================
// Usage Examples
// ============================================================================

console.log('\n=== Integer Preset Examples ===');

// Positive integers
const positiveResult = fc.scenario()
  .forall('n', positiveInt())
  .then(({ n }) => n > 0)
  .check();
console.log('positiveInt() always > 0:', positiveResult.satisfiable);

// Byte range
const byteResult = fc.scenario()
  .forall('b', byte())
  .then(({ b }) => b >= 0 && b <= 255)
  .check();
console.log('byte() in range [0, 255]:', byteResult.satisfiable);

// Non-zero
const nonZeroResult = fc.scenario()
  .forall('n', nonZeroInt())
  .then(({ n }) => n !== 0)
  .check();
console.log('nonZeroInt() never 0:', nonZeroResult.satisfiable);

console.log('\n=== String Preset Examples ===');

// Non-empty string
const nonEmptyResult = fc.scenario()
  .forall('s', nonEmptyString(50))
  .then(({ s }) => s.length > 0)
  .check();
console.log('nonEmptyString() length > 0:', nonEmptyResult.satisfiable);

// Identifier format
const identifierResult = fc.scenario()
  .forall('id', identifier(10))
  .then(({ id }) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(id))
  .check();
console.log('identifier() matches pattern:', identifierResult.satisfiable);

// Word characters
const wordResult = fc.scenario()
  .forall('w', word(1, 10))
  .then(({ w }) => /^[a-zA-Z0-9_]+$/.test(w))
  .check();
console.log('word() has word chars only:', wordResult.satisfiable);

console.log('\n=== Collection Preset Examples ===');

// Non-empty array
const nonEmptyArrayResult = fc.scenario()
  .forall('arr', nonEmptyArray(fc.integer()))
  .then(({ arr }) => arr.length > 0)
  .check();
console.log('nonEmptyArray() length > 0:', nonEmptyArrayResult.satisfiable);

// Pair
const pairResult = fc.scenario()
  .forall('p', pair(fc.integer(0, 10)))
  .then(({ p }) => p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number')
  .check();
console.log('pair() has 2 elements:', pairResult.satisfiable);

console.log('\n=== Nullable Preset Examples ===');

// Nullable can be null
const nullableCanBeNull = fc.scenario()
  .exists('x', nullable(fc.integer()))
  .then(({ x }) => x === null)
  .check();
console.log('nullable() can be null:', nullableCanBeNull.satisfiable);

// Optional can be undefined
const optionalCanBeUndefined = fc.scenario()
  .exists('x', optional(fc.integer()))
  .then(({ x }) => x === undefined)
  .check();
console.log('optional() can be undefined:', optionalCanBeUndefined.satisfiable);

console.log('\n=== Practical Example: User Data ===');

// Generating realistic user data with presets
const userDataResult = fc.scenario()
  .forall('user', fc.tuple(
    identifier(15),           // username
    nonEmptyString(50),       // displayName
    byte(),                   // age (0-255 covers all ages)
    nullable(hexString(6))    // avatarColor (optional)
  ).map(([username, displayName, age, avatarColor]) => ({
    username,
    displayName,
    age,
    avatarColor
  })))
  .then(({ user }) => 
    user.username.length > 0 &&
    user.displayName.length > 0 &&
    user.age >= 0 &&
    (user.avatarColor === null || user.avatarColor.length === 6)
  )
  .check();
console.log('User data validation:', userDataResult.satisfiable);

console.log('\n=== All examples completed ===');

// ============================================================================
// Comparison Summary
// ============================================================================

/*
BEFORE (verbose):
  fc.integer(1, Number.MAX_SAFE_INTEGER)
  fc.integer(Number.MIN_SAFE_INTEGER, -1)
  fc.integer(0, 255)
  fc.string(1, maxLength)
  fc.array(arb, 1, maxLength)
  fc.union(arb, fc.constant(null))

AFTER (presets):
  positiveInt()
  negativeInt()
  byte()
  nonEmptyString(maxLength)
  nonEmptyArray(arb, maxLength)
  nullable(arb)

Benefits:
  - More readable and self-documenting
  - Reduces boilerplate for common cases
  - IDE autocomplete shows available presets
  - Consistent naming conventions
*/

export { presets };
