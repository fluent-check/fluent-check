import { ArbitraryComposite, BaseArbitrary, NoArbitrary } from './internal'
import { FluentPick } from './types'

export class ArbitraryArray<A> extends BaseArbitrary<A[]> {
  constructor(public arbitrary: BaseArbitrary<A>, public min = 0, public max = 10) {
    super()
  }

  size() {
    return this.arbitrary.mapArbitrarySize(v => ({ value: v ** (this.max - this.min), type: 'exact' }))
  }

  pick(): FluentPick<A[]> | undefined {
    const size = Math.floor(Math.random() * (this.max - this.min + 1)) + this.min
    const fpa = this.arbitrary.sampleWithBias(size)

    const value = fpa.map(v => v.value)
    const original = fpa.map(v => v.original)

    return {
      value,
      original: original.every(o => o === undefined) ? value : original
    }
  }

  shrink(initial: FluentPick<A[]>): BaseArbitrary<A[]> {
    if (this.min === initial.value.length) return NoArbitrary

    return new ArbitraryComposite([
      new ArbitraryArray(this.arbitrary, this.min, Math.floor((this.min + initial.value.length) / 2)),
      new ArbitraryArray(this.arbitrary, Math.floor((this.min + initial.value.length) / 2) + 1, initial.value.length - 1)
    ])
  }

  canGenerate(pick: FluentPick<A[]>) {
    return pick.value.length >= this.min && pick.value.length <= this.max &&
      pick.value.every((v, i) => this.arbitrary.canGenerate({ value: v, original: pick.original[i] }))
  }
}
