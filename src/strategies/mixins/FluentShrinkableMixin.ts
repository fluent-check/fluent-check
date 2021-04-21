import {FluentResult} from '../../FluentCheck'
import {MixinStrategy} from '../FluentStrategyTypes'

export function Shrinkable<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    shrink<K extends string>(arbitraryName: K, partial: FluentResult): boolean {
      const shrinkedArbitrary = this.arbitraries[arbitraryName].arbitrary.shrink(partial.example[arbitraryName])
      const shrinkedArbitraryCollection = this.buildArbitraryCollection(shrinkedArbitrary,
        this.getArbitraryExtractedConstants(this.arbitraries[arbitraryName].arbitrary),
        this.configuration.shrinkSize)

      if (shrinkedArbitraryCollection.length === 0) return false
      else this.arbitraries[arbitraryName].collection = shrinkedArbitraryCollection

      return true
    }
  }
}
