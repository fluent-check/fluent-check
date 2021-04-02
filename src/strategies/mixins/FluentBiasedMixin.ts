import {Arbitrary, FluentPick} from '../../arbitraries'
import {MixinStrategy, MixinInstance} from '../FluentStrategyTypes'

export function Biased<TBase extends MixinStrategy>(Base: TBase): {
  new(...a: any[]): MixinInstance;
} & TBase {
  return class extends Base {
    protected buildArbitraryCollection<A>(
      arbitrary: Arbitrary<A>,
      sampleSize = this.configuration.sampleSize
    ): FluentPick<A>[] {
      const constantsSample = this.getArbitraryExtractedConstants(arbitrary)
      return this.isDedupable() ?
        arbitrary.sampleUniqueWithBias(sampleSize, constantsSample, this.randomGenerator.generator) :
        arbitrary.sampleWithBias(sampleSize, constantsSample, this.randomGenerator.generator)
    }
  }
}
