import {performance} from 'perf_hooks'

import {MixinStrategy} from '../FluentStrategyTypes'
import {FluentStrategyInterface} from '../FluentStrategy'
import {WrapFluentPick, FluentPick} from '../../arbitraries'

export function Random<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base implements FluentStrategyInterface {

    /**
     * Generates each arbitrary collection if the cache is not active. Otherwise, it uses the cache to define
     * the arbitrary collection. Once all of the arbitrary collections are properly defined, it generates the
     * test case collection to be used during the testing process.
     */
    configArbitraries<A>() {
      this.tweakSampleSize()

      for (const name in this.arbitraries) {
        this.arbitraries[name].collection = this.arbitraries[name].cache !== undefined ?
          this.arbitraries[name].cache as FluentPick<A>[]:
          this.buildArbitraryCollection(this.arbitraries[name].arbitrary,
            this.getArbitraryExtractedConstants(this.arbitraries[name].arbitrary))
      }

      this.arbitrariesKeysIndex = Object.keys(this.arbitraries)
      this.generateTestCaseCollection()
    }

    /**
     * Returns false if either there are not still more inputs to be tested or if the defined timeout is reached.
     * Otherwise it returns true.
     */
    hasInput(): boolean {
      this.currTime = performance.now()
      if (this.configuration.timeout < this.currTime - (this.initTime ?? this.currTime)) return false
      else return this.testCaseCollectionPick < this.testCaseCollection.length
    }

    /**
     * Updates the current input being used for testing purposes and returns it.
     */
    getInput(): WrapFluentPick<any> {
      this.currTestCase = this.testCaseCollection[this.testCaseCollectionPick++] as WrapFluentPick<any>
      return this.currTestCase
    }

    /**
     * Simply adds test cases to the testCases set.
     */
    handleResult(inputData: any[]) {
      inputData.forEach(data => {
        this.addTestCase(data)
        this.getCoverageBuilder()?.compute(data)
      })

      this.getCoverageBuilder()?.updateTotalCoverage()
    }

  }
}
