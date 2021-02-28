import {Arbitrary} from '../arbitraries'
import {FluentResult} from '../FluentCheck'
import {FluentRandomStrategy} from './FluentRandomStrategy'

export class FluentBiasedRandomStrategy extends FluentRandomStrategy {

  addArbitrary<K extends string, A>(name: K, dedup: Arbitrary<A>, pickNum = 0) {
    this.arbitraries[name] = {
      dedup,
      pickNum,
      collection: [],
      cache: dedup.sampleWithBias(this.config.sampleSize)
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
        .sampleWithBias(this.config.shrinkSize)
    else
      this.currArbitrary.collection = []
  }
}
