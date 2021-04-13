import {FluentCheck} from '../../FluentCheck'
import {MixinStrategy} from '../FluentStrategyTypes'
import {FluentStrategyInterface} from '../FluentStrategy'
import {WrapFluentPick} from '../../arbitraries'

export function Random<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base implements FluentStrategyInterface {

    hasInput(): boolean {
      return this.testCaseCollection.length > 0
    }

    getInput(): WrapFluentPick<any> {
      this.currTestCase = this.testCaseCollection.shift() as WrapFluentPick<any>
      return this.currTestCase
    }

    handleResult(_inputData: any[]) {
      this.addTestCase(FluentCheck.unwrapFluentPick(this.currTestCase))
    }

  }
}
