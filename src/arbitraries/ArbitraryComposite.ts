import {Arbitrary} from './internal.js'
import type {ArbitrarySize, FluentPick, NonEmptyArray} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {exactSize, estimatedSize} from './util.js'
import * as fc from './index.js'

/**
 * Represents a union (OR) of multiple arbitraries that all generate the same type.
 * 
 * Unlike {@link ArbitraryTuple}, which creates a product (AND) by combining values
 * from different arbitraries into a tuple, ArbitraryComposite selects one arbitrary
 * from the collection (weighted by size) and delegates generation to it.
 * 
 * - Size: Sum of all constituent arbitraries' sizes
 * - Pick: Selects one arbitrary (weighted by size) and delegates to it
 * - canGenerate: Returns true if ANY of the arbitraries can generate the value
 * 
 */
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
    const weights = this.arbitraries.reduce(
      (acc, a) => { acc.push((acc.at(-1) ?? 0) + a.size().value); return acc },
      new Array<number>()
    )
    const lastWeight = weights.at(-1) ?? 0
    const picked = Math.floor(generator() * lastWeight)
    const index = weights.findIndex(s => s > picked)

    const selectedIndex = index >= 0 ? index : this.arbitraries.length - 1
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
    return fc.union(...arbitraries)
  }

  override canGenerate(pick: FluentPick<A>) {
    return this.arbitraries.some(a => a.canGenerate(pick))
  }

  /**
   * For unions, uses the first arbitrary's hash function.
   */
  override hashCode(): HashFunction {
    const [first] = this.arbitraries
    return first.hashCode()
  }

  /**
   * For unions, uses the first arbitrary's equals function.
   */
  override equals(): EqualsFunction {
    const [first] = this.arbitraries
    return first.equals()
  }

  override toString(depth = 0) {
    return ' '.repeat(2 * depth) +
      'Composite Arbitrary:\n' + this.arbitraries.map(a => a.toString(depth + 1)).join('\n')
  }
}
