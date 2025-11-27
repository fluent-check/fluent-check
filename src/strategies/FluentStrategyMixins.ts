import type {Arbitrary, FluentPick} from '../arbitraries/index.js'
import type {FluentResult} from '../FluentCheck.js'
import {type FluentStrategy, type FluentStrategyInterface} from './FluentStrategy.js'

// Define a constructor type for use with mixins
type MixinConstructor<T = {}> = new (...args: any[]) => T
// Define a base type for the strategy constructor
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
    shrink<K extends string>(arbitraryName: K, partial: FluentResult<Record<string, unknown>>) {
      const shrinkedArbitrary = this.arbitraries[arbitraryName].arbitrary.shrink(partial.example[arbitraryName])
      this.arbitraries[arbitraryName].collection = this.buildArbitraryCollection(shrinkedArbitrary,
        this.configuration.shrinkSize)
    }
  }
}

export function Dedupable<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    isDedupable() {
      return true
    }
  }
}

export function Cached<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    setArbitraryCache<K extends string>(arbitraryName: K) {
      this.arbitraries[arbitraryName].cache = this.buildArbitraryCollection(this.arbitraries[arbitraryName].arbitrary)
    }
  }
}

export function Biased<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    buildArbitraryCollection<A>(arbitrary: Arbitrary<A>, sampleSize = this.configuration.sampleSize): FluentPick<A>[] {
      return this.isDedupable()
        ? arbitrary.sampleUniqueWithBias(sampleSize, this.randomGenerator.generator)
        : arbitrary.sampleWithBias(sampleSize, this.randomGenerator.generator)
    }
  }
}
