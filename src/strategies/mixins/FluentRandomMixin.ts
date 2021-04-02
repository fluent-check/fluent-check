import {ValueResult} from '../../arbitraries'
import {FluentStrategyInterface} from '../FluentStrategy'
import {MixinStrategy, MixinInstance} from '../FluentStrategyTypes'

export function Random<TBase extends MixinStrategy>(Base: TBase): {
  new(...a: any[]): MixinInstance;
} & TBase {
  return class extends Base implements FluentStrategyInterface {
    hasInput<K extends string>(arbitraryName: K): boolean {
      return this.arbitraries[arbitraryName] !== undefined &&
        this.arbitraries[arbitraryName].pickNum < this.arbitraries[arbitraryName].collection.length
    }

    getInput(name: string) {
      this.addInputToCurrentTestCase(name, this.arbitraries[name].collection[this.arbitraries[name].pickNum++])
    }

    /**
     * Simply adds a new test case to the testCases array.
     */
    handleResult<A>(testCase: ValueResult<A>, _inputData: {}) {
      this.addTestCase(testCase)
    }
  }
}
