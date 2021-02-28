import {FluentStrategyArbitrary, FluentStrategy} from './FluentStrategy'
import {Arbitrary} from '../arbitraries'
import {FluentConfig, FluentResult} from '../FluentCheck'

export class FluentRandomStrategy extends FluentStrategy {

  /**
   * Current active arbitrary.
   */
  protected currArbitrary: FluentStrategyArbitrary<any> | any = undefined

  /**
   * Contains all the arbitraries used test case generation purposes.
   */
  protected arbitraries: Record<string, FluentStrategyArbitrary<any> | any> = {}

  /**
   * Default constructor.
   */
  constructor(config: FluentConfig) {
    super(config)
  }

  /**
   * Sets the current arbitray based on the name passed as a parameter.
   */
  setCurrArbitrary<K extends string>(name: K) {
    this.currArbitrary = this.arbitraries[name]
  }

  /**
   * Adds an arbitrary to the arbitraries record
   */
  addArbitrary<K extends string, A>(name: K, dedup: Arbitrary<A>, pickNum = 0) {
    this.arbitraries[name] = {
      dedup,
      pickNum,
      collection: [],
      cache: dedup.sample(this.config.sampleSize)
    }
  }

  /**
   * Configures the arbitrary accordingly
   */
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

  /**
   * NOTE -> For this particular strategy this function only
   * generates inputs to a certain point specified by sampleSize or shrinkSize.
   * Others factors (e.g. time) can be used to determine when the
   * generation process should be stoped.
   */
  hasInput() {
    return this.currArbitrary !== undefined && this.currArbitrary.pickNum < this.currArbitrary.collection.length
  }

  getInput() {
    return this.currArbitrary.collection[this.currArbitrary.pickNum++]
  }

  /**
   * Handles the result of running a test with a certain test case.
   * When called this function marks the end of one iteration in the
   * test case generation process.
   *
   * NOTE -> This function despite not performing any kind of operation
   * for this strategy, it can be used to perform perform several
   * operations like keeping a list of generated inputs and save them to a file.
   */
  handleResult() {}
}
