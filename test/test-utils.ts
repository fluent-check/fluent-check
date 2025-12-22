import * as fc from '../src/index.js'
import {expect} from 'chai'
import type {
  ArbitraryStatistics,
  FluentStatistics,
  Logger,
  LogEntry
} from '../src/index.js'
import type {Arbitrary} from '../src/arbitraries/index.js'
import type {ArbitrarySize, FluentPick} from '../src/arbitraries/types.js'
import type {FluentResult} from '../src/FluentCheck.js'

/**
 * Test utilities for fluent-check test suite.
 * This is the single source of truth for test helpers.
 *
 * Organization:
 * 1. Scenario Builders - Create configured scenarios
 * 2. Assertion Helpers - Validate results and statistics
 * 3. Arbitrary Factories - Create commonly-used arbitraries
 * 4. Test Infrastructure - Loggers, console capture, etc.
 * 5. Property Patterns - Reusable mathematical property tests
 */

// ============================================================================
// Scenario Builders
// ============================================================================

/**
 * Creates a scenario with a specified sample size.
 * @param sampleSize - Number of test cases to run (default: 100)
 * @returns A configured scenario builder
 */
export function scenarioWithSampleSize(sampleSize = 100) {
  return fc.scenario().config(fc.strategy().withSampleSize(sampleSize))
}

/**
 * Creates a scenario with detailed statistics enabled.
 * @param sampleSize - Number of test cases to run (default: 100)
 * @returns A configured scenario builder with detailed statistics
 */
export function detailedScenario(sampleSize = 100) {
  return fc.scenario().config(fc.strategy().withDetailedStatistics().withSampleSize(sampleSize))
}

/**
 * Creates a basic scenario without detailed statistics.
 * @param sampleSize - Number of test cases to run (default: 100)
 * @returns A configured scenario builder
 */
export function basicScenario(sampleSize = 100) {
  return scenarioWithSampleSize(sampleSize)
}

export const fastScenario = () => fc.scenario().config(fc.strategies.fast)

export const minimalScenario = () => fc.scenario().config(fc.strategies.minimal)

/**
 * Creates a scenario for testing properties with a single arbitrary.
 * @param arbitrary - The arbitrary to use
 * @param predicate - The predicate to test
 * @param sampleSize - Number of test cases (default: 100)
 * @returns A configured scenario builder
 */
export function satisfiableScenario<T>(
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => boolean,
  sampleSize = 100
) {
  return scenarioWithSampleSize(sampleSize)
    .forall('x', arbitrary)
    .then(({x}) => predicate(x))
}

/**
 * Creates a scenario for testing coverage requirements.
 * @param sampleSize - Number of test cases
 * @param covers - Coverage requirements as tuples of [percentage, predicate, label]
 * @returns A configured scenario builder
 */
export function coverageScenario(
  sampleSize: number,
  ...covers: Array<[number, (args: any) => boolean, string]>
) {
  let builder = scenarioWithSampleSize(sampleSize)
  for (const [percentage, predicate, label] of covers) {
    builder = builder.cover(percentage, predicate, label)
  }
  return builder
}

/**
 * Creates a scenario for testing confidence-based termination.
 * @param sampleSize - Number of test cases
 * @param confidence - Target confidence level
 * @returns A configured scenario builder
 */
export function confidenceScenario(sampleSize: number, confidence: number) {
  return fc.scenario()
    .config(fc.strategy()
      .withConfidence(confidence)
      .withSampleSize(sampleSize))
}

/**
 * Creates a scenario that fails on the nth test.
 * Useful for testing counterexample detection and shrinking.
 * @param sampleSize - Maximum number of tests to run
 * @param failOnTest - The test number that should fail (1-indexed)
 * @returns A configured scenario builder
 */
export function failingScenario(sampleSize: number, failOnTest: number) {
  let count = 0
  return scenarioWithSampleSize(sampleSize)
    .forall('x', fc.integer(0, 100))
    .then(() => ++count !== failOnTest)
}

/**
 * Creates a scenario with precondition filtering.
 * Useful for testing discarded test statistics.
 * @param sampleSize - Number of tests to run
 * @param precondition - Predicate that determines which values to test
 * @returns A configured scenario builder
 */
export function preconditionScenario(
  sampleSize: number,
  precondition: (x: number) => boolean
) {
  return scenarioWithSampleSize(sampleSize)
    .forall('x', fc.integer(0, 100))
    .then(({x}) => {
      fc.pre(precondition(x))
      return true
    })
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Asserts that a result is satisfiable.
 * This is a wrapper around result.assertSatisfiable() for consistency.
 * @param result - The FluentResult to check
 * @param message - Optional custom error message
 */
export function assertSatisfiable<Rec extends {} = {}>(
  result: FluentResult<Rec>,
  message?: string
): void {
  result.assertSatisfiable(message)
}

/**
 * Asserts that a result is not satisfiable.
 * This is a wrapper around result.assertNotSatisfiable() for consistency.
 * @param result - The FluentResult to check
 * @param message - Optional custom error message
 */
export function assertNotSatisfiable<Rec extends {} = {}>(
  result: FluentResult<Rec>,
  message?: string
): void {
  result.assertNotSatisfiable(message)
}

/**
 * Asserts that a result's example matches the expected values.
 * This is a wrapper around result.assertExample() for consistency.
 * @param result - The FluentResult to check
 * @param expected - Partial object with expected values
 * @param message - Optional custom error message
 */
export function assertExample<Rec extends {} = {}>(
  result: FluentResult<Rec>,
  expected: Partial<Rec>,
  message?: string
): void {
  result.assertExample(expected, message)
}

/**
 * Asserts that a result is satisfiable and its example matches expected values.
 * Combines assertSatisfiable and assertExample for convenience.
 * @param result - The FluentResult to check
 * @param expected - Partial object with expected values
 * @param message - Optional custom error message
 */
export function assertSatisfiableWithExample<Rec extends {} = {}>(
  result: FluentResult<Rec>,
  expected: Partial<Rec>,
  message?: string
): void {
  assertSatisfiable(result, message)
  assertExample(result, expected, message)
}

/**
 * Asserts that statistics labels exist (only when they might be undefined).
 * Use this instead of trivial type-guaranteed checks.
 * @param result - The FluentResult to check
 */
export function assertStatisticsLabelsExist(result: {statistics: FluentStatistics}): asserts result is {
  statistics: FluentStatistics & {labels: NonNullable<FluentStatistics['labels']>}
} {
  expect(result.statistics.labels).to.exist
}

/**
 * Asserts that coverage results exist in statistics.
 * @param result - The result containing statistics
 */
export function assertCoverageResultsExist(result: {statistics: FluentStatistics}): asserts result is {
  statistics: FluentStatistics & {coverageResults: NonNullable<FluentStatistics['coverageResults']>}
} {
  expect(result.statistics.coverageResults).to.exist
}

/**
 * Asserts that confidence exists in statistics.
 * @param result - The result containing statistics
 */
export function assertConfidenceExists(result: {statistics: FluentStatistics}): asserts result is {
  statistics: FluentStatistics & {confidence: NonNullable<FluentStatistics['confidence']>}
} {
  expect(result.statistics.confidence).to.exist
}

/**
 * Asserts that arbitrary statistics exist for a given name.
 * @param result - The result containing statistics
 * @param name - The name of the arbitrary
 */
export function assertArbitraryStatsExist(
  result: {statistics: FluentStatistics},
  name: string
): void {
  const stats = result.statistics.arbitraryStats?.[name]
  if (stats === undefined) {
    throw new Error(`Expected arbitraryStats['${name}'] to exist`)
  }
}

/**
 * Asserts that a property exists on an object (only for truly optional properties).
 * Do not use for type-guaranteed properties.
 * @param obj - The object to check
 * @param prop - The property name (as string)
 */
export function assertPropertyExists<T extends object>(
  obj: T,
  prop: string
): void {
  expect(obj).to.have.property(prop)
}

/**
 * Asserts that a value is non-negative.
 * Use this instead of trivial `.to.be.at.least(0)` checks for non-negative types.
 * @param value - The value to check
 * @param fieldName - Optional field name for error messages
 */
export function assertNonNegative(value: number, fieldName?: string): void {
  if (value < 0) {
    const msg = fieldName !== undefined ? `${fieldName} must be non-negative` : 'Value must be non-negative'
    throw new Error(`${msg}, got ${value}`)
  }
}

/**
 * Asserts that a value is positive (greater than 0).
 * @param value - The value to check
 * @param fieldName - Optional field name for error messages
 */
export function assertPositive(value: number, fieldName?: string): void {
  if (value <= 0) {
    const msg = fieldName !== undefined ? `${fieldName} must be positive` : 'Value must be positive'
    throw new Error(`${msg}, got ${value}`)
  }
}

/**
 * Asserts that a value is a valid probability (between 0 and 1, inclusive).
 * @param value - The probability to check
 * @param fieldName - Optional field name for error messages
 */
export function assertValidProbability(value: number, fieldName?: string): void {
  expect(value).to.be.within(0, 1, fieldName !== undefined ? `${fieldName} must be between 0 and 1` : undefined)
}

/**
 * Asserts that a value is a valid confidence level (between 0 and 1, inclusive).
 * This is an alias for assertValidProbability with clearer semantics for confidence values.
 * @param value - The confidence to check
 * @param min - Minimum allowed value (default: 0)
 * @param max - Maximum allowed value (default: 1)
 * @param fieldName - Optional field name for error messages
 */
export function assertValidConfidence(value: number, min = 0, max = 1, fieldName?: string): void {
  expect(value).to.be.within(min, max, fieldName !== undefined ? `${fieldName} must be between ${min} and ${max}` : undefined)
}

/**
 * Asserts that an interval [lower, upper] is valid.
 * Checks that both bounds are probabilities and that lower <= upper.
 * @param lower - Lower bound of the interval
 * @param upper - Upper bound of the interval
 * @param fieldName - Optional field name for error messages
 */
export function assertValidInterval(lower: number, upper: number, fieldName?: string): void {
  const prefix = fieldName !== undefined ? `${fieldName}: ` : ''
  assertValidProbability(lower, `${prefix}lower bound`)
  assertValidProbability(upper, `${prefix}upper bound`)
  expect(lower).to.be.at.most(upper, `${prefix}lower bound must be <= upper bound`)
}

// ============================================================================
// Test Infrastructure Helpers
// ============================================================================

/**
 * Creates a test logger that captures log entries.
 * @returns An object with the logger and captured entries
 */
export function createTestLogger(): {logger: Logger; entries: LogEntry[]} {
  const entries: LogEntry[] = []
  const logger: Logger = {
    log: (entry) => {
      entries.push(entry)
    }
  }
  return {logger, entries}
}

/**
 * Gets arbitrary statistics from a result, throwing if missing.
 * @param result - The result containing statistics
 * @param name - The name of the arbitrary to get stats for
 * @returns The arbitrary statistics
 * @throws Error if the statistics are missing
 */
export function getArbitraryStats(
  result: {statistics: FluentStatistics},
  name: string
): ArbitraryStatistics {
  const stats = result.statistics.arbitraryStats?.[name]
  if (stats === undefined) {
    throw new Error(`arbitraryStats['${name}'] missing`)
  }
  return stats
}

/**
 * Gets labels from statistics, throwing if missing.
 * @param result - The result containing statistics
 * @returns The labels record
 * @throws Error if labels are missing
 */
export function getLabels(result: {statistics: FluentStatistics}): NonNullable<FluentStatistics['labels']> {
  const labels = result.statistics.labels
  if (labels === undefined) {
    throw new Error('Expected labels to be defined')
  }
  return labels
}

/**
 * Gets confidence from statistics, throwing if missing.
 * @param result - The result containing statistics
 * @returns The confidence value
 * @throws Error if confidence is missing
 */
export function getConfidence(result: {statistics: FluentStatistics}): number {
  const confidence = result.statistics.confidence
  if (confidence === undefined) {
    throw new Error('Expected confidence to be defined')
  }
  return confidence
}

/**
 * Gets credible interval from statistics, throwing if missing.
 * @param result - The result containing statistics
 * @returns The credible interval tuple
 * @throws Error if credible interval is missing
 */
export function getCredibleInterval(result: {statistics: FluentStatistics}): [number, number] {
  const interval = result.statistics.credibleInterval
  if (interval === undefined) {
    throw new Error('Expected credibleInterval to be defined')
  }
  return interval
}

// ============================================================================
// Console Capture Helpers
// ============================================================================

let capturedLogs: string[] = []
let originalConsoleLog: typeof console.log
let originalConsoleDebug: typeof console.debug
let originalConsoleWarn: typeof console.warn

/**
 * Captures console.log, console.debug, and console.warn calls.
 * Call restoreConsole() in afterEach to restore.
 */
export function captureConsole(): void {
  capturedLogs = []
  originalConsoleLog = console.log
  originalConsoleDebug = console.debug
  originalConsoleWarn = console.warn
  const handler = (...args: unknown[]) => capturedLogs.push(args.join(' '))
  console.log = handler
  console.debug = handler
  console.warn = handler
}

/**
 * Restores the original console methods.
 * Should be called in afterEach after captureConsole().
 */
export function restoreConsole(): void {
  console.log = originalConsoleLog
  console.debug = originalConsoleDebug
  console.warn = originalConsoleWarn
}

export const getCapturedLogs = (): string[] => capturedLogs

// ============================================================================
// Common Arbitrary Factories
// ============================================================================
// Naming convention: use descriptive names with consistent suffixes
// - Range qualifiers: small (-10 to 10), medium (0 to 100), positive (1+)
// - No redundant "Integer" suffix when context is clear

export const smallInt = () => fc.integer(-10, 10)

export const positiveInt = () => fc.integer(1, 100)

/**
 * Creates a medium-range integer arbitrary (0 to 100).
 * Useful for sample sizes and counts.
 */
export const mediumInt = () => fc.integer(0, 100)

/**
 * Creates a bounded integer arbitrary with configurable range.
 * @param min - Minimum value (default: -10)
 * @param max - Maximum value (default: 10)
 */
export function boundedInt(min = -10, max = 10) {
  return fc.integer(min, max)
}

export const shortString = () => fc.string(0, 10)

/**
 * Creates a bounded string arbitrary.
 * @param minLength - Minimum length (default: 0)
 * @param maxLength - Maximum length (default: 10)
 */
export function boundedString(minLength = 0, maxLength = 10) {
  return fc.string(minLength, maxLength)
}

/**
 * Creates a small array arbitrary (length 0 to 10).
 * @param arb - The arbitrary for array elements
 */
export function smallArray<T>(arb: fc.Arbitrary<T>) {
  return fc.array(arb, 0, 10)
}

/**
 * Creates a non-empty array arbitrary (length 1 to 10).
 * @param arb - The arbitrary for array elements
 */
export function nonEmptyArray<T>(arb: fc.Arbitrary<T>) {
  return fc.nonEmptyArray(arb, 10)
}

// ============================================================================
// Coverage Test Helpers
// ============================================================================

/**
 * Gets coverage results from statistics, throwing if missing.
 * @param result - The result containing statistics
 * @returns The coverage results array
 * @throws Error if coverage results are missing
 */
export function getCoverageResults(result: {statistics: FluentStatistics}) {
  const coverageResults = result.statistics.coverageResults
  if (coverageResults === undefined) {
    throw new Error('Expected coverageResults to be defined')
  }
  return coverageResults
}

/**
 * Finds a coverage result by label.
 * @param coverageResults - Array of coverage results
 * @param label - The label to find
 * @returns The coverage result or undefined
 */
export function findCoverageByLabel(
  coverageResults: NonNullable<FluentStatistics['coverageResults']>,
  label: string
) {
  return coverageResults.find(c => c.label === label)
}

// NOTE: assertStatisticsComplete was removed as it only checked type-guaranteed fields.
// Use assertStatisticsInvariants() instead for meaningful validation.

/**
 * Asserts that a label count is within expected bounds.
 * @param result - The result containing statistics
 * @param label - The label to check
 * @param min - Minimum expected count (optional)
 * @param max - Maximum expected count (optional)
 */
export function assertLabelCount(
  result: {statistics: FluentStatistics},
  label: string,
  min?: number,
  max?: number
): void {
  const labels = getLabels(result)
  const count = labels[label] ?? 0
  if (min !== undefined) {
    expect(count).to.be.at.least(min)
  }
  if (max !== undefined) {
    expect(count).to.be.at.most(max)
  }
}

/**
 * Asserts that a coverage requirement is satisfied.
 * @param result - The result containing statistics
 * @param label - The coverage label to check
 */
export function assertCoverageSatisfied(
  result: {statistics: FluentStatistics},
  label: string
): void {
  const coverageResults = getCoverageResults(result)
  const coverage = findCoverageByLabel(coverageResults, label)
  if (coverage === undefined) {
    throw new Error(`Coverage result for label '${label}' not found`)
  }
  expect(coverage.satisfied).to.be.true
}

// ============================================================================
// Error Testing Helpers
// ============================================================================

/**
 * Asserts that a function throws an error with a message matching a pattern.
 * @param fn - The function that should throw
 * @param messagePattern - String or RegExp to match against error message
 */
export function assertThrowsWithMessage(
  fn: () => void,
  messagePattern: string | RegExp
): void {
  expect(fn).to.throw(messagePattern)
}

/**
 * Asserts that a function throws an error with a specific property value.
 * @param fn - The function that should throw
 * @param property - The property name to check
 * @param value - The expected value (or a matcher function)
 */
export function assertThrowsWithProperty(
  fn: () => void,
  property: string,
  value: unknown | ((val: unknown) => boolean)
): void {
  try {
    fn()
    expect.fail('Expected function to throw, but it did not.')
  } catch (error) {
    const errorObj = error as Record<string, unknown>
    expect(errorObj).to.have.property(property)
    if (typeof value === 'function') {
      expect((value as (val: unknown) => boolean)(errorObj[property])).to.be.true
    } else {
      expect(errorObj[property]).to.equal(value)
    }
  }
}

/**
 * Asserts that a function throws a validation error for a specific field.
 * @param fn - The function that should throw
 * @param fieldName - The field name that should be mentioned in the error
 */
export function assertValidationError(
  fn: () => void,
  fieldName: string
): void {
  assertThrowsWithMessage(fn, fieldName)
}

// ============================================================================
// Statistics Helpers
// ============================================================================

/**
 * Asserts that statistics satisfy basic invariants.
 * @param result - The result to check
 */
export function assertStatisticsInvariants(result: {
  statistics: FluentStatistics
  satisfiable: boolean
}): void {
  const {statistics, satisfiable} = result

  // Basic non-negativity checks
  expect(statistics.testsRun).to.be.at.least(0)
  expect(statistics.testsPassed).to.be.at.least(0)
  expect(statistics.testsDiscarded).to.be.at.least(0)
  expect(statistics.executionTimeMs).to.be.at.least(0)

  // Invariant: testsRun = testsPassed + testsDiscarded [+ 1 if unsatisfiable]
  const expectedTestsRun = statistics.testsPassed + statistics.testsDiscarded + (satisfiable ? 0 : 1)
  expect(statistics.testsRun).to.equal(expectedTestsRun)
}

/**
 * Asserts that testsRun matches the expected value.
 * @param result - The result to check
 * @param expected - Expected number of tests run (optional, validates non-negativity if not provided)
 */
export function assertTestsRunEquals(
  result: {statistics: FluentStatistics},
  expected?: number
): void {
  if (expected !== undefined) {
    expect(result.statistics.testsRun).to.equal(expected)
  } else {
    // Type system guarantees it's a number, but we validate non-negativity for runtime safety
    expect(result.statistics.testsRun).to.be.at.least(0)
  }
}

/**
 * Asserts that testsPassed matches the expected value.
 * @param result - The result to check
 * @param expected - Expected number of tests passed (optional, validates non-negativity if not provided)
 */
export function assertTestsPassedEquals(
  result: {statistics: FluentStatistics},
  expected?: number
): void {
  if (expected !== undefined) {
    expect(result.statistics.testsPassed).to.equal(expected)
  } else {
    // Type system guarantees it's a number, but we validate non-negativity for runtime safety
    expect(result.statistics.testsPassed).to.be.at.least(0)
  }
}

// ============================================================================
// Arbitrary Size Assertions
// ============================================================================

/**
 * Asserts that a size object has the expected exact value.
 */
export function assertExactSize(size: ArbitrarySize, expectedValue: number): void {
  expect(size.type).to.equal('exact')
  expect((size as {type: 'exact'; value: number}).value).to.equal(expectedValue)
}

/**
 * Asserts that a size object is estimated (not exact).
 */
export function assertEstimatedSize(size: ArbitrarySize): void {
  expect(size.type).to.equal('estimated')
  const estimated = size as {type: 'estimated'; credibleInterval: [number, number]}
  expect(estimated.credibleInterval).to.exist
  expect(estimated.credibleInterval).to.be.an('array').with.length(2)
}

/**
 * Asserts that an arbitrary can generate a specific value.
 */
export function assertCanGenerate<T>(arbitrary: Arbitrary<T>, pick: FluentPick<T>): void {
  expect(arbitrary.canGenerate(pick)).to.be.true
}

/**
 * Asserts that an arbitrary cannot generate a specific value.
 */
export function assertCannotGenerate<T>(arbitrary: Arbitrary<T>, pick: FluentPick<T>): void {
  expect(arbitrary.canGenerate(pick)).to.be.false
}

/**
 * Gets corner case values from an arbitrary.
 */
export function getCornerCaseValues<T>(arbitrary: Arbitrary<T>): T[] {
  return arbitrary.cornerCases().map(c => c.value)
}

// ============================================================================
// Scenario Patterns
// ============================================================================

/**
 * Creates a scenario for testing with two small integer variables.
 * Commonly used for binary operation tests.
 */
export function smallIntScenario() {
  return fc.scenario()
    .forall('a', smallInt())
    .forall('b', smallInt())
}

/**
 * Creates a scenario for testing with three small integer variables.
 * Commonly used for associativity tests.
 */
export function smallIntScenario3() {
  return fc.scenario()
    .forall('a', smallInt())
    .forall('b', smallInt())
    .forall('c', smallInt())
}

/**
 * Tests a binary property with two arbitraries.
 * @returns The test result (call .assertSatisfiable() to verify)
 */
export function binaryProperty<T, U>(
  arbA: fc.Arbitrary<T>,
  arbB: fc.Arbitrary<U>,
  predicate: (a: T, b: U) => boolean,
  sampleSize = 100
): FluentResult<{a: T; b: U}> {
  return scenarioWithSampleSize(sampleSize)
    .forall('a', arbA)
    .forall('b', arbB)
    .then(({a, b}) => predicate(a, b))
    .check()
}

// ============================================================================
// Mathematical Testing Utilities
// ============================================================================

/**
 * Calculates a relative tolerance delta for floating-point comparisons.
 * Uses a hybrid approach: absolute tolerance for small values, relative for large.
 * @param expected - The expected value
 * @param relativeTolerance - Relative tolerance factor (default: 1e-4 = 0.01%)
 * @param minAbsolute - Minimum absolute tolerance (default: 1e-8)
 * @returns The tolerance delta to use with closeTo assertions
 * @example
 * expect(actual).to.be.closeTo(expected, relativeDelta(expected))
 */
export function relativeDelta(expected: number, relativeTolerance = 1e-4, minAbsolute = 1e-8): number {
  return Math.max(minAbsolute, Math.abs(expected) * relativeTolerance)
}

// ============================================================================
// Mathematical Property Patterns
// ============================================================================
// These patterns create scenarios (not executed) for testing algebraic properties.
// Call .check().assertSatisfiable() to run the test.

/**
 * Tests if a binary operation is commutative: f(a, b) === f(b, a)
 */
export function testCommutative<T>(
  arbitrary: fc.Arbitrary<T>,
  operation: (a: T, b: T) => T
) {
  return fc.scenario()
    .forall('a', arbitrary)
    .forall('b', arbitrary)
    .then(({a, b}) => operation(a, b) === operation(b, a))
}

/**
 * Tests if a binary operation is associative: f(f(a, b), c) === f(a, f(b, c))
 */
export function testAssociative<T>(
  arbitrary: fc.Arbitrary<T>,
  operation: (a: T, b: T) => T
) {
  return fc.scenario()
    .forall('a', arbitrary)
    .forall('b', arbitrary)
    .forall('c', arbitrary)
    .then(({a, b, c}) => operation(operation(a, b), c) === operation(a, operation(b, c)))
}

/**
 * Tests if an operation has an identity element: f(a, identity) === a
 */
export function testIdentity<T>(
  arbitrary: fc.Arbitrary<T>,
  operation: (a: T, b: T) => T,
  identity: T
) {
  return fc.scenario()
    .forall('a', arbitrary)
    .then(({a}) => operation(a, identity) === a)
}

/**
 * Tests if a function is idempotent: f(f(x)) === f(x)
 */
export function testIdempotent<T>(
  arbitrary: fc.Arbitrary<T>,
  fn: (x: T) => T
) {
  return fc.scenario()
    .forall('x', arbitrary)
    .then(({x}) => fn(fn(x)) === fn(x))
}

/**
 * Tests if encode/decode form a roundtrip: decode(encode(x)) === x
 */
export function testRoundtrip<T, U>(
  arbitrary: fc.Arbitrary<T>,
  encode: (x: T) => U,
  decode: (x: U) => T
) {
  return fc.scenario()
    .forall('x', arbitrary)
    .then(({x}) => decode(encode(x)) === x)
}
