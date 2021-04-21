import {FluentCheck} from '../../FluentCheck'
import {MixinStrategy} from '../FluentStrategyTypes'
import {FluentStrategyInterface} from '../FluentStrategy'
import {WrapFluentPick} from '../../arbitraries'

export function Random<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base implements FluentStrategyInterface {

    hasInput(): boolean {
      return this.testCaseCollectionPick < this.testCaseCollection.length
    }

    getInput(): WrapFluentPick<any> {
      this.currTestCase = this.testCaseCollection[this.testCaseCollectionPick++] as WrapFluentPick<any>
      return this.currTestCase
    }

    handleResult(_inputData: any[]) {
      this.addTestCase(FluentCheck.unwrapFluentPick(this.currTestCase))
    }

  }
}
