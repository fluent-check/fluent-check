import type {FluentPick} from '../arbitraries/index.js'
import {ArbitraryConstant} from '../arbitraries/ArbitraryConstant.js'
import {createScenario} from '../Scenario.js'
import type {ScenarioNode} from '../Scenario.js'
import {createExecutableScenario} from '../ExecutableScenario.js'
import type {ExecutableScenario, ExecutableQuantifier} from '../ExecutableScenario.js'
import type {Sampler} from './Sampler.js'
import type {Explorer} from './Explorer.js'
import type {BoundTestCase} from './types.js'

interface ShrinkMode<Rec extends {}> {
  quantifiers: (scenario: ExecutableScenario<Rec>) => readonly ExecutableQuantifier[]
  accept: (
    result: ReturnType<Explorer<Rec>['explore']>,
    candidate: BoundTestCase<Rec>
  ) => BoundTestCase<Rec> | null
}

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
          arbitrary: new BoundConstantArbitrary(boundPick)
        } as ScenarioNode<Rec>
      }
    }
    return node
  })

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

  /**
   * Number of shrinking iterations completed (total rounds attempted).
   */
  readonly roundsCompleted?: number
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
  #counterexampleMode: ShrinkMode<Rec> = {
    quantifiers: scenario => scenario.quantifiers,
    accept: result => (result.outcome === 'failed' ? result.counterexample : null)
  }

  #witnessMode: ShrinkMode<Rec> = {
    quantifiers: scenario => scenario.quantifiers.filter(q => q.type === 'exists'),
    accept: (result, candidate) => (result.outcome === 'passed' ? result.witness ?? candidate : null)
  }

  shrink(
    counterexample: BoundTestCase<Rec>,
    scenario: ExecutableScenario<Rec>,
    explorer: Explorer<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ShrinkBudget
  ): ShrinkResult<Rec> {
    return this.#shrinkWithMode(counterexample, scenario, explorer, property, sampler, budget, this.#counterexampleMode)
  }

  shrinkWitness(
    witness: BoundTestCase<Rec>,
    scenario: ExecutableScenario<Rec>,
    explorer: Explorer<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ShrinkBudget
  ): ShrinkResult<Rec> {
    return this.#shrinkWithMode(witness, scenario, explorer, property, sampler, budget, this.#witnessMode)
  }

  #shrinkWithMode(
    input: BoundTestCase<Rec>,
    scenario: ExecutableScenario<Rec>,
    explorer: Explorer<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ShrinkBudget,
    mode: ShrinkMode<Rec>
  ): ShrinkResult<Rec> {
    const quantifiers = mode.quantifiers(scenario)
    let current = {...input}
    let attempts = 0
    let rounds = 0
    let roundsCompleted = 0

    const shrinkQuantifier = (quantifier: ExecutableQuantifier) => {
      const key = quantifier.name as keyof Rec
      const pick = current[key]
      if (pick === undefined) return false

      const remaining = budget.maxAttempts - attempts
      if (remaining <= 0) return false

      const candidates = quantifier.shrink(pick, sampler, Math.min(remaining, 100))

      for (const candidate of candidates) {
        if (attempts >= budget.maxAttempts) break
        attempts++

        if (!quantifier.isShrunken(candidate, pick)) continue

        const testCase = {...current, [key]: candidate}
        const partialScenario = buildPartialExecutableScenario(scenario, quantifier.name, testCase)

        const result = explorer.explore(partialScenario, property, sampler, {
          maxTests: Math.min(100, budget.maxAttempts - attempts)
        })

        const accepted = mode.accept(result, testCase)
        if (accepted !== null) {
          current = accepted
          rounds++
          return true
        }
      }

      return false
    }

    while (rounds < budget.maxRounds && attempts < budget.maxAttempts) {
      roundsCompleted++
      let foundSmaller = false

      for (const quantifier of quantifiers) {
        if (attempts >= budget.maxAttempts) break
        if (shrinkQuantifier(quantifier)) {
          foundSmaller = true
          break
        }
      }

      if (!foundSmaller) break
    }

    return {
      minimized: current,
      attempts,
      rounds,
      roundsCompleted
    }
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
