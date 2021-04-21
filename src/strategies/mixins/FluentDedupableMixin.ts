import {MixinStrategy} from '../FluentStrategyTypes'

export function Dedupable<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    protected isDedupable() {
      return true
    }
  }
}
