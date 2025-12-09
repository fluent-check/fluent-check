import type {FluentPick} from '../arbitraries/index.js'
import type {
  Scenario,
  QuantifierNode,
  GivenNode,
  WhenNode,
  ThenNode
} from '../Scenario.js'
import type {Sampler} from './Sampler.js'

/**
 * Budget constraints for exploration.
 */
export interface ExplorationBudget {
  /**
   * Maximum number of property evaluations.
   */
  readonly maxTests: number

  /**
   * Optional time limit in milliseconds.
   * If set, exploration MAY stop early when exceeded.
   */
  readonly maxTime?: number
}

/**
 * Test case with all bound variables as FluentPick objects.
 * Preserves the original/value pair needed for shrinking.
 */
export type TestCase<Rec extends {}> = {
  [K in keyof Rec]: FluentPick<Rec[K]>
}

/**
 * Result of property exploration - a discriminated union.
 */
export type ExplorationResult<Rec extends {}> =
  | ExplorationPassed<Rec>
  | ExplorationFailed<Rec>
  | ExplorationExhausted

/**
 * All tested cases satisfied the property.
 * For exists scenarios, includes the witness that satisfied the property.
 */
export interface ExplorationPassed<Rec extends {} = {}> {
  readonly outcome: 'passed'
  readonly testsRun: number
  readonly skipped: number
  /**
   * For exists scenarios, the witness that satisfied the property.
   * For forall-only scenarios, this may be undefined or empty.
   */
  readonly witness?: TestCase<Rec>
}

/**
 * A counterexample was found.
 */
export interface ExplorationFailed<Rec extends {}> {
  readonly outcome: 'failed'
  readonly counterexample: TestCase<Rec>
  readonly testsRun: number
  readonly skipped: number
}

/**
 * Budget exhausted before finding failure (for forall)
 * or finding witness (for exists).
 */
export interface ExplorationExhausted {
  readonly outcome: 'exhausted'
  readonly testsRun: number
  readonly skipped: number
}

/**
 * Interface for exploring the search space of a property test scenario.
 *
 * The Explorer separates scenario traversal logic from the FluentCheck chain,
 * enabling:
 * - Alternative exploration strategies (e.g., tuple sampling, adaptive search)
 * - Cleaner separation between scenario definition and execution
 * - Better testability of exploration logic
 *
 * @typeParam Rec - The record type of bound variables in the scenario
 */
export interface Explorer<Rec extends {}> {
  /**
   * Explores the search space defined by the scenario.
   *
   * @param scenario - The scenario AST defining quantifiers and predicates
   * @param property - The property function to evaluate
   * @param sampler - The sampler for generating values
   * @param budget - Exploration limits
   * @returns The result of exploration
   */
  explore(
    scenario: Scenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ExplorationBudget
  ): ExplorationResult<Rec>
}

/**
 * Nested loop explorer implementing the traditional property testing approach.
 *
 * This explorer iterates through all combinations of quantifier values using
 * nested loops, matching the current FluentCheck behavior:
 * - For `forall`: iterates all samples, fails on first counterexample
 * - For `exists`: searches for a witness that satisfies the property
 *
 * The explorer is stateless - each call to `explore()` is independent.
 */
export class NestedLoopExplorer<Rec extends {}> implements Explorer<Rec> {
  /**
   * Explores the search space using nested iteration.
   */
  explore(
    scenario: Scenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ExplorationBudget
  ): ExplorationResult<Rec> {
    // Extract quantifiers and other nodes from scenario
    const quantifiers = scenario.quantifiers
    const givenNodes = scenario.nodes.filter(
      (n): n is GivenNode<Rec> => n.type === 'given'
    )
    const whenNodes = scenario.nodes.filter(
      (n): n is WhenNode<Rec> => n.type === 'when'
    )
    const thenNodes = scenario.nodes.filter(
      (n): n is ThenNode<Rec> => n.type === 'then'
    )

    // Generate samples for each quantifier upfront
    const samples = this.#generateSamples(quantifiers, sampler, budget.maxTests)

    // Track exploration state
    let testsRun = 0
    let skipped = 0
    const startTime = Date.now()

    // Determine if we're in forall-only mode
    const hasExistential = scenario.hasExistential

    // Recursive exploration function
    // Returns:
    // - 'passed': all inner checks succeeded (forall satisfied, or exists found witness at leaf)
    // - 'failed' with counterexample: a forall failed
    // - null: inconclusive, continue searching
    const exploreQuantifier = (
      quantifierIndex: number,
      testCase: TestCase<Rec>
    ): ExplorationResult<Rec> | null => {
      // Check budget limits
      if (testsRun >= budget.maxTests) {
        return null // Budget exhausted, let caller handle
      }
      if (budget.maxTime !== undefined && Date.now() - startTime > budget.maxTime) {
        return null // Time budget exceeded
      }

      // Base case: all quantifiers bound, evaluate property
      if (quantifierIndex >= quantifiers.length) {
        testsRun++

        // Apply given predicates to get derived values
        const fullTestCase = this.#applyGivens(testCase, givenNodes)

        // Execute when predicates (side effects)
        this.#executeWhens(fullTestCase, whenNodes)

        // Evaluate property (from then nodes)
        try {
          const result = this.#evaluateProperty(fullTestCase, thenNodes, property)

          if (result) {
            // Property satisfied for this test case - return "passed" to bubble up
            return {
              outcome: 'passed',
              testsRun,
              skipped,
              witness: {...testCase}
            }
          } else {
            // Property failed for this test case - return "failed" to bubble up
            return {
              outcome: 'failed',
              counterexample: {...testCase},
              testsRun,
              skipped
            }
          }
        } catch (e) {
          // Handle PreconditionFailure (skip this test case)
          if (this.#isPreconditionFailure(e)) {
            skipped++
            return null // Continue with next test case
          }
          throw e // Re-throw other errors
        }
      }

      // Recursive case: iterate through current quantifier's samples
      const quantifier = quantifiers[quantifierIndex]!
      const quantifierSamples = samples.get(quantifier.name) ?? []
      const isExists = quantifier.type === 'exists'

      if (isExists) {
        // EXISTENTIAL: need to find ONE value where all inner checks pass
        for (const sample of quantifierSamples) {
          const newTestCase = {
            ...testCase,
            [quantifier.name]: sample
          } as TestCase<Rec>

          // Check ALL inner quantifiers for this existential value
          const checkResult = this.#checkAllForThisExists(
            quantifierIndex + 1,
            newTestCase,
            quantifiers,
            samples,
            givenNodes,
            whenNodes,
            thenNodes,
            property,
            budget,
            startTime,
            () => testsRun,
            (n: number) => { testsRun = n },
            () => skipped,
            (n: number) => { skipped = n }
          )

          if (checkResult.status === 'all_passed') {
            // Found a witness! All inner foralls passed
            // Use the witness from the check which includes all nested existentials
            return {
              outcome: 'passed',
              testsRun,
              skipped,
              witness: checkResult.witness ?? newTestCase
            }
          }
          // result === 'some_failed' or 'inconclusive' - try next existential value

          // Check budget
          if (testsRun >= budget.maxTests) break
          if (budget.maxTime !== undefined && Date.now() - startTime > budget.maxTime) break
        }

        // Exhausted all existential values without finding a witness
        return null
      } else {
        // UNIVERSAL: need ALL values to pass, fail on first counterexample
        for (const sample of quantifierSamples) {
          const newTestCase = {
            ...testCase,
            [quantifier.name]: sample
          } as TestCase<Rec>

          // Recurse to next quantifier
          const result = exploreQuantifier(quantifierIndex + 1, newTestCase)

          if (result !== null) {
            if (result.outcome === 'failed') {
              // Found a counterexample - fail immediately
              return result
            }
            // result.outcome === 'passed' means this single test passed, continue checking others
          }

          // Check budget
          if (testsRun >= budget.maxTests) break
          if (budget.maxTime !== undefined && Date.now() - startTime > budget.maxTime) break
        }

        // All forall samples passed (or exhausted without failure)
        return null
      }
    }

    // Start exploration
    const result = exploreQuantifier(0, {} as TestCase<Rec>)

    if (result !== null) {
      return result
    }

    // No definitive result found
    if (hasExistential) {
      // For scenarios with exists: couldn't find a witness
      return {
        outcome: 'exhausted',
        testsRun,
        skipped
      }
    }

    // For forall-only: all tests passed
    return {
      outcome: 'passed',
      testsRun,
      skipped
    }
  }

  /**
   * Result from checking inner quantifiers for an existential value.
   */
  #checkAllForThisExists(
    quantifierIndex: number,
    testCase: TestCase<Rec>,
    quantifiers: readonly QuantifierNode[],
    samples: Map<string, FluentPick<unknown>[]>,
    givenNodes: GivenNode<Rec>[],
    whenNodes: WhenNode<Rec>[],
    thenNodes: ThenNode<Rec>[],
    property: (testCase: Rec) => boolean,
    budget: ExplorationBudget,
    startTime: number,
    getTestsRun: () => number,
    setTestsRun: (n: number) => void,
    getSkipped: () => number,
    setSkipped: (n: number) => void
  ): { status: 'all_passed' | 'some_failed' | 'inconclusive'; witness?: TestCase<Rec> } {
    // Base case: all quantifiers bound, evaluate property
    if (quantifierIndex >= quantifiers.length) {
      let testsRun = getTestsRun()
      let skipped = getSkipped()
      testsRun++
      setTestsRun(testsRun)

      // Apply given predicates to get derived values
      const fullTestCase = this.#applyGivens(testCase, givenNodes)

      // Execute when predicates (side effects)
      this.#executeWhens(fullTestCase, whenNodes)

      // Evaluate property
      try {
        const result = this.#evaluateProperty(fullTestCase, thenNodes, property)
        return result
          ? { status: 'all_passed', witness: {...testCase} }
          : { status: 'some_failed' }
      } catch (e) {
        if (this.#isPreconditionFailure(e)) {
          skipped++
          setSkipped(skipped)
          return { status: 'inconclusive' }
        }
        throw e
      }
    }

    const quantifier = quantifiers[quantifierIndex]!
    const quantifierSamples = samples.get(quantifier.name) ?? []
    const isExists = quantifier.type === 'exists'

    if (isExists) {
      // Nested exists: need to find ONE value where inner checks pass
      for (const sample of quantifierSamples) {
        const newTestCase = {
          ...testCase,
          [quantifier.name]: sample
        } as TestCase<Rec>

        const result = this.#checkAllForThisExists(
          quantifierIndex + 1, newTestCase, quantifiers, samples,
          givenNodes, whenNodes, thenNodes, property, budget, startTime,
          getTestsRun, setTestsRun, getSkipped, setSkipped
        )

        if (result.status === 'all_passed' && result.witness) {
          // Found a nested witness - return with the full witness including this level
          return { status: 'all_passed', witness: result.witness }
        }

        // Check budget
        if (getTestsRun() >= budget.maxTests) return { status: 'inconclusive' }
        if (budget.maxTime !== undefined && Date.now() - startTime > budget.maxTime) {
          return { status: 'inconclusive' }
        }
      }
      return { status: 'some_failed' }
    } else {
      // Forall: ALL values must pass
      for (const sample of quantifierSamples) {
        const newTestCase = {
          ...testCase,
          [quantifier.name]: sample
        } as TestCase<Rec>

        const result = this.#checkAllForThisExists(
          quantifierIndex + 1, newTestCase, quantifiers, samples,
          givenNodes, whenNodes, thenNodes, property, budget, startTime,
          getTestsRun, setTestsRun, getSkipped, setSkipped
        )

        if (result.status === 'some_failed') {
          return { status: 'some_failed' }
        }

        // Check budget
        if (getTestsRun() >= budget.maxTests) return { status: 'inconclusive' }
        if (budget.maxTime !== undefined && Date.now() - startTime > budget.maxTime) {
          return { status: 'inconclusive' }
        }
      }
      // All forall values passed - return the last successful witness if any
      return { status: 'all_passed', witness: {...testCase} }
    }
  }

  /**
   * Generate samples for each quantifier.
   */
  #generateSamples(
    quantifiers: readonly QuantifierNode[],
    sampler: Sampler,
    maxTests: number
  ): Map<string, FluentPick<unknown>[]> {
    const samples = new Map<string, FluentPick<unknown>[]>()

    for (const q of quantifiers) {
      // Calculate how many samples to generate for each quantifier
      // For nested loops, we want enough samples but not too many
      const sampleCount = Math.min(maxTests, Math.ceil(Math.sqrt(maxTests) * 2))
      samples.set(q.name, sampler.sample(q.arbitrary, sampleCount))
    }

    return samples
  }

  /**
   * Apply given predicates to compute derived values.
   */
  #applyGivens(testCase: TestCase<Rec>, givenNodes: GivenNode<Rec>[]): Rec {
    // Convert FluentPick test case to plain values
    const values: Record<string, unknown> = {}
    for (const [key, pick] of Object.entries(testCase)) {
      values[key] = (pick as FluentPick<unknown>).value
    }

    // Apply given predicates
    for (const given of givenNodes) {
      if (given.isFactory) {
        const factory = given.predicate as (args: Rec) => unknown
        values[given.name] = factory(values as Rec)
      } else {
        values[given.name] = given.predicate
      }
    }

    return values as Rec
  }

  /**
   * Execute when predicates (side effects).
   */
  #executeWhens(testCase: Rec, whenNodes: WhenNode<Rec>[]): void {
    for (const when of whenNodes) {
      when.predicate(testCase)
    }
  }

  /**
   * Evaluate the property using then nodes.
   */
  #evaluateProperty(
    testCase: Rec,
    thenNodes: ThenNode<Rec>[],
    property: (testCase: Rec) => boolean
  ): boolean {
    // If there are then nodes, use them
    for (const then of thenNodes) {
      if (!then.predicate(testCase)) {
        return false
      }
    }

    // Also evaluate the passed-in property function
    return property(testCase)
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
}

/**
 * Creates a default NestedLoopExplorer instance.
 */
export function createNestedLoopExplorer<Rec extends {}>(): Explorer<Rec> {
  return new NestedLoopExplorer<Rec>()
}
