import {Arbitrary, FluentPick} from '../arbitraries'
import {FluentResult} from '../FluentCheck'
import {FluentStrategy, FluentStrategyInterface} from './FluentStrategy'

type MixinConstructor<T = {}> = new (...args: any[]) => T
type MixinStrategy = MixinConstructor<FluentStrategy>

export function Random<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base implements FluentStrategyInterface {
    hasInput<K extends string>(arbitraryName: K): boolean {
      return this.arbitraries[arbitraryName] !== undefined &&
        this.arbitraries[arbitraryName].pickNum < this.arbitraries[arbitraryName].collection.length
    }

    getInput<K extends string, A>(arbitraryName: K): FluentPick<A> {
      return this.arbitraries[arbitraryName].collection[this.arbitraries[arbitraryName].pickNum++]
    }

    handleResult() {}
  }
}

export function Shrinkable<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    shrink<K extends string>(arbitraryName: K, partial: FluentResult | undefined, depth: number) {
      const shrinkedArbitrary = this.arbitraries[arbitraryName].arbitrary.shrink(partial!.example[arbitraryName])
      this.arbitraries[arbitraryName].collection = this.buildArbitraryCollection(shrinkedArbitrary,
        this.configuration.shrinkSize)
    }
  }
}

export function Dedupable<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    addArbitrary<K extends string, A>(arbitraryName: K, a: Arbitrary<A>) {
      this.arbitraries[arbitraryName] = {arbitrary: a.unique(), pickNum: 0, collection: []}
      this.setArbitraryCache(arbitraryName)
    }
  }
}

export function Cacheable<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    setArbitraryCache<K extends string, A>(arbitraryName: K) {
      this.arbitraries[arbitraryName].cache = this.buildArbitraryCollection(this.arbitraries[arbitraryName].arbitrary)
    }
  }
}

export function Biased<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    buildArbitraryCollection<A>(arbitrary: Arbitrary<A>, sampleSize = this.configuration.sampleSize): FluentPick<A>[] {
      return arbitrary.sampleWithBias(sampleSize)
    }
  }
}
