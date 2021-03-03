import {Arbitrary, FluentPick} from '../arbitraries'
import {FluentConfig, FluentResult} from '../FluentCheck'
import {FluentStrategyArbitrary, MixinStrategy, StrategyArbitraries} from './types'

interface FluentStrategyInterface {

  /**
   * Determines whether there are more inputs to be used for test case generation purposes. This function can use
   * several factors (e.g. input size, time) to determine whether the generation process should be stoped or not.
   *
   * Returns true if there are still more inputs to be used; otherwise it returns false.
   */
  hasInput: <K extends string>(name: K) => boolean

  /**
   * Retrieves a new input from the arbitraries record.
   */
  getInput: <A>() => FluentPick<A>

  /**
   * When called this function marks the end of one iteration in the test case generation process. So far, this function
   * is not used but it can be used to perform several operations like keeping a list of generated test cases and save
   * them to a file or even to track coverage.
   */
  handleResult: () => void
}

export class FluentStrategy {

  /**
   * Current active arbitrary.
   */
  public currArbitrary: FluentStrategyArbitrary<any> | any = undefined

  /**
   * Record of all the arbitraries used for composing a given test case.
   */
  public arbitraries: StrategyArbitraries = {}

  /**
   * Default constructor. Receives the FluentCheck configuration, which is used for test case generation purposes.
   */
  constructor(public readonly config: FluentConfig) {}

  addArbitrary<K extends string, A>(name: K, a: Arbitrary<A>) {
    this.currArbitrary = this.arbitraries[name] = {a, pickNum: 0, collection: []}
    this.setCurrArbitraryDedupHook()
    this.setCurrArbitraryCacheHook()
  }

  setCurrArbitraryDedupHook() {}

  setCurrArbitraryCacheHook() {}

  isDedupable() { return false }

  isBiased() { return false }

  /**
   * Configures the information relative a specific arbitrary.
   */
  configArbitrary<K extends string>(name: K, partial: FluentResult | undefined, depth: number) {
    this.currArbitrary = this.arbitraries[name]

    this.currArbitrary.pickNum = 0
    this.currArbitrary.collection = []

    if (depth === 0) this.currArbitrary.collection = this.currArbitrary.cache
    else if (partial !== undefined) this.shrink(name, partial, depth)
  }

  shrink<K extends string>(name: K, partial: FluentResult | undefined, depth: number) {}
}

export function Random<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base implements FluentStrategyInterface {

    hasInput<K extends string>(name: K): boolean {
      this.currArbitrary = this.arbitraries[name]
      return this.currArbitrary !== undefined && this.currArbitrary.pickNum < this.currArbitrary.collection.length
    }

    getInput<A>(): FluentPick<A> {
      return this.currArbitrary.collection[this.currArbitrary.pickNum++]
    }

    handleResult() {}
  }
}

export function Shrinkable<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    shrink<K extends string>(name: K, partial: FluentResult | undefined, depth: number) {
      const shrinkedArbitrary = this.isDedupable() ? this.currArbitrary.dedup.shrink(partial!.example[name]) :
        this.currArbitrary.a.shrink(partial!.example[name])

      this.currArbitrary.collection = this.isBiased() ? shrinkedArbitrary.sampleWithBias(this.config.shrinkSize) :
        shrinkedArbitrary.sample(this.config.shrinkSize)
    }
  }
}

export function Dedupable<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    setCurrArbitraryDedupHook() {
      this.currArbitrary.dedup = this.currArbitrary.a.unique()
    }

    isDedupable() {
      return true
    }
  }
}

export function Cacheable<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    setCurrArbitraryCacheHook() {
      const arbitrary = this.isDedupable() ? this.currArbitrary.dedup : this.currArbitrary.a
      this.currArbitrary.cache = this.isBiased() ? arbitrary.sampleWithBias(this.config.sampleSize) :
        arbitrary.sample(this.config.sampleSize)
    }
  }
}

export function Biased<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    isBiased() {
      return true
    }
  }
}
