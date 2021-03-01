import {FluentStrategyArbitrary, FluentStrategy} from './FluentStrategy'
import {Arbitrary} from '../arbitraries'
import {FluentConfig, FluentResult} from '../FluentCheck'

export class FluentRandomStrategy extends FluentStrategy {

  constructor(config: FluentConfig) {
    super(config)
  }

  addArbitrary<K extends string, A>(name: K, dedup: Arbitrary<A>) {
    this.arbitraries[name] = {
      dedup,
      pickNum: 0,
      collection: [],
      cache: dedup.sample(this.config.sampleSize)
    }
  }

  configArbitrary<K extends string>(name: K, partial: FluentResult | undefined, depth: number) {
    this.setCurrArbitrary(name)
    this.currArbitrary.pickNum = 0

    if (depth === 0)
      this.currArbitrary.collection = this.currArbitrary.cache
    else if (partial !== undefined)
      this.currArbitrary.collection = this.currArbitrary.dedup
        .shrink(partial.example[name])
        .sample(this.config.shrinkSize)
    else
      this.currArbitrary.collection = []
  }

  hasInput() {
    return this.currArbitrary !== undefined && this.currArbitrary.pickNum < this.currArbitrary.collection.length
  }

  getInput() {
    return this.currArbitrary.collection[this.currArbitrary.pickNum++]
  }

  handleResult() {}
}
