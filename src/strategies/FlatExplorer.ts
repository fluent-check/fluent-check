/* eslint-disable @typescript-eslint/strict-boolean-expressions */

import {type FluentPick} from '../arbitraries/index.js'
import {
  AbstractExplorer,
  type BoundTestCase,
  type Explorer
} from './Explorer.js'
import type {ExecutableQuantifier} from '../ExecutableScenario.js'
import type {Sampler} from './Sampler.js'
import type {QuantifierNode} from '../Scenario.js'

type TraversalOutcome =
  | {kind: 'pass'; witness?: unknown}
  | {kind: 'fail'; counterexample: unknown}
  | {kind: 'inconclusive'; budgetExceeded: boolean}

/**
 * FlatExplorer implements a pure random sampling strategy.
 * Unlike NestedLoopExplorer, it does not partition the sample budget across depths.
 * Instead, it generates N independent samples for each quantifier and combines them
 * effectively testing N random tuples.
 *
 * This prevents the "sample budget collapse" (N^(1/d)) in deep scenarios.
 */
export class FlatExplorer<Rec extends {}> extends AbstractExplorer<Rec> {
  // Map to track the current iteration index for the active traversal
  private indices = new Map<object, number>()

  protected override generateSamples(
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

    // CRITICAL FIX: Generate maxTests for EVERY quantifier
    // This ensures effective sample size remains constant (N) regardless of depth
    for (const q of quantifiers) {
      const quantifierSamples = q.sample(sampler, maxTests)
      samples.set(q.name, quantifierSamples)
    }

    return samples
  }

  protected quantifierSemantics() {
    return {
      exists: (frame: any, next: any) => {
        // Exists behaves like ForAll in Flat mode - it just consumes the stream
        // If we find a witness, we pass. If we run out, we fail (exhausted).
        // For mixed quantifiers, this simple "zip" approach implies we assume
        // independence between quantifiers.
        return this.handleQuantifier(frame, next, 'exists')
      },
      forall: (frame: any, next: any) => {
        return this.handleQuantifier(frame, next, 'forall')
      }
    }
  }

  private handleQuantifier(
    frame: any,
    next: any,
    type: 'forall' | 'exists'
  ): any {
    const {index, quantifier, ctx} = frame
    const samples = ctx.samples.get(quantifier.name) ?? []

    // If we are the root quantifier (index 0), we drive the loop
    if (index === 0) {
      let sawBudgetLimit = false
      let allPassed = true
      let witness: BoundTestCase<Rec> | undefined

      // Driver loop
      for (let i = 0; i < samples.length; i++) {
        // Publish current index for children to use
        this.indices.set(ctx, i)

        const sample = samples[i]
        this.trackSampleStatistics(frame, sample)
        const newTestCase = {...frame.testCase, [quantifier.name]: sample}

        // Check budget before proceeding
        // Note: ensureBudget is called in traverse, but we check here for the loop break
        if (ctx.state.budgetExceeded === true) {
          sawBudgetLimit = true
          allPassed = false // Interpretation depends on type
          break
        }

        const outcome = next(index + 1, newTestCase, ctx) as TraversalOutcome

        if (type === 'forall') {
          if (outcome.kind === 'fail') return ctx.outcomes.fail(outcome.counterexample as BoundTestCase<Rec>)
          if (outcome.kind === 'inconclusive' && outcome.budgetExceeded === true) {
            sawBudgetLimit = true
            allPassed = false // Technically unknown, but we stop
            break
          }
          if (outcome.kind === 'pass' && outcome.witness) {
            witness = outcome.witness as BoundTestCase<Rec>
          }
        } else { // exists
          if (outcome.kind === 'pass') return ctx.outcomes.pass((outcome.witness as BoundTestCase<Rec>) ?? newTestCase)
          if (outcome.kind === 'inconclusive' && outcome.budgetExceeded === true) {
            sawBudgetLimit = true
            break
          }
        }
      }

      // Cleanup
      this.indices.delete(ctx)

      if (sawBudgetLimit) return ctx.outcomes.inconclusive(true)

      if (type === 'forall') {
        // If we processed samples and none failed, we pass
        return samples.length > 0 && allPassed
          ? ctx.outcomes.pass(witness)
          : ctx.outcomes.inconclusive(false)
      } else {
        // If we processed samples and none passed, we exhaust
        return ctx.outcomes.inconclusive(false)
      }
    } else {
      // Child quantifiers: simply pick the sample at the current index
      // This implements the "Zip" logic: (q0[i], q1[i], q2[i]...)
      const idx = this.indices.get(ctx) ?? 0

      // Safety check: if samples lengths differ (shouldn't happen with fixed maxTests), wrap or clamp
      if (idx >= samples.length) {
        // Should not happen if generateSamples works correctly
        return ctx.outcomes.inconclusive(false)
      }

      const sample = samples[idx]
      this.trackSampleStatistics(frame, sample)
      const newTestCase = {...frame.testCase, [quantifier.name]: sample}

      return next(index + 1, newTestCase, ctx)
    }
  }

  /**
   * Track statistics for a sample value.
   * Duplicated from NestedLoopExplorer for the experiment.
   */
  private trackSampleStatistics(
    frame: any,
    sample: FluentPick<unknown>
  ): void {
    if (frame.ctx.statisticsContext === undefined || frame.ctx.detailedStatisticsEnabled !== true) {
      return
    }

    const collector = frame.ctx.statisticsContext.getCollector(frame.quantifier.name)

    // Get arbitrary from scenario nodes (for corner cases).
    const quantifierNode = frame.ctx.executableScenario.nodes.find(
      (n: any): n is QuantifierNode =>
        (n.type === 'forall' || n.type === 'exists') && n.name === frame.quantifier.name
    )

    if (quantifierNode !== undefined) {
      collector.recordSample(sample.value, quantifierNode.arbitrary)
    } else {
      // Fallback
      collector.recordSample(sample.value, {
        cornerCases: () => [],
        hashCode: () => (a: unknown) => typeof a === 'number' ? a | 0 : 0,
        equals: () => (a: unknown, b: unknown) => a === b
      })
    }

    // Track numeric values for distribution
    if (typeof sample.value === 'number' && Number.isFinite(sample.value)) {
      collector.recordNumericValue(sample.value)
    }

    // Track array/string lengths separately
    if (Array.isArray(sample.value)) {
      collector.recordArrayLength(sample.value.length)
    } else if (typeof sample.value === 'string') {
      collector.recordStringLength(sample.value.length)
    }
  }
}

export function createFlatExplorer<Rec extends {}>(): Explorer<Rec> {
  return new FlatExplorer<Rec>()
}
