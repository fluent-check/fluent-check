import type {Arbitrary, FluentPick} from '../arbitraries/index.js'
import type {FluentResult} from '../FluentCheck.js'
import {type FluentStrategy, type FluentStrategyInterface} from './FluentStrategy.js'

// Define a constructor type for use with mixins
type MixinConstructor<T = {}> = new (...args: any[]) => T

// Define a base type for the strategy constructor, parameterized by record type
type MixinStrategy<Rec extends Record<string, unknown>> = MixinConstructor<FluentStrategy<Rec>>

export function Random<Rec extends Record<string, unknown>, TBase extends MixinStrategy<Rec>>(Base: TBase) {
  return class extends Base implements FluentStrategyInterface<Rec> {
    override hasInput<K extends keyof Rec & string>(arbitraryName: K): boolean {
      const arbitrary = this.getArbitraryState(arbitraryName)
      const collection = arbitrary.collection ?? []
      return arbitrary.pickNum < collection.length
    }

    override getInput<K extends keyof Rec & string>(arbitraryName: K): FluentPick<Rec[K]> {
      const arbitrary = this.getArbitraryState(arbitraryName)
      const collection = arbitrary.collection ?? []
      const next = collection[arbitrary.pickNum]
      arbitrary.pickNum += 1
      return next as FluentPick<Rec[K]>
    }

    override handleResult() {}
  }
}

export function Shrinkable<Rec extends Record<string, unknown>, TBase extends MixinStrategy<Rec>>(Base: TBase) {
  return class extends Base {
    override shrink<K extends keyof Rec & string>(
      arbitraryName: K,
      partial: FluentResult<Record<string, unknown>>
    ) {
      const arbitraryState = this.getArbitraryState(arbitraryName)
      const baseArbitrary = arbitraryState.arbitrary
      const shrinkedArbitrary = baseArbitrary.shrink(
        partial.example[arbitraryName] as FluentPick<Rec[K]>
      )
      arbitraryState.collection = this.buildArbitraryCollection(shrinkedArbitrary, this.configuration.shrinkSize)
    }
  }
}

export function Dedupable<Rec extends Record<string, unknown>, TBase extends MixinStrategy<Rec>>(Base: TBase) {
  return class extends Base {
    override isDedupable() {
      return true
    }
  }
}

export function Cached<Rec extends Record<string, unknown>, TBase extends MixinStrategy<Rec>>(Base: TBase) {
  return class extends Base {
    override setArbitraryCache<K extends keyof Rec & string>(arbitraryName: K) {
      const arbitraryState = this.getArbitraryState(arbitraryName)
      arbitraryState.cache = this.buildArbitraryCollection(arbitraryState.arbitrary)
    }
  }
}

export function Biased<Rec extends Record<string, unknown>, TBase extends MixinStrategy<Rec>>(Base: TBase) {
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
