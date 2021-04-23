import {FluentPick} from './types'
import {Arbitrary} from './internal'

export class WrappedArbitrary<A> extends Arbitrary<A> {
  constructor(public readonly baseArbitrary: NonNullable<Arbitrary<A>>) {
    super()
  }

  pick(generator: () => number) { return this.baseArbitrary.pick(generator) }
  size() { return this.baseArbitrary.size() }
  cornerCases() { return this.baseArbitrary.cornerCases() }

  canGenerate(pick: FluentPick<A>) {
    return this.baseArbitrary.canGenerate(pick)
  }

  mutate(pick: FluentPick<A>, generator: () => number, maxNumMutations: number): FluentPick<A>[] {
    return this.baseArbitrary.mutate(pick, generator, maxNumMutations)
  }

  toString(depth = 0) {
    return ' '.repeat(depth * 2) +
      'Wrapped Arbitrary:\n' + this.baseArbitrary.toString(depth + 1)
  }
}
