import {Arbitrary, FluentPick} from '../../arbitraries'
import {MixinStrategy} from '../FluentStrategyTypes'

export function Biased<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    protected buildArbitraryCollection<A>(
      arbitrary: Arbitrary<A>,
      currSample: FluentPick<A>[],
      sampleSize = this.configuration.sampleSize
    ): FluentPick<A>[] {
      return this.isDedupable() ?
        arbitrary.sampleUniqueWithBias(sampleSize, currSample, this.randomGenerator.generator) :
        arbitrary.sampleWithBias(sampleSize, currSample, this.randomGenerator.generator)
    }
  }
}
