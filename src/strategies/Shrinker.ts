import type {FluentPick} from '../arbitraries/index.js'
import type {Scenario, QuantifierNode} from '../Scenario.js'
import type {Sampler} from './Sampler.js'

/**
 * Budget constraints for shrinking.
 */
export interface ShrinkBudget {
  /**
   * Maximum number of shrink candidates to test across all quantifiers.
   */
  readonly maxAttempts: number

  /**
   * Maximum number of shrink rounds (iterations where we find a smaller counterexample).
   */
  readonly maxRounds: number
}

/**
 * Test case with all bound variables as FluentPick objects.
 * Same as TestCase from Explorer - preserved for shrinking context.
 */
export type PickResult<Rec extends {}> = {
  [K in keyof Rec]: FluentPick<Rec[K]>
}

/**
 * Result of shrinking a counterexample.
 */
export interface ShrinkResult<Rec extends {}> {
  /**
   * The minimized counterexample (may be same as input if no shrinking occurred).
   */
  readonly minimized: PickResult<Rec>

  /**
   * Number of shrink candidates tested.
   */
  readonly attempts: number

  /**
   * Number of successful shrink rounds (times we found a smaller counterexample).
   */
  readonly rounds: number
}

/**
 * Interface for shrinking counterexamples and witnesses to minimal forms.
 *
 * The Shrinker separates minimization from exploration, enabling:
 * - Alternative shrinking strategies (per-arbitrary, tuple, delta debugging)
 * - Independent testing of shrinking logic
 * - Optional shrinking that can be disabled for speed
 *
 * @typeParam Rec - The record type of bound variables in the scenario
 */
export interface Shrinker<Rec extends {}> {
  /**
   * Shrinks a counterexample to a minimal form.
   * Finds smaller values that still FAIL the property.
   *
   * @param counterexample - The failing test case (FluentPick values)
   * @param scenario - The scenario AST for accessing quantifier info
   * @param property - The property function to verify failure
   * @param sampler - The sampler for generating shrink candidates
   * @param budget - Shrinking limits
   * @returns The shrink result with minimized counterexample
   */
  shrink(
    counterexample: PickResult<Rec>,
    scenario: Scenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ShrinkBudget
  ): ShrinkResult<Rec>

  /**
   * Shrinks a witness to a minimal form.
   * Finds smaller values that still PASS the property.
   *
   * @param witness - The passing test case (FluentPick values)
   * @param scenario - The scenario AST for accessing quantifier info
   * @param property - The property function to verify success
   * @param sampler - The sampler for generating shrink candidates
   * @param budget - Shrinking limits
   * @returns The shrink result with minimized witness
   */
  shrinkWitness(
    witness: PickResult<Rec>,
    scenario: Scenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ShrinkBudget
  ): ShrinkResult<Rec>
}

/**
 * Shrinker that shrinks each quantifier's value independently.
 *
 * This implements the traditional property testing shrinking approach:
 * - For each quantifier, try progressively simpler values
 * - Re-run the property to verify the simpler value still fails
 * - Continue until budget exhausted or no simpler value found
 */
export class PerArbitraryShrinker<Rec extends {}> implements Shrinker<Rec> {
  shrink(
    counterexample: PickResult<Rec>,
    scenario: Scenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ShrinkBudget
  ): ShrinkResult<Rec> {
    let current = {...counterexample}
    let totalAttempts = 0
    let rounds = 0

    // Get quantifiers from scenario
    const quantifiers = scenario.quantifiers

    // Continue shrinking while within budget
    while (rounds < budget.maxRounds && totalAttempts < budget.maxAttempts) {
      let foundSmaller = false

      // Try to shrink each quantifier
      for (const quantifier of quantifiers) {
        if (totalAttempts >= budget.maxAttempts) break

        const result = this.#shrinkQuantifier(
          quantifier,
          current,
          property,
          sampler,
          budget.maxAttempts - totalAttempts
        )

        totalAttempts += result.attempts

        if (result.shrunk) {
          current = result.value
          foundSmaller = true
          rounds++

          // After finding a smaller value, restart from the first quantifier
          // This ensures we don't miss opportunities to shrink earlier quantifiers
          break
        }
      }

      // If we couldn't shrink any quantifier, we're done
      if (!foundSmaller) break
    }

    return {
      minimized: current,
      attempts: totalAttempts,
      rounds
    }
  }

  /**
   * Attempts to shrink a single quantifier's value.
   */
  #shrinkQuantifier(
    quantifier: QuantifierNode,
    current: PickResult<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    remainingBudget: number
  ): { shrunk: boolean; value: PickResult<Rec>; attempts: number } {
    const name = quantifier.name as keyof Rec
    const currentPick = current[name]

    if (currentPick === undefined) {
      return { shrunk: false, value: current, attempts: 0 }
    }

    // Get shrink candidates from the arbitrary
    const shrunkenArbitrary = quantifier.arbitrary.shrink(currentPick)
    const candidates = sampler.sample(shrunkenArbitrary, Math.min(remainingBudget, 100))

    let attempts = 0

    for (const candidate of candidates) {
      if (attempts >= remainingBudget) break
      attempts++

      // Create test case with shrunk value
      const testCase = {...current, [name]: candidate}

      // Convert to plain values for property evaluation
      const plainTestCase = this.#unwrapTestCase(testCase)

      // Check if property still fails with this shrunk value
      try {
        const passed = property(plainTestCase)
        if (!passed) {
          // Found a smaller counterexample
          return {
            shrunk: true,
            value: testCase,
            attempts
          }
        }
      } catch (e) {
        // If property throws (e.g., PreconditionFailure), try next candidate
        if (!this.#isPreconditionFailure(e)) {
          // Property threw a real error - still a failure, use this value
          return {
            shrunk: true,
            value: testCase,
            attempts
          }
        }
        // PreconditionFailure - skip this candidate
      }
    }

    return { shrunk: false, value: current, attempts }
  }

  /**
   * Converts a PickResult to plain values for property evaluation.
   */
  #unwrapTestCase(testCase: PickResult<Rec>): Rec {
    const result: Record<string, unknown> = {}
    for (const [key, pick] of Object.entries(testCase)) {
      result[key] = (pick as FluentPick<unknown>).value
    }
    return result as Rec
  }

  /**
   * Check if an error is a PreconditionFailure.
   */
  #isPreconditionFailure(e: unknown): boolean {
    return (
      e !== null &&
      typeof e === 'object' &&
      '__brand' in e &&
      (e as { __brand: string }).__brand === 'PreconditionFailure'
    )
  }

  shrinkWitness(
    witness: PickResult<Rec>,
    scenario: Scenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ShrinkBudget
  ): ShrinkResult<Rec> {
    let current = {...witness}
    let totalAttempts = 0
    let rounds = 0

    // Only shrink existential quantifiers for witnesses
    const quantifiers = scenario.quantifiers.filter(q => q.type === 'exists')

    // Continue shrinking while within budget
    while (rounds < budget.maxRounds && totalAttempts < budget.maxAttempts) {
      let foundSmaller = false

      // Try to shrink each existential quantifier
      for (const quantifier of quantifiers) {
        if (totalAttempts >= budget.maxAttempts) break

        const result = this.#shrinkQuantifierForWitness(
          quantifier,
          current,
          property,
          sampler,
          budget.maxAttempts - totalAttempts
        )

        totalAttempts += result.attempts

        if (result.shrunk) {
          current = result.value
          foundSmaller = true
          rounds++

          // After finding a smaller value, restart from the first quantifier
          break
        }
      }

      // If we couldn't shrink any quantifier, we're done
      if (!foundSmaller) break
    }

    return {
      minimized: current,
      attempts: totalAttempts,
      rounds
    }
  }

  /**
   * Attempts to shrink a single quantifier's value for witness shrinking.
   * The key difference from counterexample shrinking is that we look for
   * values where the property still PASSES.
   */
  #shrinkQuantifierForWitness(
    quantifier: QuantifierNode,
    current: PickResult<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    remainingBudget: number
  ): { shrunk: boolean; value: PickResult<Rec>; attempts: number } {
    const name = quantifier.name as keyof Rec
    const currentPick = current[name]

    if (currentPick === undefined) {
      return { shrunk: false, value: current, attempts: 0 }
    }

    // Get shrink candidates from the arbitrary
    const shrunkenArbitrary = quantifier.arbitrary.shrink(currentPick)
    const candidates = sampler.sample(shrunkenArbitrary, Math.min(remainingBudget, 100))

    let attempts = 0

    for (const candidate of candidates) {
      if (attempts >= remainingBudget) break
      attempts++

      // Create test case with shrunk value
      const testCase = {...current, [name]: candidate}

      // Convert to plain values for property evaluation
      const plainTestCase = this.#unwrapTestCase(testCase)

      // Check if property still PASSES with this shrunk value
      try {
        const passed = property(plainTestCase)
        if (passed) {
          // Found a smaller witness
          return {
            shrunk: true,
            value: testCase,
            attempts
          }
        }
      } catch (e) {
        // If property throws (e.g., PreconditionFailure), try next candidate
        if (!this.#isPreconditionFailure(e)) {
          // Property threw a real error - this is a failure, skip
          continue
        }
        // PreconditionFailure - skip this candidate
      }
    }

    return { shrunk: false, value: current, attempts }
  }
}

/**
 * Shrinker that performs no shrinking.
 *
 * Use when shrinking is disabled for faster test execution
 * at the cost of less informative counterexamples.
 */
export class NoOpShrinker<Rec extends {}> implements Shrinker<Rec> {
  shrink(
    counterexample: PickResult<Rec>,
    _scenario: Scenario<Rec>,
    _property: (testCase: Rec) => boolean,
    _sampler: Sampler,
    _budget: ShrinkBudget
  ): ShrinkResult<Rec> {
    return {
      minimized: counterexample,
      attempts: 0,
      rounds: 0
    }
  }

  shrinkWitness(
    witness: PickResult<Rec>,
    _scenario: Scenario<Rec>,
    _property: (testCase: Rec) => boolean,
    _sampler: Sampler,
    _budget: ShrinkBudget
  ): ShrinkResult<Rec> {
    return {
      minimized: witness,
      attempts: 0,
      rounds: 0
    }
  }
}

/**
 * Creates a default PerArbitraryShrinker instance.
 */
export function createPerArbitraryShrinker<Rec extends {}>(): Shrinker<Rec> {
  return new PerArbitraryShrinker<Rec>()
}

/**
 * Creates a NoOpShrinker instance.
 */
export function createNoOpShrinker<Rec extends {}>(): Shrinker<Rec> {
  return new NoOpShrinker<Rec>()
}
