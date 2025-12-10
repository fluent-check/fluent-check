import type {FluentPick} from '../arbitraries/index.js'
import {ArbitraryConstant} from '../arbitraries/ArbitraryConstant.js'
import {createScenario} from '../Scenario.js'
import type {ScenarioNode} from '../Scenario.js'
import {createExecutableScenario} from '../ExecutableScenario.js'
import type {ExecutableScenario, ExecutableQuantifier} from '../ExecutableScenario.js'
import type {Sampler} from './Sampler.js'
import type {Explorer, ExplorationBudget} from './Explorer.js'
import type {BoundTestCase} from './types.js'

class BoundConstantArbitrary<A> extends ArbitraryConstant<A> {
  constructor(private readonly pickValue: FluentPick<A>) {
    super(pickValue.value)
  }

  override pick(): FluentPick<A> {
    return {
      value: this.pickValue.value,
      original: this.pickValue.original ?? this.pickValue.value,
      preMapValue: this.pickValue.preMapValue
    }
  }

  override cornerCases(): FluentPick<A>[] {
    return [this.pick()]
  }
}

export function buildPartialExecutableScenario<Rec extends {}>(
  scenario: ExecutableScenario<Rec>,
  upToQuantifierName: string,
  boundValues: BoundTestCase<Rec>
): ExecutableScenario<Rec> {
  // Find the index of the quantifier we're shrinking
  const quantifierIndex = scenario.quantifiers.findIndex(q => q.name === upToQuantifierName)

  if (quantifierIndex === -1) {
    return scenario
  }

  // Build new nodes where bound quantifiers are converted to constants
  const newNodes = scenario.nodes.map(node => {
    if (node.type === 'forall' || node.type === 'exists') {
      const qIndex = scenario.quantifiers.findIndex(q => q.name === node.name)
      const boundPick = boundValues[node.name as keyof Rec]
      if (qIndex !== -1 && qIndex <= quantifierIndex && boundPick !== undefined) {
        return {
          ...node,
          arbitrary: new BoundConstantArbitrary(boundPick as FluentPick<unknown>)
        } as ScenarioNode<Rec>
      }
    }
    return node
  }) as ScenarioNode<Rec>[]

  // Recreate scenario to keep nodes/quantifiers/searchSpace in sync, then compile
  const updatedScenario = createScenario(newNodes)
  return createExecutableScenario(updatedScenario)
}

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
 * Result of shrinking a counterexample.
 */
export interface ShrinkResult<Rec extends {}> {
  /**
   * The minimized counterexample (may be same as input if no shrinking occurred).
   */
  readonly minimized: BoundTestCase<Rec>

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
 * The Explorer dependency allows the Shrinker to re-verify nested quantifiers
 * when shrinking. For example, when shrinking a witness for `∃a: ∀b: P(a,b)`,
 * the Shrinker needs to re-explore `∀b: P(a',b)` for each candidate `a'`.
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
   * @param explorer - The explorer for re-verifying nested quantifiers
   * @param property - The property function to verify failure
   * @param sampler - The sampler for generating shrink candidates
   * @param budget - Shrinking limits
   * @returns The shrink result with minimized counterexample
   */
  shrink(
    counterexample: BoundTestCase<Rec>,
    scenario: ExecutableScenario<Rec>,
    explorer: Explorer<Rec>,
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
   * @param explorer - The explorer for re-verifying nested quantifiers
   * @param property - The property function to verify success
   * @param sampler - The sampler for generating shrink candidates
   * @param budget - Shrinking limits
   * @returns The shrink result with minimized witness
   */
  shrinkWitness(
    witness: BoundTestCase<Rec>,
    scenario: ExecutableScenario<Rec>,
    explorer: Explorer<Rec>,
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
 * - Use the Explorer to re-verify nested quantifiers
 * - Continue until budget exhausted or no simpler value found
 */
export class PerArbitraryShrinker<Rec extends {}> implements Shrinker<Rec> {
  shrink(
    counterexample: BoundTestCase<Rec>,
    scenario: ExecutableScenario<Rec>,
    explorer: Explorer<Rec>,
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

        const result = this.#shrinkQuantifierForCounterexample(
          quantifier,
          current,
          scenario,
          explorer,
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
   * Attempts to shrink a single quantifier's value for counterexample shrinking.
   * Uses the Explorer to re-verify that the shrunk value still causes a failure.
   */
  #shrinkQuantifierForCounterexample(
    quantifier: ExecutableQuantifier,
    current: BoundTestCase<Rec>,
    scenario: ExecutableScenario<Rec>,
    explorer: Explorer<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    remainingBudget: number
  ): { shrunk: boolean; value: BoundTestCase<Rec>; attempts: number } {
    const name = quantifier.name as keyof Rec
    const currentPick = current[name]

    if (currentPick === undefined) {
      return {shrunk: false, value: current, attempts: 0}
    }

    // Get shrink candidates using the compiled quantifier operations
    const candidates = quantifier.shrink(
      currentPick as FluentPick<unknown>,
      sampler,
      Math.min(remainingBudget, 100)
    )

    let attempts = 0

    for (const candidate of candidates) {
      if (attempts >= remainingBudget) break
      attempts++

      // Create test case with shrunk value
      const testCase = {...current, [name]: candidate}

      // Only accept candidates that the arbitrary considers strictly shrunken
      if (!quantifier.isShrunken(candidate, currentPick as FluentPick<unknown>)) {
        continue
      }

      // Build a partial scenario starting from this quantifier's position
      const partialScenario = this.#buildPartialScenario(scenario, quantifier.name, testCase)

      // Use explorer to verify this shrunk value still causes a failure
      const explorationBudget: ExplorationBudget = {
        maxTests: Math.min(100, remainingBudget - attempts)
      }

      const result = explorer.explore(partialScenario, property, sampler, explorationBudget)

      if (result.outcome === 'failed') {
        // Found a smaller counterexample - use the full counterexample from exploration
        return {
          shrunk: true,
          value: result.counterexample as BoundTestCase<Rec>,
          attempts
        }
      }
    }

    return {shrunk: false, value: current, attempts}
  }

  shrinkWitness(
    witness: BoundTestCase<Rec>,
    scenario: ExecutableScenario<Rec>,
    explorer: Explorer<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ShrinkBudget
  ): ShrinkResult<Rec> {
    let current = {...witness}
    let totalAttempts = 0
    let rounds = 0

    // Only shrink existential quantifiers for witnesses
    const existentialQuantifiers = scenario.quantifiers.filter(q => q.type === 'exists')

    // Continue shrinking while within budget
    while (rounds < budget.maxRounds && totalAttempts < budget.maxAttempts) {
      let foundSmaller = false

      // Try to shrink each existential quantifier
      for (const quantifier of existentialQuantifiers) {
        if (totalAttempts >= budget.maxAttempts) break

        const result = this.#shrinkQuantifierForWitness(
          quantifier,
          current,
          scenario,
          explorer,
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
   * Attempts to shrink a single existential quantifier's value for witness shrinking.
   * Uses the Explorer to re-verify that the shrunk value still satisfies all foralls.
   */
  #shrinkQuantifierForWitness(
    quantifier: ExecutableQuantifier,
    current: BoundTestCase<Rec>,
    scenario: ExecutableScenario<Rec>,
    explorer: Explorer<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    remainingBudget: number
  ): { shrunk: boolean; value: BoundTestCase<Rec>; attempts: number } {
    const name = quantifier.name as keyof Rec
    const currentPick = current[name]

    if (currentPick === undefined) {
      return {shrunk: false, value: current, attempts: 0}
    }

    // Get shrink candidates using the compiled quantifier operations
    const candidates = quantifier.shrink(
      currentPick as FluentPick<unknown>,
      sampler,
      Math.min(remainingBudget, 100)
    )

    let attempts = 0

    for (const candidate of candidates) {
      if (attempts >= remainingBudget) break
      attempts++

      // Create test case with shrunk existential value
      const testCase = {...current, [name]: candidate}

      // Only accept candidates that the arbitrary considers strictly shrunken
      if (!quantifier.isShrunken(candidate, currentPick as FluentPick<unknown>)) {
        continue
      }

      // Build a partial scenario that fixes this existential and explores remaining quantifiers
      const partialScenario = this.#buildPartialScenario(scenario, quantifier.name, testCase)

      // Use explorer to verify this shrunk witness still satisfies all foralls
      const explorationBudget: ExplorationBudget = {
        maxTests: Math.min(100, remainingBudget - attempts)
      }

      const result = explorer.explore(partialScenario, property, sampler, explorationBudget)

      if (result.outcome === 'passed') {
        // Found a smaller witness - use the witness from exploration if available
        const newWitness = result.witness ?? testCase
        return {
          shrunk: true,
          value: newWitness as BoundTestCase<Rec>,
          attempts
        }
      }
    }

    return {shrunk: false, value: current, attempts}
  }

  /**
   * Builds a partial scenario that fixes bound variables and explores remaining ones.
   * The bound variables are converted to constants in the scenario.
   */
  #buildPartialScenario(
    scenario: ExecutableScenario<Rec>,
    upToQuantifierName: string,
    boundValues: BoundTestCase<Rec>
  ): ExecutableScenario<Rec> {
    return buildPartialExecutableScenario(scenario, upToQuantifierName, boundValues)
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
    counterexample: BoundTestCase<Rec>,
    _scenario: ExecutableScenario<Rec>,
    _explorer: Explorer<Rec>,
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
    witness: BoundTestCase<Rec>,
    _scenario: ExecutableScenario<Rec>,
    _explorer: Explorer<Rec>,
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
