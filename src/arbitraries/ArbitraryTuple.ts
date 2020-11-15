import { ArbitrarySize, FluentPick } from './types'
import { Arbitrary, NoArbitrary } from './internal'
import * as fc from './index'

type UnwrapFluentPick<T> = { [P in keyof T]: T[P] extends fc.Arbitrary<infer E> ? E : T[P] }

export class ArbitraryTuple<U extends Arbitrary<any>[], A = UnwrapFluentPick<U>> extends Arbitrary<A> {
  constructor(public readonly arbitraries: U) {
    super()
  }

  size(): ArbitrarySize {
    let value = 1
    let type: 'exact' | 'estimated' = 'exact'

    for (const a of this.arbitraries) {
      const size = a.size()
      type = (size.type === 'exact') ? type : 'estimated'
      value *= a.size().value
    }

    return { value, type }
  }

  pick(): FluentPick<A> | undefined {
    const value: any = []
    const original: any[] = []

    for (const a of this.arbitraries) {
      const pick = a.pick()
      if (pick === undefined) return undefined
      else {
        value.push(pick.value)
        original.push(pick.original)
      }
    }

    return { value, original }
  }

  cornerCases(): FluentPick<A>[] {
    const cornerCases = this.arbitraries.map(a => a.cornerCases())

    return cornerCases.reduce((acc, cc) => acc.flatMap(a => cc.map(b => ({
      value: [...a.value, b.value],
      original: [...a.original, b.original]
    }))), [{ value: [], original: [] }])
  }

  shrink<B extends A>(initial: FluentPick<B>): Arbitrary<A> {
    const tuples = this.arbitraries.map(selected =>
      this.arbitraries.reduce((arbitraries, arbitrary, i) => {
        arbitraries.push(
          (arbitrary === selected) ?
            arbitrary.shrink({ value: initial.value[i], original: initial.original[i] }) :
            fc.constant(initial.value[i]))
        return arbitraries
      }, [] as Arbitrary<any>[])
    ).filter (t => t.every(a => a !== NoArbitrary))

    return fc.union(...tuples.map(t => fc.tuple(...t.map((a, i) => a === NoArbitrary ? fc.constant(initial.value[i]) : a)))) as unknown as Arbitrary<A>
  }

  canGenerate<B extends A>(pick: FluentPick<B>): boolean {
    for (const i in pick.value)
      if (!this.arbitraries[i as number].canGenerate({ value: pick.value[i], original: pick.original[i] }))
        return false

    return true
  }

  toString(depth = 0) { return ' '.repeat(2 * depth) + 'Tuple Arbitrary:\n' + this.arbitraries.map(a => a.toString(depth + 1)).join('\n') }
}
