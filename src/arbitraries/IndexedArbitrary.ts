import { Arbitrary, FluentPick } from './types'

// TODO(rui): I don't know what's the best way to represent this :( most primitives are indexed,
// but we likely want to have filtered/mapped/wrapped types "implement" this based on the
// underlying arbitrary
export interface IndexedArbitrary<A> extends Arbitrary<A> {
  pickWithIndex(idx: number): FluentPick<A>
}

export function isIndexedArbitrary<A>(arb: Arbitrary<A>): arb is IndexedArbitrary<A> {
  return 'pickWithIndex' in arb
}
