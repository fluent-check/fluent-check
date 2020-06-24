import { FluentPick, ArbitrarySize } from './types'
import { Arbitrary } from './internal'
import { NoArbitrary } from './NoArbitrary'

export class ArbitraryOneOf<A> extends Arbitrary<A> {
  constructor(public readonly elements: A[]) {
    super()
  }

  size(): ArbitrarySize { return { value: this.elements.length, type: 'exact' }}

  pick() {
    const pick = Math.floor(Math.random() * this.elements.length)
    return { value: this.elements[pick], original: this.elements[pick] }
  }

  shrink(initial: FluentPick<A>): Arbitrary<A> {
    return NoArbitrary
  }

  canGenerate(pick: FluentPick<A>) {
    return this.elements.includes(pick.value)
  }

  cornerCases(): FluentPick<A>[] {
    return [{ value: this.elements[0], original: this.elements[0] }]
  }
}
