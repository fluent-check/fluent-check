import { ArbitrarySize, FluentPick } from './types'
import { FilteredArbitrary, MappedArbitrary, NoArbitrary, UniqueArbitrary } from './internal'
import { isIndexedArbitrary } from './IndexedArbitrary'
import { duplicatesProbability, reservoirSampling } from '../sampling'

export abstract class BaseArbitrary<A> {
  abstract size(): ArbitrarySize


  pick(): FluentPick<A> | undefined { return undefined }

  sample(sampleSize = 10): FluentPick<A>[] {
    if (sampleSize === 0) return []

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const thisArb = this
    if (!isIndexedArbitrary(thisArb)) return this.sampleWithReplacement(sampleSize)

    const shouldSampleWithReplacement =
      this.size().value >= Number.MAX_SAFE_INTEGER ||
      duplicatesProbability(sampleSize, this.size().value) <= 0.01

    return shouldSampleWithReplacement ?
      this.sampleWithReplacement(sampleSize) :
      reservoirSampling(sampleSize, this.size().value, idx => thisArb.pickWithIndex(idx))
  }

  sampleWithReplacement(sampleSize: number): FluentPick<A>[] {
    const result: FluentPick<A>[] = []
    for (let i = 0; i < sampleSize; i += 1) {
      const pick = this.pick()
      if (pick) result.push(pick)
      else break
    }

    return result
  }

  cornerCases(): FluentPick<A>[] { return [] }

  sampleWithBias(sampleSize = 10): FluentPick<A>[] {
    const cornerCases = this.cornerCases()

    if (sampleSize <= cornerCases.length)
      return this.sample(sampleSize)

    const sample = this.sample(sampleSize - cornerCases.length)
    sample.unshift(...cornerCases)

    return sample
  }

  shrink(_initial: FluentPick<A>): BaseArbitrary<A> {
    return NoArbitrary
  }

  canGenerate(_: FluentPick<A>): boolean {
    return false
  }

  map<B>(f: (a: A) => B): BaseArbitrary<B> { return new MappedArbitrary(this, f) }
  filter(f: (a: A) => boolean): BaseArbitrary<A> { return new FilteredArbitrary(this, f) }
  unique(): BaseArbitrary<A> { return new UniqueArbitrary(this) }
}
