import {MixinStrategy} from '../FluentStrategyTypes'

export function Dedupable<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    isDedupable() {
      return true
    }
  }
}
