import {FluentResult} from '../../FluentCheck'
import {MixinStrategy, MixinInstance} from '../FluentStrategyTypes'

export function Shrinkable<TBase extends MixinStrategy>(Base: TBase): {
  new(...a: any[]): MixinInstance;
} & TBase {
  return class extends Base {
    protected shrink<K extends string>(arbitraryName: K, partial: FluentResult) {
      const shrinkedArbitrary = this.arbitraries[arbitraryName].arbitrary.shrink(partial.example[arbitraryName])
      this.arbitraries[arbitraryName].collection = this.buildArbitraryCollection(shrinkedArbitrary,
        this.configuration.shrinkSize)
    }
  }
}
