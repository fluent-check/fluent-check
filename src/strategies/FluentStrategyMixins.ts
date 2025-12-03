import type {Arbitrary, FluentPick} from '../arbitraries/index.js'
import type {FluentResult} from '../FluentCheck.js'
import {type FluentStrategy, type FluentStrategyInterface} from './FluentStrategy.js'

// Define a constructor type for use with mixins
type MixinConstructor<T = {}> = new (...args: any[]) => T
// Define a base type for the strategy constructor
type MixinStrategy = MixinConstructor<FluentStrategy>

export function Random<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base implements FluentStrategyInterface {
    override hasInput<K extends string>(arbitraryName: K): boolean {
      const arbitrary = this.getArbitraryState(arbitraryName)
      const collection = arbitrary.collection ?? []
      return arbitrary.pickNum < collection.length
    }

    override getInput<K extends string, A>(arbitraryName: K): FluentPick<A> {
      const arbitrary = this.getArbitraryState(arbitraryName)
      const collection = arbitrary.collection ?? []
      const next = collection[arbitrary.pickNum]
      arbitrary.pickNum += 1
      return next as FluentPick<A>
    }

    override handleResult() {}
  }
}

export function Shrinkable<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    override shrink<K extends string>(arbitraryName: K, partial: FluentResult<Record<string, unknown>>) {
      const arbitraryState = this.getArbitraryState(arbitraryName)
      const baseArbitrary = arbitraryState.arbitrary
      const shrinkedArbitrary = baseArbitrary.shrink(partial.example[arbitraryName] as FluentPick<unknown>)
      arbitraryState.collection = this.buildArbitraryCollection(shrinkedArbitrary, this.configuration.shrinkSize)
    }
  }
}

export function Dedupable<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    override isDedupable() {
      return true
    }
  }
}

export function Cached<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    override setArbitraryCache<K extends string>(arbitraryName: K) {
      const arbitraryState = this.getArbitraryState(arbitraryName)
      arbitraryState.cache = this.buildArbitraryCollection(arbitraryState.arbitrary)
    }
  }
}

export function Biased<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    override buildArbitraryCollection<A>(
      arbitrary: Arbitrary<A>,
      sampleSize = this.configuration.sampleSize
    ): FluentPick<A>[] {
      return this.isDedupable()
        ? arbitrary.sampleUniqueWithBias(sampleSize, this.randomGenerator.generator)
        : arbitrary.sampleWithBias(sampleSize, this.randomGenerator.generator)
    }
  }
}
