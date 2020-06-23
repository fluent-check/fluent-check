import { ArbitrarySize, FluentPick } from './types'
import { FilteredArbitrary, MappedArbitrary, NoArbitrary, UniqueArbitrary } from './internal'
import { Sampling, SamplingWithReplacement } from './Sampler'

export abstract class Arbitrary<A> {
  protected sampler: Sampling<A> = new SamplingWithReplacement(() => this.pick())

  abstract size(): ArbitrarySize

  pick(): FluentPick<A> | undefined { return undefined }

  sample(sampleSize = 10): FluentPick<A>[] {
    return this.sampler.sample(sampleSize)
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

  shrink<B extends A>(_initial: FluentPick<B>): Arbitrary<A> {
    return NoArbitrary
  }

  canGenerate<B extends A>(_: FluentPick<B>): boolean {
    return false
  }

  map<B>(f: (a: A) => B): Arbitrary<B> { return new MappedArbitrary(this, f) }
  filter(f: (a: A) => boolean): Arbitrary<A> { return new FilteredArbitrary(this, f) }
  // chain<B>(f: (a: A) => Arbitrary<B>): Arbitrary<B> { return new ChainedArbitrary(this, f) }
  unique(): Arbitrary<A> { return new UniqueArbitrary(this) }
}
