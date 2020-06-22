import { ArbitrarySize, FluentPick } from './types'
import { ArbitraryComposite, BaseArbitrary, NoArbitrary } from './internal'
import { HybridSampling, Sampling } from './Sampler'

export class ArbitraryInteger extends BaseArbitrary<number> {
  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super()
    this.min = min
    this.max = max
  }

  protected sampler: Sampling<number> = new HybridSampling(
    this.size().value,
    () => this.pick(),
    idx => ({ value: this.min + idx })
  )

  size(): ArbitrarySize { return { value: this.max - this.min + 1, type: 'exact' } }

  pick() { return { value: Math.floor(Math.random() * (this.max - this.min + 1)) + this.min } }

  pickWithIndex(idx: number): FluentPick<number> {
    return { value: this.min + idx }
  }

  cornerCases() {
    return (this.min < 0 && this.max > 0) ?
      [{ value: 0 }, { value: this.min }, { value: this.max }] :
      [{ value: this.min }, { value: this.max }]
  }

  shrink(initial: FluentPick<number>): BaseArbitrary<number> {
    if (initial.value > 0) {
      const lower = Math.max(0, this.min)
      const upper = Math.max(lower, initial.value! - 1)
      const midpoint = Math.floor((upper + lower) / 2)

      if (lower === upper) return NoArbitrary

      return new ArbitraryComposite([new ArbitraryInteger(lower, midpoint - 1), new ArbitraryInteger(midpoint, upper)])
    } else if (initial.value! < 0) {
      const upper = Math.min(0, this.max)
      const lower = Math.min(upper, initial.value! + 1)
      const midpoint = Math.ceil((upper + lower) / 2)

      if (lower === upper) return NoArbitrary

      return new ArbitraryComposite([new ArbitraryInteger(midpoint, upper), new ArbitraryInteger(lower, midpoint - 1)])
    }

    return NoArbitrary
  }

  canGenerate(pick: FluentPick<number>) {
    return pick.value >= this.min && pick.value <= this.max
  }
}
