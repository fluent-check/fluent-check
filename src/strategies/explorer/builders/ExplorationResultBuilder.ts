import type {BoundTestCase} from '../../types.js'
import type {ExplorationState} from '../types/ExplorationState.js'
import type {ExplorationPassed, ExplorationFailed, ExplorationExhausted} from '../types/ExplorationResult.js'

/**
 * Builder for exploration results.
 */
export class ExplorationResultBuilder<Rec extends {}> {
  constructor(private readonly state: ExplorationState) {}

  private labelsToRecord(): Record<string, number> | undefined {
    if (this.state.labels.size === 0) {
      return undefined
    }
    return Object.fromEntries(this.state.labels)
  }

  passed(witness?: BoundTestCase<Rec>): ExplorationPassed<Rec> {
    const labels = this.labelsToRecord()
    return witness !== undefined
      ? {
        outcome: 'passed',
        testsRun: this.state.testsRun,
        skipped: this.state.skipped,
        witness,
        ...(labels !== undefined && {labels})
      }
      : {
        outcome: 'passed',
        testsRun: this.state.testsRun,
        skipped: this.state.skipped,
        ...(labels !== undefined && {labels})
      }
  }

  failed(counterexample: BoundTestCase<Rec>): ExplorationFailed<Rec> {
    const labels = this.labelsToRecord()
    return {
      outcome: 'failed',
      counterexample,
      testsRun: this.state.testsRun,
      skipped: this.state.skipped,
      ...(labels !== undefined && {labels})
    }
  }

  exhausted(): ExplorationExhausted {
    const labels = this.labelsToRecord()
    return {
      outcome: 'exhausted',
      testsRun: this.state.testsRun,
      skipped: this.state.skipped,
      ...(labels !== undefined && {labels})
    }
  }
}
