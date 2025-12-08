/**
 * Property test templates for common mathematical properties.
 *
 * These templates provide pre-built property tests for common patterns
 * like roundtrip encoding, idempotency, commutativity, and associativity.
 *
 * @example
 * ```typescript
 * import * as fc from 'fluent-check';
 *
 * // Test JSON roundtrip
 * fc.templates.roundtrip(
 *   fc.array(fc.integer()),
 *   JSON.stringify,
 *   JSON.parse
 * ).check().assertSatisfiable();
 *
 * // Test addition is commutative
 * fc.templates.commutative(
 *   fc.integer(-100, 100),
 *   (a, b) => a + b
 * ).check().assertSatisfiable();
 * ```
 *
 * @module templates
 */

import {type Arbitrary} from './arbitraries/index.js'
import {FluentCheck, type FluentResult} from './FluentCheck.js'
import {type FluentStrategyFactory} from './strategies/FluentStrategyFactory.js'
import {roundtrips, isIdempotent, commutes, associates, hasIdentity} from './props.js'

/**
 * A checkable property template that can be executed and configured.
 */
export interface CheckableTemplate {
  /**
   * Execute the property test and return the result.
   *
   * @returns A `FluentResult` containing the test outcome
   */
  check(): FluentResult<Record<string, unknown>>

  /**
   * Execute the property test and throw if it fails.
   *
   * @param message - Optional custom error message prefix
   * @throws Error if the property fails
   */
  assert(message?: string): void

  /**
   * Configure the template with a custom strategy.
   *
   * @param strategyFactory - A strategy factory to configure test execution
   * @returns A new template with the configured strategy
   */
  config(strategyFactory: FluentStrategyFactory): CheckableTemplate
}

/**
 * Internal implementation of CheckableTemplate.
 *
 * @typeParam Rec - The record type used by the underlying FluentCheck scenario.
 */
class CheckableTemplateImpl<Rec extends Record<string, unknown>> implements CheckableTemplate {
  constructor(
    private readonly buildScenario: (
      strategy?: FluentStrategyFactory
    ) => FluentCheck<Rec, any>,
    private readonly strategyFactory?: FluentStrategyFactory
  ) {}

  check(): FluentResult<Record<string, unknown>> {
    return this.buildScenario(this.strategyFactory).check() as FluentResult<Record<string, unknown>>
  }

  assert(message?: string): void {
    const result = this.check()
    if (!result.satisfiable) {
      const prefix = message !== undefined && message !== '' ? `${message}: ` : ''
      const exampleStr = JSON.stringify(result.example)
      const seedStr = result.seed !== undefined ? ` (seed: ${result.seed})` : ''
      throw new Error(`${prefix}Property failed with counterexample: ${exampleStr}${seedStr}`)
    }
  }

  config(strategyFactory: FluentStrategyFactory): CheckableTemplate {
    return new CheckableTemplateImpl<Rec>(this.buildScenario, strategyFactory)
  }
}

/**
 * Test that decode(encode(x)) === x for all generated values.
 *
 * This template verifies that an encode/decode pair forms a roundtrip,
 * meaning the original value can be recovered after encoding and decoding.
 *
 * @param arb - Arbitrary to generate test values
 * @param encode - Function to encode values
 * @param decode - Function to decode values back
 * @param equals - Optional equality function. Defaults to JSON comparison.
 * @returns A checkable template
 *
 * @example
 * ```typescript
 * // JSON roundtrip
 * fc.templates.roundtrip(
 *   fc.array(fc.integer()),
 *   JSON.stringify,
 *   JSON.parse
 * ).check().assertSatisfiable();
 *
 * // Base64 roundtrip
 * fc.templates.roundtrip(
 *   fc.string(),
 *   s => Buffer.from(s).toString('base64'),
 *   s => Buffer.from(s, 'base64').toString()
 * ).assert();
 * ```
 */
export function roundtrip<A, B>(
  arb: Arbitrary<A>,
  encode: (a: A) => B,
  decode: (b: B) => A,
  equals?: (a: A, b: A) => boolean
): CheckableTemplate {
  return new CheckableTemplateImpl<{ x: A }>((strategy) => {
    let scenario = new FluentCheck()
    if (strategy !== undefined) {
      scenario = scenario.config(strategy)
    }
    return scenario
      .forall('x', arb)
      .then(({x}) => roundtrips(x, encode, decode, equals))
  })
}

/**
 * Test that f(f(x)) === f(x) for all generated values.
 *
 * This template verifies idempotency: applying a function twice
 * produces the same result as applying it once.
 *
 * @param arb - Arbitrary to generate test values
 * @param fn - Function to test for idempotency
 * @param equals - Optional equality function. Defaults to JSON comparison.
 * @returns A checkable template
 *
 * @example
 * ```typescript
 * // Math.abs is idempotent
 * fc.templates.idempotent(fc.integer(), Math.abs).assert();
 *
 * // Array deduplication is idempotent
 * fc.templates.idempotent(
 *   fc.array(fc.integer()),
 *   arr => [...new Set(arr)]
 * ).assert();
 *
 * // String.toLowerCase is idempotent
 * fc.templates.idempotent(fc.string(), s => s.toLowerCase()).assert();
 * ```
 */
export function idempotent<T>(
  arb: Arbitrary<T>,
  fn: (x: T) => T,
  equals?: (a: T, b: T) => boolean
): CheckableTemplate {
  return new CheckableTemplateImpl<{ x: T }>((strategy) => {
    let scenario = new FluentCheck()
    if (strategy !== undefined) {
      scenario = scenario.config(strategy)
    }
    return scenario
      .forall('x', arb)
      .then(({x}) => isIdempotent(x, fn, equals))
  })
}

/**
 * Test that f(a, b) === f(b, a) for all generated value pairs.
 *
 * This template verifies commutativity: the order of arguments
 * doesn't affect the result.
 *
 * @param arb - Arbitrary to generate test values (same type for both arguments)
 * @param fn - Binary function to test for commutativity
 * @param equals - Optional equality function. Defaults to JSON comparison.
 * @returns A checkable template
 *
 * @example
 * ```typescript
 * // Addition is commutative
 * fc.templates.commutative(fc.integer(), (a, b) => a + b).assert();
 *
 * // Multiplication is commutative
 * fc.templates.commutative(fc.real(), (a, b) => a * b).assert();
 *
 * // Math.max is commutative
 * fc.templates.commutative(fc.integer(), Math.max).assert();
 * ```
 */
export function commutative<T, R>(
  arb: Arbitrary<T>,
  fn: (a: T, b: T) => R,
  equals?: (a: R, b: R) => boolean
): CheckableTemplate {
  return new CheckableTemplateImpl<{ a: T, b: T }>((strategy) => {
    let scenario = new FluentCheck()
    if (strategy !== undefined) {
      scenario = scenario.config(strategy)
    }
    return scenario
      .forall('a', arb)
      .forall('b', arb)
      .then(({a, b}) => commutes(a, b, fn, equals))
  })
}

/**
 * Test that f(a, f(b, c)) === f(f(a, b), c) for all generated value triples.
 *
 * This template verifies associativity: grouping of operations
 * doesn't affect the result.
 *
 * @param arb - Arbitrary to generate test values
 * @param fn - Binary function to test for associativity
 * @param equals - Optional equality function. Defaults to JSON comparison.
 * @returns A checkable template
 *
 * @example
 * ```typescript
 * // Addition is associative
 * fc.templates.associative(fc.integer(-100, 100), (a, b) => a + b).assert();
 *
 * // String concatenation is associative
 * fc.templates.associative(fc.string(), (a, b) => a + b).assert();
 *
 * // Array concatenation is associative
 * fc.templates.associative(
 *   fc.array(fc.integer()),
 *   (a, b) => [...a, ...b]
 * ).assert();
 * ```
 */
export function associative<T>(
  arb: Arbitrary<T>,
  fn: (a: T, b: T) => T,
  equals?: (a: T, b: T) => boolean
): CheckableTemplate {
  return new CheckableTemplateImpl<{ a: T, b: T, c: T }>((strategy) => {
    let scenario = new FluentCheck()
    if (strategy !== undefined) {
      scenario = scenario.config(strategy)
    }
    return scenario
      .forall('a', arb)
      .forall('b', arb)
      .forall('c', arb)
      .then(({a, b, c}) => associates(a, b, c, fn, equals))
  })
}

/**
 * Test that f(a, identity) === a and f(identity, a) === a for all generated values.
 *
 * This template verifies that a value acts as an identity element
 * for a binary operation.
 *
 * @param arb - Arbitrary to generate test values
 * @param fn - Binary function to test
 * @param identityValue - The identity element
 * @param equals - Optional equality function. Defaults to JSON comparison.
 * @returns A checkable template
 *
 * @example
 * ```typescript
 * // 0 is identity for addition
 * fc.templates.identity(fc.integer(), (a, b) => a + b, 0).assert();
 *
 * // 1 is identity for multiplication
 * fc.templates.identity(fc.real(), (a, b) => a * b, 1).assert();
 *
 * // Empty string is identity for concatenation
 * fc.templates.identity(fc.string(), (a, b) => a + b, '').assert();
 *
 * // Empty array is identity for array concatenation
 * fc.templates.identity(
 *   fc.array(fc.integer()),
 *   (a, b) => [...a, ...b],
 *   []
 * ).assert();
 * ```
 */
export function identity<T>(
  arb: Arbitrary<T>,
  fn: (a: T, b: T) => T,
  identityValue: T,
  equals?: (a: T, b: T) => boolean
): CheckableTemplate {
  return new CheckableTemplateImpl<{ a: T }>((strategy) => {
    let scenario = new FluentCheck()
    if (strategy !== undefined) {
      scenario = scenario.config(strategy)
    }
    return scenario
      .forall('a', arb)
      .then(({a}) => hasIdentity(a, fn, identityValue, equals))
  })
}

/**
 * Namespace containing all property test templates.
 */
export const templates = {
  roundtrip,
  idempotent,
  commutative,
  associative,
  identity
}
