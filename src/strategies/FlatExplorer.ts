import {type FluentPick} from '../arbitraries/index.js'
import {
  AbstractExplorer,
  type BoundTestCase,
  type Explorer,
  type QuantifierFrame,
  type QuantifierSemantics,
  type TraversalOutcome,
  type TraverseNext
} from './explorer/index.js'
import type {ExecutableQuantifier} from '../ExecutableScenario.js'
import type {Sampler} from './Sampler.js'

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

  protected quantifierSemantics(): QuantifierSemantics<Rec> {
    return {
      exists: (frame: QuantifierFrame<Rec>, next: TraverseNext<Rec>): TraversalOutcome<Rec> => {
        // Exists behaves like ForAll in Flat mode - it just consumes the stream
        // If we find a witness, we pass. If we run out, we fail (exhausted).
        // For mixed quantifiers, this simple "zip" approach implies we assume
        // independence between quantifiers.
        return this.handleQuantifier(frame, next, 'exists')
      },
      forall: (frame: QuantifierFrame<Rec>, next: TraverseNext<Rec>): TraversalOutcome<Rec> => {
        return this.handleQuantifier(frame, next, 'forall')
      }
    }
  }

  private handleQuantifier(
    frame: QuantifierFrame<Rec>,
    next: TraverseNext<Rec>,
    type: 'forall' | 'exists'
  ): TraversalOutcome<Rec> {
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
        if (sample === undefined) continue
        this.trackSampleStatistics(frame, sample)
        const newTestCase = {...frame.testCase, [quantifier.name]: sample}

        // Check budget before proceeding
        // Note: ensureBudget is called in traverse, but we check here for the loop break
        if (ctx.state.budgetExceeded === true) {
          sawBudgetLimit = true
          allPassed = false // Interpretation depends on type
          break
        }

        const outcome = next(index + 1, newTestCase, ctx)

        if (type === 'forall') {
          if (outcome.kind === 'fail') return ctx.outcomes.fail(outcome.counterexample)
          if (outcome.kind === 'inconclusive' && outcome.budgetExceeded === true) {
            sawBudgetLimit = true
            allPassed = false // Technically unknown, but we stop
            break
          }
          if (outcome.kind === 'pass' && outcome.witness) {
            witness = outcome.witness
          }
        } else { // exists
          if (outcome.kind === 'pass') return ctx.outcomes.pass(outcome.witness ?? newTestCase)
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
      if (sample === undefined) {
        return ctx.outcomes.inconclusive(false)
      }
      this.trackSampleStatistics(frame, sample)
      const newTestCase = {...frame.testCase, [quantifier.name]: sample}

      return next(index + 1, newTestCase, ctx)
    }
  }
}

export function createFlatExplorer<Rec extends {}>(): Explorer<Rec> {
  return new FlatExplorer<Rec>()
}
