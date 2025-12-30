import type {FluentPick} from '../../arbitraries/index.js'
import type {QuantifierNode} from '../../Scenario.js'
import type {ExecutableQuantifier} from '../../ExecutableScenario.js'
import type {BoundTestCase} from '../types.js'
import {AbstractExplorer, type Explorer} from './AbstractExplorer.js'
import type {
  TraversalOutcome,
  TraverseNext,
  QuantifierFrame,
  QuantifierSemantics
} from './types/TraversalContext.js'

/**
 * Nested loop explorer implementing the traditional property testing approach.
 */
export class NestedLoopExplorer<Rec extends {}> extends AbstractExplorer<Rec> {
  protected quantifierSemantics(): QuantifierSemantics<Rec> {
    return new NestedLoopSemantics<Rec>()
  }
}

class NestedLoopSemantics<Rec extends {}> implements QuantifierSemantics<Rec> {
  exists(frame: QuantifierFrame<Rec>, next: TraverseNext<Rec>): TraversalOutcome<Rec> {
    let sawBudgetLimit = false

    const result = this.forEachSample(frame, next, (outcome, testCase) => {
      if (outcome.kind === 'pass') {
        return frame.ctx.outcomes.pass(outcome.witness ?? testCase)
      }
      if (outcome.kind === 'inconclusive' && outcome.budgetExceeded) {
        sawBudgetLimit = true
        return 'break'
      }
      return 'continue'
    })

    if (result !== 'break' && result !== 'continue') return result
    return frame.ctx.outcomes.inconclusive(sawBudgetLimit)
  }

  forall(frame: QuantifierFrame<Rec>, next: TraverseNext<Rec>): TraversalOutcome<Rec> {
    let sawBudgetLimit = false
    let allPassed = true
    let lastWitness: BoundTestCase<Rec> | undefined
    const hasInnerExists = this.hasInnerExistential(frame.ctx.quantifiers, frame.index + 1)

    const result = this.forEachSample(frame, next, (outcome, testCase) => {
      if (outcome.kind === 'fail') {
        return frame.ctx.outcomes.fail(outcome.counterexample)
      }
      if (outcome.kind === 'pass') {
        if (outcome.witness !== undefined) lastWitness = outcome.witness
        return 'continue'
      }
      if (outcome.budgetExceeded) {
        sawBudgetLimit = true
        allPassed = false
        return 'break'
      }
      if (hasInnerExists) {
        return frame.ctx.outcomes.fail(testCase)
      }
      allPassed = false
      return 'continue'
    })

    if (result !== 'break' && result !== 'continue') return result

    if (allPassed && this.samplesFor(frame).length > 0) {
      return frame.ctx.outcomes.pass(lastWitness)
    }

    return frame.ctx.outcomes.inconclusive(sawBudgetLimit)
  }

  private forEachSample(
    frame: QuantifierFrame<Rec>,
    next: TraverseNext<Rec>,
    visitor: (
      outcome: TraversalOutcome<Rec>,
      testCase: BoundTestCase<Rec>
    ) => TraversalOutcome<Rec> | 'continue' | 'break'
  ): TraversalOutcome<Rec> | 'break' | 'continue' {
    const samples = this.samplesFor(frame)
    for (const sample of samples) {
      this.trackSampleStatistics(frame, sample)
      const newTestCase = this.bindSample(frame, sample)
      const outcome = next(frame.index + 1, newTestCase, frame.ctx)
      const result = visitor(outcome, newTestCase)
      if (result !== 'continue') return result
    }
    return 'continue'
  }

  private samplesFor(frame: QuantifierFrame<Rec>): readonly FluentPick<unknown>[] {
    return frame.ctx.samples.get(frame.quantifier.name) ?? []
  }

  private bindSample(
    frame: QuantifierFrame<Rec>,
    sample: FluentPick<unknown>
  ): BoundTestCase<Rec> {
    return {...frame.testCase, [frame.quantifier.name]: sample}
  }

  private hasInnerExistential(quantifiers: readonly ExecutableQuantifier[], startIndex: number) {
    return quantifiers.slice(startIndex).some(q => q.type === 'exists')
  }

  /**
   * Track statistics for a sample value.
   * This helper method eliminates code duplication between exists() and forall().
   */
  private trackSampleStatistics(
    frame: QuantifierFrame<Rec>,
    sample: FluentPick<unknown>
  ): void {
    if (frame.ctx.statisticsContext === undefined || frame.ctx.detailedStatisticsEnabled !== true) {
      return
    }

    const collector = frame.ctx.statisticsContext.getCollector(frame.quantifier.name)

    // Get arbitrary from scenario nodes (for corner cases).
    // Note: ExecutableQuantifier doesn't contain the original Arbitrary, so we must
    // look it up from the nodes array. The quantifier should always exist in nodes
    // since ExecutableScenario is created from Scenario which includes quantifier nodes.
    const quantifierNode = frame.ctx.executableScenario.nodes.find(
      (n): n is QuantifierNode =>
        (n.type === 'forall' || n.type === 'exists') && n.name === frame.quantifier.name
    )

    if (quantifierNode !== undefined) {
      collector.recordSample(sample.value, quantifierNode.arbitrary)
    } else {
      // Fallback: record sample without corner case checking.
      // This should be rare - only if quantifier node is missing from nodes array.
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

/**
 * Creates a default NestedLoopExplorer instance.
 */
export function createNestedLoopExplorer<Rec extends {}>(): Explorer<Rec> {
  return new NestedLoopExplorer<Rec>()
}
