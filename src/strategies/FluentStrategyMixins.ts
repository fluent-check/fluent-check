import * as espree from 'espree'
import * as glob from 'glob'
import * as fs from 'fs'
import {Arbitrary, FluentPick} from '../arbitraries'
import {FluentResult} from '../FluentCheck'
import {FluentStrategy, FluentStrategyInterface} from './FluentStrategy'
import {StrategyConstants} from './FluentStrategyTypes'

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
    shrink<K extends string>(arbitraryName: K, partial: FluentResult) {
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
      return this.isDedupable() ? arbitrary.sampleUniqueWithBias(sampleSize, this.randomGenerator.generator) :
        arbitrary.sampleWithBias(sampleSize, this.randomGenerator.generator)
    }
  }
}

export function ConstantExtractionBased<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {

    public constants: StrategyConstants = {'integer': []}

    tokenize() {
      const files = glob.sync(this.configuration.globSource + '/**/*', {nodir: true})

      for (const file of files) {
        const tokens = espree.tokenize(fs.readFileSync(file).toString('utf-8').replace(/['`]/g, '"'))
          .filter(token => token.type === 'Numeric' && !token.value.includes('.'))
          .map(token => Number.parseInt(token.value))

        this.constants['integer'] = [...new Set(this.constants['integer'].concat(tokens))]
      }
    }

  }
}
