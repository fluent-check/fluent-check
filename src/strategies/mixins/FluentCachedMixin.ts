import {MixinStrategy} from '../FluentStrategyTypes'

export function Cached<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    setArbitraryCache<K extends string, A>(arbitraryName: K) {
      if (this.arbitraries[arbitraryName].cache === undefined)
        this.arbitraries[arbitraryName].cache = this.buildArbitraryCollection(this.arbitraries[arbitraryName].arbitrary)
    }
  }
}
