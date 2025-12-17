/**
 * Arbitrary Laws - Universal properties that any Arbitrary<T> implementation should satisfy.
 *
 * Laws are organized into stratified categories:
 * - samplingLaws: Laws about sample(), sampleUnique(), sampleWithBias()
 * - shrinkingLaws: Laws about shrink() behavior
 * - compositionLaws: Laws about map(), filter(), and NoArbitrary
 *
 * Each category provides individual law functions and an `all()` aggregator.
 * The unified `arbitraryLaws` entry point provides check() and assert() methods.
 */

import type {Arbitrary} from './Arbitrary.js'
import type {FluentPick} from './types.js'
import {NoArbitrary} from './NoArbitrary.js'

// ============================================
// Law Result Types
// ============================================

/**
 * Result of checking a single law against an arbitrary.
 */
export interface LawResult {
  /** Full law identifier (e.g., 'samplingLaws.sampleValidity') */
  law: string
  /** Whether the law passed */
  passed: boolean
  /** Counterexample that caused failure, if any */
  counterexample?: unknown
  /** Human-readable failure message */
  message?: string
}

/**
 * Creates a passing law result.
 */
function pass(law: string): LawResult {
  return {law, passed: true}
}

/**
 * Creates a failing law result.
 */
function fail(law: string, message: string, counterexample?: unknown): LawResult {
  return {law, passed: false, message, counterexample}
}

// ============================================
// Category: Sampling Laws
// ============================================

/**
 * Laws about sampling behavior: sample(), sampleUnique(), sampleWithBias().
 */
export const samplingLaws = {
  /**
   * All sampled values should pass canGenerate.
   *
   * This verifies that the arbitrary only produces values it recognizes as valid.
   */
  sampleValidity: <T>(arb: Arbitrary<T>, sampleSize = 100): LawResult => {
    const law = 'samplingLaws.sampleValidity'
    const samples = arb.sample(sampleSize)
    const invalid = samples.find(pick => !arb.canGenerate(pick))
    if (invalid !== undefined) {
      return fail(law, 'Sample produced value that fails canGenerate', invalid.value)
    }
    return pass(law)
  },

  /**
   * sample(n) returns at most n picks.
   *
   * Note: sample() allows sampling with replacement, so it's not bounded by size.
   * It only stops early if pick() returns undefined (e.g., for NoArbitrary).
   */
  sampleSizeBound: <T>(arb: Arbitrary<T>, n = 50): LawResult => {
    const law = 'samplingLaws.sampleSizeBound'
    const samples = arb.sample(n)
    // Sample should never return MORE than requested
    if (samples.length > n) {
      return fail(law, `Expected at most ${n} samples, got ${samples.length}`)
    }
    // If size is 0, we should get 0 samples
    if (arb.size().value === 0 && samples.length > 0) {
      return fail(law, `Empty arbitrary (size 0) produced ${samples.length} samples`)
    }
    return pass(law)
  },

  /**
   * sampleUnique returns distinct values.
   */
  uniqueSampleUniqueness: <T>(arb: Arbitrary<T>, n = 50): LawResult => {
    const law = 'samplingLaws.uniqueSampleUniqueness'
    const samples = arb.sampleUnique(n)
    const values = samples.map(s => JSON.stringify(s.value))
    const uniqueValues = new Set(values)
    if (values.length !== uniqueValues.size) {
      return fail(law, `sampleUnique returned ${values.length} values but only ${uniqueValues.size} unique`)
    }
    return pass(law)
  },

  /**
   * sampleWithBias includes corner cases when sample size allows.
   */
  cornerCaseInclusion: <T>(arb: Arbitrary<T>): LawResult => {
    const law = 'samplingLaws.cornerCaseInclusion'
    const corners = arb.cornerCases()
    if (corners.length === 0) {
      return pass(law) // No corner cases to check
    }
    const samples = arb.sampleWithBias(corners.length + 10)
    const sampleValues = new Set(samples.map(s => JSON.stringify(s.value)))
    const missingCorners = corners.filter(c => !sampleValues.has(JSON.stringify(c.value)))
    if (missingCorners.length > 0) {
      const firstMissing = missingCorners[0]
      if (firstMissing !== undefined) {
        return fail(law, 'Corner case not in biased sample', firstMissing.value)
      }
    }
    return pass(law)
  },

  /**
   * Run all sampling laws against an arbitrary.
   */
  all: <T>(arb: Arbitrary<T>, sampleSize = 100): LawResult[] => [
    samplingLaws.sampleValidity(arb, sampleSize),
    samplingLaws.sampleSizeBound(arb, Math.min(50, sampleSize)),
    samplingLaws.uniqueSampleUniqueness(arb, Math.min(50, sampleSize)),
    samplingLaws.cornerCaseInclusion(arb),
  ]
}

// ============================================
// Category: Shrinking Laws
// ============================================

/**
 * Laws about shrinking behavior.
 */
export const shrinkingLaws = {
  /**
   * Shrinking produces a valid arbitrary (not necessarily smaller in size).
   *
   * Note: For filtered/estimated arbitraries, the size after shrinking may
   * appear "larger" because the estimate changes. What matters is that
   * shrinking produces valid values that can be further shrunk.
   */
  shrinkProducesValidArbitrary: <T>(arb: Arbitrary<T>, pick: FluentPick<T>): LawResult => {
    const law = 'shrinkingLaws.shrinkProducesValidArbitrary'
    const shrunk = arb.shrink(pick)

    // The shrunk arbitrary should be usable (can sample from it or it's empty)
    const shrunkSize = shrunk.size().value
    if (shrunkSize > 0) {
      // If it has non-zero size, we should be able to sample from it
      const samples = shrunk.sample(1)
      if (samples.length === 0) {
        return fail(law, 'Shrunk arbitrary has non-zero size but produced no samples')
      }
    }
    return pass(law)
  },

  /**
   * Repeated shrinking eventually converges to NoArbitrary (size 0).
   */
  shrinkTermination: <T>(arb: Arbitrary<T>, pick: FluentPick<T>, maxIterations = 100): LawResult => {
    const law = 'shrinkingLaws.shrinkTermination'
    let current = arb.shrink(pick)
    let iterations = 0

    while (current.size().value > 0 && iterations < maxIterations) {
      const sample = current.sample(1)[0]
      if (sample === undefined) break
      current = current.shrink(sample)
      iterations++
    }

    if (current.size().value > 0) {
      return fail(law, `Shrinking did not terminate after ${maxIterations} iterations`)
    }
    return pass(law)
  },

  /**
   * Run all shrinking laws against an arbitrary with a given pick.
   */
  all: <T>(arb: Arbitrary<T>, pick: FluentPick<T>): LawResult[] => [
    shrinkingLaws.shrinkProducesValidArbitrary(arb, pick),
    shrinkingLaws.shrinkTermination(arb, pick),
  ]
}

// ============================================
// Category: Composition Laws
// ============================================

/**
 * Laws about arbitrary composition: filter(), map(), and NoArbitrary.
 */
export const compositionLaws = {
  /**
   * Filtered values satisfy the predicate.
   */
  filterRespectsPredicate: <T>(arb: Arbitrary<T>, predicate: (t: T) => boolean, sampleSize = 50): LawResult => {
    const law = 'compositionLaws.filterRespectsPredicate'
    const filtered = arb.filter(predicate)
    const samples = filtered.sample(sampleSize)
    const invalid = samples.find(s => !predicate(s.value))
    if (invalid !== undefined) {
      return fail(law, 'Filtered arbitrary produced value failing predicate', invalid.value)
    }
    return pass(law)
  },

  /**
   * Map on NoArbitrary returns NoArbitrary.
   */
  noArbitraryMapIdentity: (): LawResult => {
    const law = 'compositionLaws.noArbitraryMapIdentity'
    const mapped = NoArbitrary.map(x => x)
    if (mapped !== NoArbitrary) {
      return fail(law, 'map on NoArbitrary did not return NoArbitrary')
    }
    return pass(law)
  },

  /**
   * Filter on NoArbitrary returns NoArbitrary.
   */
  noArbitraryFilterIdentity: (): LawResult => {
    const law = 'compositionLaws.noArbitraryFilterIdentity'
    const filtered = NoArbitrary.filter(() => true)
    // NoArbitrary.filter() returns itself (special case - still exact size 0)
    // Type assertion needed because interface says filter() returns EstimatedSizeArbitrary
    if ((filtered as unknown) !== NoArbitrary) {
      return fail(law, 'filter on NoArbitrary did not return NoArbitrary')
    }
    return pass(law)
  },

  /**
   * Run all composition laws.
   * Note: filterRespectsPredicate requires an arbitrary and predicate.
   */
  all: <T>(arb: Arbitrary<T>, predicate: (t: T) => boolean): LawResult[] => [
    compositionLaws.filterRespectsPredicate(arb, predicate),
    compositionLaws.noArbitraryMapIdentity(),
    compositionLaws.noArbitraryFilterIdentity(),
  ]
}

// ============================================
// Unified API
// ============================================

/**
 * Options for checking laws against an arbitrary.
 */
export interface LawCheckOptions<T> {
  /** A pick to use for shrinking laws. If not provided, one will be sampled. */
  pick?: FluentPick<T>
  /** A predicate to use for filter composition laws. */
  predicate?: (t: T) => boolean
  /** Sample size for laws that sample. Default: 100 */
  sampleSize?: number
}

/**
 * Unified entry point for arbitrary laws.
 */
export const arbitraryLaws = {
  /** Sampling laws category */
  sampling: samplingLaws,
  /** Shrinking laws category */
  shrinking: shrinkingLaws,
  /** Composition laws category */
  composition: compositionLaws,

  /**
   * Run all applicable laws against an arbitrary.
   *
   * @param arb - The arbitrary to test
   * @param options - Optional configuration
   * @returns Array of law results
   */
  check: <T>(arb: Arbitrary<T>, options: LawCheckOptions<T> = {}): LawResult[] => {
    const sampleSize = options.sampleSize ?? 100
    const results: LawResult[] = []

    // Always run sampling laws
    results.push(...samplingLaws.all(arb, sampleSize))

    // Run shrinking laws if we have or can get a pick
    let pick = options.pick
    if (pick === undefined && arb.size().value > 0) {
      const samples = arb.sample(1)
      if (samples.length > 0) {
        pick = samples[0]
      }
    }
    if (pick !== undefined) {
      results.push(...shrinkingLaws.all(arb, pick))
    }

    // Run composition laws if we have a predicate
    if (options.predicate !== undefined) {
      results.push(...compositionLaws.all(arb, options.predicate))
    } else {
      // Still run NoArbitrary laws
      results.push(compositionLaws.noArbitraryMapIdentity())
      results.push(compositionLaws.noArbitraryFilterIdentity())
    }

    return results
  },

  /**
   * Assert all laws pass, throwing on first failure.
   *
   * @param arb - The arbitrary to test
   * @param options - Optional configuration
   * @throws Error if any law fails
   */
  assert: <T>(arb: Arbitrary<T>, options: LawCheckOptions<T> = {}): void => {
    const results = arbitraryLaws.check(arb, options)
    const failed = results.find(r => !r.passed)
    if (failed !== undefined) {
      const details = failed.counterexample !== undefined
        ? ` Counterexample: ${JSON.stringify(failed.counterexample)}`
        : ''
      throw new Error(`Law ${failed.law} failed: ${failed.message}${details}`)
    }
  },

  /**
   * Get a summary of law check results.
   *
   * @param results - Array of law results
   * @returns Summary object with counts
   */
  summarize: (results: LawResult[]): {passed: number, failed: number, total: number} => {
    const passed = results.filter(r => r.passed).length
    return {
      passed,
      failed: results.length - passed,
      total: results.length
    }
  }
}
