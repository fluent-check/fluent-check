import type {BoundTestCase} from '../../types.js'
import type {TraversalOutcome} from '../types/TraversalContext.js'

/**
 * Builder for traversal outcomes.
 */
export class TraversalOutcomeBuilder<Rec extends {}> {
  pass(witness?: BoundTestCase<Rec>): TraversalOutcome<Rec> {
    return witness !== undefined ? {kind: 'pass', witness} : {kind: 'pass'}
  }

  fail(counterexample: BoundTestCase<Rec>): TraversalOutcome<Rec> {
    return {kind: 'fail', counterexample}
  }

  inconclusive(budgetExceeded: boolean): TraversalOutcome<Rec> {
    return {kind: 'inconclusive', budgetExceeded}
  }
}
