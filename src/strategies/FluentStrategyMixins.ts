import * as espree from 'espree'
import * as glob from 'glob'
import * as fs from 'fs'
import {Arbitrary, FluentPick} from '../arbitraries'
import {FluentResult} from '../FluentCheck'
import {FluentStrategy, FluentStrategyInterface} from './FluentStrategy'
import {StrategyExtractedConstants} from './FluentStrategyTypes'

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
    shrink<K extends string>(arbitraryName: K, partial: FluentResult | undefined) {
      const shrinkedArbitrary = this.arbitraries[arbitraryName].arbitrary.shrink(partial!.example[arbitraryName])
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
    setArbitraryCache<K extends string, A>(arbitraryName: K) {
      if (this.arbitraries[arbitraryName].cache === undefined)
        this.arbitraries[arbitraryName].cache = this.buildArbitraryCollection(this.arbitraries[arbitraryName].arbitrary)
    }
  }
}

export function Biased<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    buildArbitraryCollection<A>(arbitrary: Arbitrary<A>, sampleSize = this.configuration.sampleSize): FluentPick<A>[] {
      return this.isDedupable() ? arbitrary.sampleUniqueWithBias(sampleSize) : arbitrary.sampleWithBias(sampleSize)
    }
  }
}

export function ConstantExtractionBased<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {

    /**
     * Indicates whether the extraction process was already performed (True) or not (False).
     */
    public extractionStatus = false

    /**
     * Record that contains all the constants extracted.
     */
    public constants: StrategyExtractedConstants = {'integer': []}

    /**
     * Tokenizes either the file or function passed as parameter. So far it only extract integer constants due to
     * internal limitations and complexity of dealing with other constants.
     */
    tokenize(data: Buffer | ((...args: any[]) => boolean)) {
      return espree.tokenize(data.toString('utf-8').replace(/['`]/g, '"'))
        .filter(token => token.type === 'Numeric' && !token.value.includes('.'))
        .map(token => Number.parseInt(token.value))
    }

    /**
     * Extracts the constants from a set of functions and files and returns an array of FluentPicks.
     */
    extractConstants() {
      for (const assertion of this.assertions)
        this.constants['integer'] = [...new Set(this.constants['integer'].concat(this.tokenize(assertion)))]

      if (this.configuration.globSource !== '') {
        const files = glob.sync(this.configuration.globSource + '/**/*', {nodir: true})

        for (const file of files)
          // eslint-disable-next-line max-len
          this.constants['integer'] = [...new Set(this.constants['integer'].concat(this.tokenize(fs.readFileSync(file))))]
      }
    }

    getArbitraryExtractedConstants<A>(arbitrary: Arbitrary<A>): FluentPick<A>[] {
      if (!this.extractionStatus)
        this.extractConstants()

      const extractedConstants: Array<FluentPick<A>> = []

      if (arbitrary.toString().includes('Integer Arbitrary'))
        for (const elem of this.constants['integer'])
          if (arbitrary.canGenerate({value: elem, original: elem}))
            extractedConstants.push({value: elem, original: elem})

      return extractedConstants
    }

  }
}
