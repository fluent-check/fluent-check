import {FluentPick, ArbitrarySize} from './types'
import {Arbitrary} from './internal'
import {factorial} from '../statistics'
import * as fc from './index'

export class ArbitrarySet<A> extends Arbitrary<A[]> {
  readonly max: number

  constructor(public readonly elements: A[], public readonly min = 0, max = 10) {
    super()
    this.max = Math.min(max, elements.length)
  }

  size(): ArbitrarySize {
    const comb = (n: number, s: number) => { return factorial (n) / (factorial(s) * factorial(n - s)) }

    let size = 0
    for (let i = this.min; i <= this.max; i++) size += comb(this.elements.length, i)

    return {value: size, type: 'exact', credibleInterval: [size, size]}
  }

  pick(generator: () => number): FluentPick<A[]> | undefined {
    const size = Math.floor(generator() * (this.max - this.min + 1)) + this.min
    const pick = new Set<A>()
    const pick_o = new Set<number>()

    while (pick.size !== size) {
      const idx = Math.floor(generator() * this.elements.length)
      pick.add(this.elements[idx])
      pick_o.add(idx)
    }

    const value = Array.from(pick).sort()
    const original = Array.from(pick_o).sort()

    return {value, original}
  }

  calculateIndex(pick: FluentPick<any>) {
    let index = 0
    pick.original.forEach(o => {
      index += 2 ** o
    })
    return index
  }

  graphIs1D(): boolean { return false }

  shrink(initial: FluentPick<A[]>): Arbitrary<A[]> {
    if (this.min === initial.value.length) return fc.empty()

    const start = this.min
    const middle = Math.floor((this.min + initial.value.length) / 2)
    const end = initial.value.length - 1

    return fc.union(fc.set(this.elements, start, middle), fc.set(this.elements, middle + 1, end))
  }

  canGenerate(pick: FluentPick<A[]>) {
    return pick.value.length >= this.min && pick.value.length <= this.max &&
           pick.value.every(v => this.elements.includes(v))
  }

  cornerCases(): FluentPick<A[]>[] {
    const min: A[] = []
    for (let i = 0; i < this.min; i++) min.push(this.elements[i])

    const max: A[] = []
    for (let i = 0; i < this.max; i++) max.push(this.elements[i])

    return [{value: min, original: min},
      {value: max, original: max}]
  }

  toString(depth = 0) {
    return ' '.repeat(depth * 2) +
      `Set Arbitrary: min = ${this.min} max = ${this.max} elements = [${this.elements.join(', ')}]`
  }
}
