import { ArbitrarySize, FluentPick, FluentSample } from './types'
import { ChainedArbitrary, FilteredArbitrary, MappedArbitrary, NoArbitrary, UniqueArbitrary } from './internal'
import * as stats from 'jstat'

export abstract class Arbitrary<A> {
  abstract size(): ArbitrarySize

  mapArbitrarySize(f: (v: number) => ArbitrarySize): ArbitrarySize {
    const baseSize = this.size()
    const result = f(baseSize.value)
    return { value : result.value,
      type : baseSize.type === 'exact' && result.type === 'exact' ? 'exact' : 'estimated',
      credibleInterval : result.credibleInterval }
  }

  pick(): FluentPick<A> | undefined { return undefined }

  sample(sampleSize = 10): FluentSample<A> {
    const items: FluentPick<A>[] = []
    for (let i = 0; i < sampleSize; i += 1) {
      const pick = this.pick()
      if (pick) items.push(pick)
      else break
    }

    return {
      items,
      confidence: this.sampleConfidenceFor(sampleSize)
    }
  }

  // The guy in https://bit.ly/3dAR2TN was right, there seems to be no closed formula for this :(
  // The distribution is a mixture of binomials given by
  // https://gist.github.com/ruippeixotog/c2e00f08f21d467e94545826f0832696 (think-bayes-scala
  // code). I simplified the mathematical expression to this.
  // ```
  sampleConfidenceFor(sampleSize: number) {
    const popSize = this.size().value
    if (popSize >= 10000) {
      // domain too large, can't calculate
      // TODO: find closed formula or good approximation
      return 0.0
    }
    let s = 1.0
    for (let k = 0; k <= popSize; k++) {
      s += stats.combination(popSize, k) * (1.0 - (k / popSize) ** sampleSize)
    }
    return s / (2 ** popSize)
  }

  cornerCases(): FluentPick<A>[] { return [] }

  sampleWithBias(sampleSize = 10): FluentSample<A> {
    const cornerCases = this.cornerCases()

    if (sampleSize <= cornerCases.length)
      return this.sample(sampleSize)

    const { items, confidence } = this.sample(sampleSize - cornerCases.length)
    items.unshift(...cornerCases)

    return { items, confidence }
  }

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
}
