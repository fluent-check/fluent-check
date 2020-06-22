import { ArbitrarySize, FluentPick } from './types'
import { FilteredArbitrary, MappedArbitrary, NoArbitrary, UniqueArbitrary } from './internal'
import { Sampling, SamplingWithReplacement } from './Sampler'

export abstract class BaseArbitrary<A> {
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
