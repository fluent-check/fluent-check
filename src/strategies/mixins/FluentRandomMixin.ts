import {FluentResult} from '../../FluentCheck'
import {MixinStrategy} from '../FluentStrategyTypes'
import {FluentStrategyInterface} from '../FluentStrategy'
import {ValueResult, Arbitrary, FluentPick} from '../../arbitraries'

export function Random<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base implements FluentStrategyInterface {

    addArbitrary<K extends string, A>(arbitraryName: K, a: Arbitrary<A>) {
      this.arbitraries[arbitraryName] = {
        arbitrary: a,
        pickNum: 0,
        collection: []
      }

      this.setArbitraryCache(arbitraryName)
    }

    configArbitrary<K extends string, A>(arbitraryName: K, partial: FluentResult | undefined, depth: number) {
      this.arbitraries[arbitraryName].pickNum = 0
      this.arbitraries[arbitraryName].collection = []

      if (depth === 0)
        this.arbitraries[arbitraryName].collection = this.arbitraries[arbitraryName].cache !== undefined ?
          this.arbitraries[arbitraryName].cache as FluentPick<A>[]:
          this.buildArbitraryCollection(this.arbitraries[arbitraryName].arbitrary,
            this.getArbitraryExtractedConstants(this.arbitraries[arbitraryName].arbitrary))
      else if (partial !== undefined)
        this.shrink(arbitraryName, partial)
    }

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
