import {Arbitrary} from './internal.js'
import type {ArbitrarySize, FluentPick, NonEmptyArray} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {exactSize, estimatedSize} from './util.js'
import * as fc from './index.js'

export class ArbitraryComposite<A> extends Arbitrary<A> {
  constructor(public readonly arbitraries: NonEmptyArray<Arbitrary<A>>) {
    super()
    if (arbitraries.length === 0) {
      throw new Error('ArbitraryComposite requires at least one arbitrary')
    }
  }

  override size(): ArbitrarySize {
    let value = 0
    let isEstimated = false

    for (const a of this.arbitraries) {
      const size = a.size()
      if (size.type === 'estimated') isEstimated = true
      value += size.value
    }

    // todo: fix credible interval for estimated sizes
    return isEstimated ? estimatedSize(value, [value, value]) : exactSize(value)
  }

  override pick(generator: () => number) {
    // Safe: NonEmptyArray guarantees length > 0
    const weights = this.arbitraries.reduce(
      (acc, a) => { acc.push((acc.at(-1) ?? 0) + a.size().value); return acc },
      new Array<number>()
    )
    const lastWeight = weights.at(-1) ?? 0
    const picked = Math.floor(generator() * lastWeight)
    const index = weights.findIndex(s => s > picked)

    // Safe: NonEmptyArray guarantees length > 0, findIndex returns valid index or -1
    const selectedIndex = index >= 0 ? index : this.arbitraries.length - 1
    // Safe: NonEmptyArray guarantees selectedIndex is in valid range
    // Use at() for safe access - we know it's valid but TypeScript needs help
    const selected = this.arbitraries.at(selectedIndex)
    if (selected === undefined) {
      // This should never happen with NonEmptyArray, but TypeScript requires the check
      throw new Error('Invalid index in composite arbitrary')
    }
    return selected.pick(generator)
  }

  override cornerCases(): FluentPick<A>[] {
    return this.arbitraries.flatMap(a => a.cornerCases())
  }

  override shrink(initial: FluentPick<A>) {
    const filtered = this.arbitraries.filter(a => a.canGenerate(initial))
    if (filtered.length === 0) return fc.empty()
    const arbitraries = filtered.map(a => a.shrink(initial))
    // fc.union() handles NoArbitrary filtering and empty arrays correctly
    return fc.union(...arbitraries)
  }

  override canGenerate(pick: FluentPick<A>) {
    return this.arbitraries.some(a => a.canGenerate(pick))
  }

  /**
   * For unions, uses the first arbitrary's hash function.
   * Safe: NonEmptyArray guarantees at least one element.
   */
  override hashCode(): HashFunction {
    // Safe: NonEmptyArray guarantees first element exists - destructuring preserves type
    const [first] = this.arbitraries
    return first.hashCode()
  }

  /**
   * For unions, uses the first arbitrary's equals function.
   * Safe: NonEmptyArray guarantees at least one element.
   */
  override equals(): EqualsFunction {
    // Safe: NonEmptyArray guarantees first element exists - destructuring preserves type
    const [first] = this.arbitraries
    return first.equals()
  }

  override toString(depth = 0) {
    return ' '.repeat(2 * depth) +
      'Composite Arbitrary:\n' + this.arbitraries.map(a => a.toString(depth + 1)).join('\n')
  }
}
