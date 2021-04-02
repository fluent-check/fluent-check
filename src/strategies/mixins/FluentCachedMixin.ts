import {MixinStrategy, MixinInstance} from '../FluentStrategyTypes'

export function Cached<TBase extends MixinStrategy>(Base: TBase): {
  new(...a: any[]): MixinInstance;
} & TBase {
  return class extends Base {
    protected setArbitraryCache<K extends string>(arbitraryName: K) {
      if (this.arbitraries[arbitraryName].cache === undefined)
        this.arbitraries[arbitraryName].cache = this.buildArbitraryCollection(this.arbitraries[arbitraryName].arbitrary)
    }
  }
}
