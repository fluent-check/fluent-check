import type {FluentPick} from '../arbitraries/index.js'
import type {Scenario, ScenarioNode} from '../Scenario.js'
import {createExecutableScenario} from '../ExecutableScenario.js'
import type {ExecutableScenario, ExecutableQuantifier} from '../ExecutableScenario.js'
import {PreconditionFailure} from '../FluentCheck.js'
import type {Sampler} from './Sampler.js'
import type {BoundTestCase} from './types.js'

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
  readonly witness?: BoundTestCase<Rec>
}

/**
 * A counterexample was found.
 */
export interface ExplorationFailed<Rec extends {}> {
  readonly outcome: 'failed'
  readonly counterexample: BoundTestCase<Rec>
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
  explore(
    scenario: ExecutableScenario<Rec> | Scenario<Rec>,
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
    scenario: ExecutableScenario<Rec> | Scenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ExplorationBudget
  ): ExplorationResult<Rec> {
    const executableScenario = this.#toExecutableScenario(scenario)

    // Extract quantifiers and all nodes from scenario
    const quantifiers = executableScenario.quantifiers
    const allNodes = executableScenario.nodes

    // Generate samples for each quantifier upfront
    const samples = this.#generateSamples(quantifiers, sampler, budget.maxTests)

    // Track exploration state
    let testsRun = 0
    let skipped = 0
    const startTime = Date.now()
    const hasExistential = executableScenario.hasExistential
    let budgetExceeded = false

    // Recursive exploration function
    // Returns:
    // - 'passed': all inner checks succeeded (forall satisfied, or exists found witness at leaf)
    // - 'failed' with counterexample: a forall failed
    // - null: inconclusive, continue searching
    const exploreQuantifier = (
      quantifierIndex: number,
      testCase: BoundTestCase<Rec>
    ): ExplorationResult<Rec> | null => {
      // Check budget limits
      if (testsRun >= budget.maxTests) {
        budgetExceeded = true
        return null // Budget exhausted, let caller handle
      }
      if (budget.maxTime !== undefined && Date.now() - startTime > budget.maxTime) {
        budgetExceeded = true
        return null // Time budget exceeded
      }

      // Base case: all quantifiers bound, evaluate property
      if (quantifierIndex >= quantifiers.length) {
        testsRun++

        // Process all nodes in order, interleaving given, when, and then
        try {
          const result = this.#processNodesInOrder(testCase, allNodes, property)

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
      const quantifier = quantifiers[quantifierIndex]
      if (quantifier === undefined) {
        return null
      }
      const quantifierSamples = samples.get(quantifier.name) ?? []
      const isExists = quantifier.type === 'exists'

      if (isExists) {
        // EXISTENTIAL: need to find ONE value where all inner checks pass
        for (const sample of quantifierSamples) {
          const newTestCase = {
            ...testCase,
            [quantifier.name]: sample
          } as BoundTestCase<Rec>

          // Check ALL inner quantifiers for this existential value
          const checkResult = this.#checkAllForThisExists(
            quantifierIndex + 1,
            newTestCase,
            quantifiers,
            samples,
            allNodes,
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
          if (checkResult.status === 'inconclusive') {
            budgetExceeded = true
            break
          }
          // result === 'some_failed' - try next existential value
        }

        // Exhausted all existential values without finding a witness
        return null
      } else {
        // UNIVERSAL: need ALL values to pass, fail on first counterexample
        let allPassed = true
        let lastWitness: BoundTestCase<Rec> | undefined

        for (const sample of quantifierSamples) {
          const newTestCase = {
            ...testCase,
            [quantifier.name]: sample
          } as BoundTestCase<Rec>

          // Recurse to next quantifier
          const result = exploreQuantifier(quantifierIndex + 1, newTestCase)

          if (result !== null) {
            if (result.outcome === 'failed') {
              // Found a counterexample - fail immediately
              return result
            }
            // result.outcome === 'passed' or 'exhausted' - for passed, update witness
            if (result.outcome === 'passed' && result.witness !== undefined) {
              lastWitness = result.witness
            }
          } else {
            // null result from inner exploration means:
            // - If inner had exists: couldn't find witness for this forall value
            //   This is a failure for forall.exists patterns
            // - If inner was forall-only: inconclusive (budget exhausted)
            // Check if there's an inner exists that couldn't be satisfied
            const hasInnerExists = quantifiers.slice(quantifierIndex + 1).some(q => q.type === 'exists')
            if (hasInnerExists) {
              // For forall.exists, null means no witness found for this a
              // This is a counterexample
              return {
                outcome: 'failed',
                counterexample: newTestCase,
                testsRun,
                skipped
              }
            }
            // For forall-only nested in forall, null is inconclusive
            allPassed = false
          }

          if (budgetExceeded) {
            allPassed = false
            break
          }
        }

        // If all forall samples passed with witnesses, return passed
        if (allPassed && quantifierSamples.length > 0) {
          if (lastWitness !== undefined) {
            return {
              outcome: 'passed' as const,
              testsRun,
              skipped,
              witness: lastWitness
            }
          }

          return {
            outcome: 'passed' as const,
            testsRun,
            skipped
          }
        }

        // Otherwise inconclusive
        return null
      }
    }

    // Start exploration
    const result = exploreQuantifier(0, {} as BoundTestCase<Rec>)

    if (result !== null) {
      return result
    }

    // No definitive result found (budget/time exhausted or no witness for exists)
    if (budgetExceeded || hasExistential) {
      return {
        outcome: 'exhausted',
        testsRun,
        skipped
      }
    }

    // For forall-only scenarios where we didn't hit budget/time limits, treat as passed
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
    testCase: BoundTestCase<Rec>,
    quantifiers: readonly ExecutableQuantifier[],
    samples: Map<string, FluentPick<unknown>[]>,
    allNodes: readonly ScenarioNode<Rec>[],
    property: (testCase: Rec) => boolean,
    budget: ExplorationBudget,
    startTime: number,
    getTestsRun: () => number,
    setTestsRun: (n: number) => void,
    getSkipped: () => number,
    setSkipped: (n: number) => void
  ): { status: 'all_passed' | 'some_failed' | 'inconclusive'; witness?: BoundTestCase<Rec> } {
    // Base case: all quantifiers bound, evaluate property
    if (quantifierIndex >= quantifiers.length) {
      let testsRun = getTestsRun()
      let skipped = getSkipped()
      testsRun++
      setTestsRun(testsRun)

      // Process all nodes in order, interleaving given, when, and then
      try {
        const result = this.#processNodesInOrder(testCase, allNodes, property)
        return result
          ? {status: 'all_passed', witness: {...testCase}}
          : {status: 'some_failed'}
      } catch (e) {
        if (this.#isPreconditionFailure(e)) {
          skipped++
          setSkipped(skipped)
          return {status: 'inconclusive'}
        }
        throw e
      }
    }

    const quantifier = quantifiers[quantifierIndex]
    if (quantifier === undefined) {
      return {status: 'inconclusive'}
    }
    const quantifierSamples = samples.get(quantifier.name) ?? []
    const isExists = quantifier.type === 'exists'

    if (isExists) {
      // Nested exists: need to find ONE value where inner checks pass
      for (const sample of quantifierSamples) {
        const newTestCase = {
          ...testCase,
          [quantifier.name]: sample
        } as BoundTestCase<Rec>

        const result = this.#checkAllForThisExists(
          quantifierIndex + 1, newTestCase, quantifiers, samples,
          allNodes, property, budget, startTime,
          getTestsRun, setTestsRun, getSkipped, setSkipped
        )

        if (result.status === 'all_passed' && result.witness !== undefined) {
          // Found a nested witness - return with the full witness including this level
          return {status: 'all_passed', witness: result.witness}
        }

        // Check budget
        if (getTestsRun() >= budget.maxTests) return {status: 'inconclusive'}
        if (budget.maxTime !== undefined && Date.now() - startTime > budget.maxTime) {
          return {status: 'inconclusive'}
        }
      }
      return {status: 'some_failed'}
    } else {
      // Forall: ALL values must pass
      for (const sample of quantifierSamples) {
        const newTestCase = {
          ...testCase,
          [quantifier.name]: sample
        } as BoundTestCase<Rec>

        const result = this.#checkAllForThisExists(
          quantifierIndex + 1, newTestCase, quantifiers, samples,
          allNodes, property, budget, startTime,
          getTestsRun, setTestsRun, getSkipped, setSkipped
        )

        if (result.status === 'some_failed') {
          return {status: 'some_failed'}
        }

        // Check budget
        if (getTestsRun() >= budget.maxTests) return {status: 'inconclusive'}
        if (budget.maxTime !== undefined && Date.now() - startTime > budget.maxTime) {
          return {status: 'inconclusive'}
        }
      }
      // All forall values passed - return the last successful witness if any
      return {status: 'all_passed', witness: {...testCase}}
    }
  }

  /**
   * Generate samples for each quantifier.
   */
  #generateSamples(
    quantifiers: readonly ExecutableQuantifier[],
    sampler: Sampler,
    maxTests: number
  ): Map<string, FluentPick<unknown>[]> {
    const samples = new Map<string, FluentPick<unknown>[]>()

    if (maxTests <= 0) {
      for (const q of quantifiers) {
        samples.set(q.name, [])
      }
      return samples
    }

    const perQuantifier = Math.max(
      1,
      Math.floor(Math.pow(maxTests, 1 / Math.max(quantifiers.length, 1)))
    )

    for (const q of quantifiers) {
      samples.set(q.name, q.sample(sampler, perQuantifier))
    }

    return samples
  }

  #toExecutableScenario(scenario: ExecutableScenario<Rec> | Scenario<Rec>): ExecutableScenario<Rec> {
    const q = scenario.quantifiers[0] as ExecutableQuantifier | undefined
    if (q !== undefined && typeof q.sample === 'function' && typeof q.shrink === 'function') {
      return scenario as ExecutableScenario<Rec>
    }
    return createExecutableScenario(scenario as Scenario<Rec>)
  }

  /**
   * Process all non-quantifier nodes in order, interleaving given, when, and then nodes.
   * This preserves the original ordering from the FluentCheck chain.
   *
   * @returns true if all assertions pass, false if any assertion fails
   */
  #processNodesInOrder(
    testCase: BoundTestCase<Rec>,
    allNodes: readonly ScenarioNode<Rec>[],
    property: (testCase: Rec) => boolean
  ): boolean {
    // Convert FluentPick test case to plain values
    const values: Record<string, unknown> = {}
    for (const [key, pick] of Object.entries(testCase)) {
      values[key] = (pick as FluentPick<unknown>).value
    }

    // Track if we have any then nodes in the scenario
    let hasThenNodes = false

    // Process nodes in order
    for (const node of allNodes) {
      switch (node.type) {
        case 'given': {
          const given = node
          if (given.isFactory) {
            const factory = given.predicate as (args: Rec) => unknown
            values[given.name] = factory(values as Rec)
          } else {
            values[given.name] = given.predicate
          }
          break
        }
        case 'when': {
          const when = node
          when.predicate(values as Rec)
          break
        }
        case 'then': {
          hasThenNodes = true
          const then = node
          if (!then.predicate(values as Rec)) {
            return false
          }
          break
        }
        // Skip quantifier nodes - they're handled separately
        case 'forall':
        case 'exists':
          break
      }
    }

    // Only evaluate the passed-in property function if there were no then nodes
    // (the property function duplicates the then node evaluation)
    if (!hasThenNodes) {
      return property(values as Rec)
    }

    return true
  }

  /**
   * Check if an error is a PreconditionFailure.
   */
  #isPreconditionFailure(e: unknown): e is PreconditionFailure {
    return e instanceof PreconditionFailure
  }
}

/**
 * Creates a default NestedLoopExplorer instance.
 */
export function createNestedLoopExplorer<Rec extends {}>(): Explorer<Rec> {
  return new NestedLoopExplorer<Rec>()
}

export type {BoundTestCase} from './types.js'
