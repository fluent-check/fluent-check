import {Arbitrary, FluentPick} from '../../arbitraries'
import {MixinStrategy} from '../FluentStrategyTypes'

export function Biased<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    buildArbitraryCollection<A>(arbitrary: Arbitrary<A>, sampleSize = this.configuration.sampleSize): FluentPick<A>[] {
      const constantsSample = this.getArbitraryExtractedConstants(arbitrary)
      return this.isDedupable() ?
        arbitrary.sampleUniqueWithBias(sampleSize, constantsSample, this.randomGenerator.generator) :
        arbitrary.sampleWithBias(sampleSize, constantsSample, this.randomGenerator.generator)
    }
  }
}
