import {FluentPick, ValueResult} from '../../arbitraries'
import {FluentStrategyInterface} from '../FluentStrategy'
import {MixinStrategy} from '../FluentStrategyTypes'

export function Random<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base implements FluentStrategyInterface {
    hasInput<K extends string>(arbitraryName: K): boolean {
      return this.arbitraries[arbitraryName] !== undefined &&
        this.arbitraries[arbitraryName].pickNum < this.arbitraries[arbitraryName].collection.length
    }

    getInput<K extends string, A>(arbitraryName: K): FluentPick<A> {
      return this.arbitraries[arbitraryName].collection[this.arbitraries[arbitraryName].pickNum++]
    }

    /**
     * Simply adds a new test case to the testCases array.
     */
    handleResult<A>(testCase: ValueResult<A>, _inputData: {}) {
      this.addTestCase(testCase)
    }
  }
}
