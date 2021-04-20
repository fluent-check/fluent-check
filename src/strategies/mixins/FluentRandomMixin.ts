import {performance} from 'perf_hooks'

import {MixinStrategy} from '../FluentStrategyTypes'
import {FluentStrategyInterface} from '../FluentStrategy'
import {WrapFluentPick, FluentPick} from '../../arbitraries'

export function Random<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base implements FluentStrategyInterface {

    configArbitraries<A>() {
      for (const name in this.arbitraries) {
        this.arbitraries[name].collection = this.arbitraries[name].cache !== undefined ?
          this.arbitraries[name].cache as FluentPick<A>[]:
          this.buildArbitraryCollection(this.arbitraries[name].arbitrary,
            this.getArbitraryExtractedConstants(this.arbitraries[name].arbitrary))
      }

      this.arbitrariesKeysIndex = Object.keys(this.arbitraries)
      this.generateTestCaseCollection()
    }

    hasInput(): boolean {
      this.currTime = performance.now()
      if (this.configuration.timeout < this.currTime - (this.initTime ?? this.currTime)) return false
      else return this.testCaseCollectionPick < this.testCaseCollection.length
    }

    getInput(): WrapFluentPick<any> {
      this.currTestCase = this.testCaseCollection[this.testCaseCollectionPick++] as WrapFluentPick<any>
      return this.currTestCase
    }

    handleResult(inputData: any[]) {
      inputData.forEach(data => this.addTestCase(data))
    }

  }
}
