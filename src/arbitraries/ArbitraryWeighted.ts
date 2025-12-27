import {Arbitrary} from './internal.js'
import type {ArbitrarySize, FluentPick, NonEmptyArray} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {exactSize, estimatedSize} from './util.js'
import * as fc from './index.js'
import {assertInBounds} from '../util/assertions.js'

/**
 * A weighted entry pairing an arbitrary with its sampling weight.
 */
export type WeightedEntry<A> = readonly [weight: number, arbitrary: Arbitrary<A>]

/**
 * Represents a weighted union of multiple arbitraries.
 *
 * Unlike {@link ArbitraryComposite} which weights by size, ArbitraryWeighted
 * uses explicit weights to control sampling probability. This is useful for:
 * - Binary search shrinking (heavily weight the smaller interval)
 * - Biased generation (prefer certain value ranges)
 *
 * Example:
 * ```typescript
 * // 80% from [0, 100], 20% from [0, 1000000]
 * fc.weighted([
 *   [0.8, fc.integer(0, 100)],
 *   [0.2, fc.integer(0, 1000000)]
 * ])
 * ```
 */
export class ArbitraryWeighted<A> extends Arbitrary<A> {
  private readonly totalWeight: number
  private readonly cumulativeWeights: number[]

  constructor(public readonly entries: NonEmptyArray<WeightedEntry<A>>) {
    super()
    if (entries.length === 0) {
      throw new Error('ArbitraryWeighted requires at least one entry')
    }

    // Pre-compute cumulative weights for efficient sampling
    let total = 0
    this.cumulativeWeights = []
    for (const [weight] of entries) {
      if (weight < 0) {
        throw new Error('Weights must be non-negative')
      }
      total += weight
      this.cumulativeWeights.push(total)
    }

    if (total === 0) {
      throw new Error('Total weight must be positive')
    }

    this.totalWeight = total
  }

  override size(): ArbitrarySize {
    let value = 0
    let isEstimated = false

    for (const [, arbitrary] of this.entries) {
      const size = arbitrary.size()
      if (size.type === 'estimated') isEstimated = true
      value += size.value
    }

    return isEstimated ? estimatedSize(value, [value, value]) : exactSize(value)
  }

  override pick(generator: () => number): FluentPick<A> | undefined {
    const picked = generator() * this.totalWeight
    const index = this.cumulativeWeights.findIndex(w => w > picked)

    const selectedIndex = index >= 0 ? index : this.entries.length - 1
    assertInBounds(
      selectedIndex,
      this.entries.length,
      'Weighted arbitrary index out of bounds after weight selection'
    )

    const entry = this.entries[selectedIndex]
    if (entry === undefined) {
      throw new Error('Weighted arbitrary selection failed')
    }

    return entry[1].pick(generator)
  }

  override cornerCases(): FluentPick<A>[] {
    // Prioritize corner cases from higher-weighted arbitraries
    const result: FluentPick<A>[] = []
    const sortedEntries = [...this.entries].sort((a, b) => b[0] - a[0])

    for (const [, arbitrary] of sortedEntries) {
      result.push(...arbitrary.cornerCases())
    }

    return result
  }

  override shrink(initial: FluentPick<A>): Arbitrary<A> {
    const shrunk = this.entries
      .filter(([, a]) => a.canGenerate(initial))
      .map(([w, a]) => [w, a.shrink(initial)] as WeightedEntry<A>)
      .filter(([, a]) => a !== fc.empty())

    if (shrunk.length === 0) return fc.empty()
    if (shrunk.length === 1) return shrunk[0]![1]

    return new ArbitraryWeighted(shrunk as NonEmptyArray<WeightedEntry<A>>)
  }

  override canGenerate(pick: FluentPick<A>): boolean {
    return this.entries.some(([, a]) => a.canGenerate(pick))
  }

  override hashCode(): HashFunction {
    const [first] = this.entries
    return first[1].hashCode()
  }

  override equals(): EqualsFunction {
    const [first] = this.entries
    return first[1].equals()
  }

  override toString(depth = 0): string {
    const indent = ' '.repeat(2 * depth)
    const lines = this.entries.map(([w, a]) =>
      `${indent}  [${(w / this.totalWeight * 100).toFixed(1)}%] ${a.toString(0)}`
    )
    return `${indent}Weighted Arbitrary:\n${lines.join('\n')}`
  }
}
