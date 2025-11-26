import {Arbitrary, FluentPick} from '../arbitraries/index.js'
import {FluentResult} from '../FluentCheck.js'
import {FluentStrategy, FluentStrategyInterface} from './FluentStrategy.js'

// Interface to properly type the arbitrary structure used in the strategy
interface ArbitraryContainer<A> {
  arbitrary: Arbitrary<A>;
  collection: FluentPick<A>[];
  pickNum: number;
  cache?: FluentPick<A>[];
}

// Interface to describe the configuration properties
interface StrategyConfiguration {
  sampleSize: number;
  shrinkSize: number;
}

// Define a constructor type for use with mixins
type MixinConstructor<T = {}> = new (...args: any[]) => T
// Define a base type for the strategy constructor
type MixinStrategy = MixinConstructor<FluentStrategy>

// Base class with the common properties to be used by the mixins
abstract class MixinBase {
  arbitraries: Record<string, ArbitraryContainer<any>> = {};
  configuration: StrategyConfiguration = {
    sampleSize: 100,
    shrinkSize: 100
  };
  randomGenerator: { generator: () => number } = { 
    generator: () => Math.random() 
  };
  
  buildArbitraryCollection<A>(arbitrary: Arbitrary<A>, sampleSize?: number): FluentPick<A>[] {
    throw new Error('Method not implemented', {
      cause: 'Mixin method requires implementation'
    });
  }
  
  isDedupable(): boolean {
    throw new Error('Method not implemented', {
      cause: 'Mixin method requires implementation'
    });
  }
}

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
    shrink<K extends string>(arbitraryName: K, partial: FluentResult) {
      const shrinkedArbitrary = this.arbitraries[arbitraryName].arbitrary.shrink(partial.example[arbitraryName])
      this.arbitraries[arbitraryName].collection = this.buildArbitraryCollection(shrinkedArbitrary,
        this.configuration.shrinkSize!)
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
      return this.isDedupable() ? arbitrary.sampleUniqueWithBias(sampleSize!, this.randomGenerator.generator) :
        arbitrary.sampleWithBias(sampleSize!, this.randomGenerator.generator)
    }
  }
}
