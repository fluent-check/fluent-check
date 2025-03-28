import {ArbitrarySize, FluentPick, XOR} from './types.js'
import {ChainedArbitrary, FilteredArbitrary, MappedArbitrary, NoArbitrary} from './internal.js'
import {stringify} from './util.js'

export abstract class Arbitrary<A> {
  /**
   * The number of elements that can be generated by this `Arbitrary`.
   *
   * The returned size can be exact or an estimation.
   */
  abstract size(): ArbitrarySize

  /**
   * Generates a random element. This operation is stateless.
   */
  abstract pick(generator: () => number): FluentPick<A> | undefined

  /**
   * Returns `true` if this `Arbitrary` can generate a given element.
   *
   * In cases where the set of possible elements is unknown, this operation is expected to be optimistic - it should
   * return `false` only when a pick is guaranteed not to be generatable.
   *
   * TODO: should we include an "unknown" result?
   */
  abstract canGenerate<B extends A>(pick: FluentPick<B>): boolean

  /**
   * Returns a sample of picks of a given size. Sample might contain repeated values
   * and corner cases are not taken into account.
   */
  sample(sampleSize = 10, generator: () => number = Math.random): FluentPick<A>[] {
    const result: FluentPick<A>[] = []

    for (let i = 0; i < sampleSize; i ++) {
      const pick = this.pick(generator)
      if (pick !== undefined) result.push(pick)
      else break
    }

    return result
  }

  /**
   * Returns a sample of picks of a given size withour replacement. Sample will
   * not contain repeated values. Corner cases are not taken into account.
   */
  sampleUnique(sampleSize = 10, cornerCases: FluentPick<A>[] = [],
    generator: () => number = Math.random): FluentPick<A>[] {
    const result = new Map<string, FluentPick<A>>()

    for (const k in cornerCases)
      result.set(stringify(cornerCases[k].value), cornerCases[k])

    const initialSize = this.size()
    let bagSize = Math.min(sampleSize, initialSize.value)

    while (result.size < bagSize) {
      const r = this.pick(generator)
      if (r === undefined) break
      if (!result.has(stringify(r.value))) result.set(stringify(r.value), r)
      if (initialSize.type !== 'exact') bagSize = Math.min(sampleSize, this.size().value)
    }

    return Array.from(result.values())
  }

  /**
   * The special cases for this arbitrary, which can be used during sampling to give
   * higher weight to certain elements.
   */
  cornerCases(): FluentPick<A>[] { return [] }

  /**
   * Returns a sample of picks of a given size. Sample might contain repeated values
   * and might be biased toward corner cases (depending on the specific arbitrary
   * implementing or not the cornerCases method).
   */
  sampleWithBias(sampleSize = 10, generator: () => number = Math.random): FluentPick<A>[] {
    const cornerCases = this.cornerCases()

    if (sampleSize <= cornerCases.length)
      return this.sample(sampleSize, generator)

    const sample = this.sample(sampleSize - cornerCases.length, generator)
    sample.unshift(...cornerCases)

    return sample
  }

  /**
   * Returns a sample of picks of a given size. Sample will not contain repeated values
   * and might be biased toward corner cases (depending on the specific arbitrary
   * implementing or not the cornerCases method).
   */
  sampleUniqueWithBias(sampleSize = 10, generator: () => number = Math.random): FluentPick<A>[] {
    const cornerCases = this.cornerCases()

    if (sampleSize <= cornerCases.length)
      return this.sampleUnique(sampleSize, [], generator)

    return this.sampleUnique(sampleSize, cornerCases, generator)
  }

  /**
   * Given a pick known to falsify a property, returns a new arbitrary with simpler cases to be tested. This is part of
   * FluentCheck's behavior of searching for simpler counter-examples after one is found.
   */
  shrink<B extends A>(_initial: FluentPick<B>): Arbitrary<A> {
    return NoArbitrary
  }

  /**
   * Maps a given arbitrary to a new one based on the transformation function (f). Optionally, a shrinkHelper structure
   * that mutually exclusively contains either an inverse map function or an entirely new canGenerate method can be
   * passed. The former allows the mapped arbitrary to be reverted back to its base arbitrary (inverse map === f').
   * Since some transformations cannot be easily inverted, the latter allows entirely overriding the canGenerate method.
   */
  map<B>(f: (a: A) => B,
    shrinkHelper?: XOR<{inverseMap: (b: B) => A[]},{canGenerate: (pick: FluentPick<B>) => boolean}>
  ): Arbitrary<B> {
    return new MappedArbitrary(this, f, shrinkHelper)
  }

  filter(f: (a: A) => boolean): Arbitrary<A> { return new FilteredArbitrary(this, f) }
  chain<B>(f: (a: A) => Arbitrary<B>): Arbitrary<B> { return new ChainedArbitrary(this, f) }

  toString(depth = 0): string { return ' '.repeat(depth * 2) + `Base Arbitrary: ${this.constructor.name}`  }
}
