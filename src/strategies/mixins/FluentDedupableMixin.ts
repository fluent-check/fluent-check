import {MixinStrategy, MixinInstance} from '../FluentStrategyTypes'

export function Dedupable<TBase extends MixinStrategy>(Base: TBase): {
  new(...a: any[]): MixinInstance;
} & TBase {
  return class extends Base {
    protected isDedupable() {
      return true
    }
  }
}
