import {FluentPick, XOR, ArbitrarySize} from './types.js'
import {Arbitrary} from './internal.js'
import {stringify} from './util.js'

export class MappedArbitrary<A, B> extends Arbitrary<B> {
  constructor(
    public readonly baseArbitrary: Arbitrary<A>,
    public readonly f: (a: A) => B,
    public readonly shrinkHelper?: XOR<{inverseMap: (b: B) => A[]},{canGenerate: (pick: FluentPick<B>) => boolean}>
  ) {
    super()
    this.canGenerate = this.shrinkHelper !== undefined && this.shrinkHelper.canGenerate !== undefined ?
      this.shrinkHelper.canGenerate : this.canGenerate
  }

  mapFluentPick(p: FluentPick<A>): FluentPick<B> {
    const original = 'original' in p && p.original !== undefined ? p.original : p.value
    return {value: this.f(p.value), original}
  }

  pick(generator: () => number): FluentPick<B> | undefined {
    const pick = this.baseArbitrary.pick(generator)
    return pick !== undefined ? this.mapFluentPick(pick) : undefined
  }

  size(): ArbitrarySize {
    const baseSize = this.baseArbitrary.size()
    
    // If we have an inverse map, we can provide a more accurate size estimation
    if (this.shrinkHelper?.inverseMap) {
      // We can determine the size from the inverse map's co-domain
      // Sample a reasonable number of values to estimate the size
      const sampleSize = Math.min(100, baseSize.value)
      if (sampleSize === 0) {
        return baseSize // Base is empty, so mapped is also empty
      }
      
      // Sample from base arbitrary 
      const baseSample = this.baseArbitrary.sample(sampleSize)
      const mappedValues = new Set<string>()
      
      for (const pick of baseSample) {
        mappedValues.add(stringify(this.f(pick.value)))
      }
      
      // Estimate the proportion of distinct values
      const distinctRatio = mappedValues.size / baseSample.length
      const estimatedSize = Math.round(baseSize.value * distinctRatio)
      
      // Always return as estimated with inverse map
      return {
        type: 'estimated', 
        value: estimatedSize,
        credibleInterval: [
          Math.max(1, Math.floor(estimatedSize * 0.8)), 
          Math.min(baseSize.value, Math.ceil(estimatedSize * 1.2))
        ]
      }
    }
    
    // For small base arbitraries, we can actually compute the exact mapped size
    if (baseSize.value <= 1000 && baseSize.type === 'exact') {
      const mappedValues = new Set<string>()
      const generator = () => Math.random() // Fixed generator for repeatability
      const picks = this.baseArbitrary.sampleUnique(baseSize.value, [], generator)
      
      // If we couldn't get all samples, use estimation
      if (picks.length < baseSize.value) {
        // Estimate using the samples we got
        const mappedCount = new Set(picks.map(p => stringify(this.f(p.value)))).size
        const estimatedSize = Math.round((mappedCount / picks.length) * baseSize.value)
        
        return {
          type: 'estimated',
          value: estimatedSize,
          credibleInterval: [
            Math.max(1, Math.floor(estimatedSize * 0.8)),
            Math.min(baseSize.value, Math.ceil(estimatedSize * 1.2))
          ]
        }
      }
      
      // Generate all values and count distinct mapped values
      for (const pick of picks) {
        mappedValues.add(stringify(this.f(pick.value)))
      }
      
      // If we found fewer distinct values than the base size, it's a non-bijective mapping
      if (mappedValues.size < baseSize.value) {
        return {
          type: 'estimated',
          value: mappedValues.size,
          credibleInterval: [mappedValues.size, mappedValues.size]
        }
      }
      
      return {
        type: 'exact',
        value: mappedValues.size,
        credibleInterval: [mappedValues.size, mappedValues.size]
      }
    }
    
    // By default, we return the base size (which may be an overestimate)
    return baseSize
  }

  cornerCases(): FluentPick<B>[] {
    return this.baseArbitrary.cornerCases().map(p => this.mapFluentPick(p))
  }

  shrink(initial: FluentPick<B>): Arbitrary<B> {
    return this.baseArbitrary.shrink({value: initial.original, original: initial.original}).map(v => this.f(v))
  }

  canGenerate(pick: FluentPick<B>) {
    const inverseValues = this.shrinkHelper !== undefined && this.shrinkHelper.inverseMap !== undefined ?
      this.shrinkHelper.inverseMap(pick.value) : [pick.original]
    return inverseValues.some(value => this.baseArbitrary.canGenerate({value, original: pick.original}))
  }

  toString(depth = 0) {
    return ' '.repeat(2 * depth) +
      `Map Arbitrary: f = ${this.f.toString()}\n` + this.baseArbitrary.toString(depth + 1)
  }
}
