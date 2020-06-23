import { FluentPick } from './types'
import { mapArbitrarySize } from './util'
import { Arbitrary } from './internal'
import * as fc from './index'
import { IndexedPicker, Picker } from './Picker'

export class ArbitraryArray<A> extends Arbitrary<A[]> {
  constructor(public arbitrary: Arbitrary<A>, public min = 0, public max = 10) {
    super()
  }

  size() {
    // https://en.wikipedia.org/wiki/Geometric_progression#Geometric_series
    const sizeUpTo = (v: number, max: number) => {
      return v === 1 ? max + 1 : (1 - v ** (max + 1)) / (1 - v)
    }
    return mapArbitrarySize(this.arbitrary.size(), v => ({
      type: 'exact',
      value: sizeUpTo(v, this.max) - sizeUpTo(v, this.min - 1)
    }))
  }

  picker(): Picker<A[]> {
    const basePicker = this.arbitrary.picker()
    const sequencePicks = (picks: FluentPick<A>[]): FluentPick<A[]> => {
      const value = picks.map(v => v.value)
      const original = picks.map(v => v.original)
      return {
        value,
        original: original.every(o => o === undefined) ? value : original
      }
    }

    // TODO: use weighted sampling in IndexedPicker
    if (basePicker instanceof IndexedPicker) {
      return new IndexedPicker(this.size().value, idx => {
        let curr = this.size().value, sz = this.max + 1
        while (idx < curr) {
          sz--
          curr -= basePicker.size ** sz
        }
        const res: FluentPick<A>[] = []
        for (let i = 0; i < sz; i++) {
          res.push(basePicker.pickWithIndex(idx % basePicker.size))
          idx = Math.floor(idx / basePicker.size)
        }
        return sequencePicks(res)
      })
    } else {
      return new Picker(() => {
        const size = Math.floor(Math.random() * (this.max - this.min + 1)) + this.min
        return sequencePicks(this.arbitrary.sampleWithBias(size))
      })
    }
  }

  shrink(initial: FluentPick<A[]>): Arbitrary<A[]> {
    if (this.min === initial.value.length) return fc.empty()

    const start = this.min
    const middle = Math.floor((this.min + initial.value.length) / 2)
    const end = initial.value.length - 1

    return fc.union(fc.array(this.arbitrary, start, middle), fc.array(this.arbitrary, middle + 1, end))
  }

  canGenerate(pick: FluentPick<A[]>) {
    return pick.value.length >= this.min && pick.value.length <= this.max &&
           pick.value.every((v, i) => this.arbitrary.canGenerate({ value: v, original: pick.original[i] }))
  }

  cornerCases(): FluentPick<A[]>[] {
    return this.arbitrary.cornerCases().flatMap(cc => [
      { value: Array(this.min).fill(cc.value), original: Array(this.min).fill(cc.original) },
      { value: Array(this.max).fill(cc.value), original: Array(this.max).fill(cc.original) }
    ]).filter(v => v !== undefined) as FluentPick<A[]>[]
  }
}
