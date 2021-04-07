import {FluentResult} from '../../FluentCheck'
import {MixinStrategy} from '../FluentStrategyTypes'

export function Shrinkable<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    protected shrink<K extends string>(arbitraryName: K, partial: FluentResult) {
      const shrinkedArbitrary = this.arbitraries[arbitraryName].arbitrary.shrink(partial.example[arbitraryName])
      this.arbitraries[arbitraryName].collection = this.buildArbitraryCollection(shrinkedArbitrary,
        this.getArbitraryExtractedConstants(this.arbitraries[arbitraryName].arbitrary),
        this.configuration.shrinkSize)
    }
  }
}
