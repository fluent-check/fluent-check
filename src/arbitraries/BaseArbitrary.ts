import { ArbitrarySize, FluentPick } from './types'
import { FilteredArbitrary, MappedArbitrary, NoArbitrary, UniqueArbitrary } from './internal'
import { ChainedArbitrary } from './ChainedArbitrary'

<<<<<<< HEAD
export abstract class Arbitrary<A> {
=======
export abstract class BaseArbitrary<A> {
>>>>>>> 24cfe80b5f6c30f43635541484c7cd49646eaf8e
  abstract size(): ArbitrarySize

  mapArbitrarySize(f: (v: number) => ArbitrarySize): ArbitrarySize {
    const baseSize = this.size()
    const result = f(baseSize.value)
    return { value : result.value,
      type : baseSize.type === 'exact' && result.type === 'exact' ? 'exact' : 'estimated',
      credibleInterval : result.credibleInterval }
  }

  pick(): FluentPick<A> | undefined { return undefined }

  sample(sampleSize = 10): FluentPick<A>[] {
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

<<<<<<< HEAD
  shrink<B extends A>(_initial: FluentPick<B>): Arbitrary<A> {
    return NoArbitrary
  }

  canGenerate<B extends A>(_: FluentPick<B>): boolean {
    return false
  }

  map<B>(f: (a: A) => B): Arbitrary<B> { return new MappedArbitrary(this, f) }
  filter(f: (a: A) => boolean): Arbitrary<A> { return new FilteredArbitrary(this, f) }
  chain<B>(f: (a: A) => Arbitrary<B>): Arbitrary<B> { return new ChainedArbitrary(this, f) }
  unique(): Arbitrary<A> { return new UniqueArbitrary(this) }
=======
  shrink(_initial: FluentPick<A>): BaseArbitrary<A> {
    return NoArbitrary
  }

  canGenerate(_: FluentPick<A>): boolean {
    return false
  }

  map<B>(f: (a: A) => B): BaseArbitrary<B> { return new MappedArbitrary(this, f) }
  filter(f: (a: A) => boolean): BaseArbitrary<A> { return new FilteredArbitrary(this, f) }
  chain<B>(f: (a: A) => BaseArbitrary<B>): BaseArbitrary<B> { return new ChainedArbitrary(this, f) }
  unique(): BaseArbitrary<A> { return new UniqueArbitrary(this) }
>>>>>>> 24cfe80b5f6c30f43635541484c7cd49646eaf8e
}