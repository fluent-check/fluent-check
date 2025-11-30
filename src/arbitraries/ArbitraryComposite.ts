import {Arbitrary} from './internal.js'
import type {ArbitrarySize, FluentPick} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {exactSize, estimatedSize} from './util.js'
import * as fc from './index.js'

export class ArbitraryComposite<A> extends Arbitrary<A> {
  constructor(public arbitraries: Arbitrary<A>[] = []) {
    super()
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
    const lastWeight = weights.at(-1)
    const picked = Math.floor(generator() * (lastWeight ?? 0))
    return this.arbitraries[weights.findIndex(s => s > picked)].pick(generator)
  }

  override cornerCases(): FluentPick<A>[] {
    return this.arbitraries.flatMap(a => a.cornerCases())
  }

  override shrink(initial: FluentPick<A>) {
    const arbitraries = this.arbitraries.filter(a => a.canGenerate(initial)).map(a => a.shrink(initial))
    return fc.union(...arbitraries)
  }

  override canGenerate(pick: FluentPick<A>) {
    return this.arbitraries.some(a => a.canGenerate(pick))
  }

  /**
   * For unions, uses the first arbitrary's hash function as fallback.
   * Falls back to base class implementation if no arbitraries.
   */
  override hashCode(): HashFunction {
    if (this.arbitraries.length === 0) return super.hashCode()
    return this.arbitraries[0].hashCode()
  }

  /**
   * For unions, uses the first arbitrary's equals function as fallback.
   * Falls back to base class implementation if no arbitraries.
   */
  override equals(): EqualsFunction {
    if (this.arbitraries.length === 0) return super.equals()
    return this.arbitraries[0].equals()
  }

  override toString(depth = 0) {
    return ' '.repeat(2 * depth) +
      'Composite Arbitrary:\n' + this.arbitraries.map(a => a.toString(depth + 1)).join('\n')
  }
}
