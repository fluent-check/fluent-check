import { FluentPick, ArbitrarySize } from './types'
import { Arbitrary } from './internal'
import * as fc from './index'

export class ArbitrarySet<A> extends Arbitrary<A[]> {
  constructor(public readonly elements: A[], public readonly min = 0, public readonly max = 10) {
    super()
  }

  size(): ArbitrarySize {
    const factorial = (n: number) => {
      let x = 1, f = 1
      while (x <= n) f *= x++
      return f
    }

    const comb = (n: number, s: number) => { return factorial (n) / (factorial(s) * factorial(n - s))}

    let size = 0
    for (let i = this.min; i <= this.max; i++) size += comb(this.elements.length, i)

    return { value: size, type: 'exact' }
  }

  pick(): FluentPick<A[]> | undefined {
    const size = Math.floor(Math.random() * (this.max - this.min + 1)) + this.min
    const pick = new Set<A>()

    while (pick.size !== size)
      pick.add(this.elements[Math.floor(Math.random() * this.elements.length)])

    const value = Array.from(pick)

    return {
      value,
      original: value
    }
  }

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

    return [{ value: min, original: min }, { value: max, original: max }]
  }
}
