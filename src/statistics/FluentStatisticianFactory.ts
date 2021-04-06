import {FluentStatistician, FluentStatConfig} from './FluentStatistician'

export class FluentStatisticianFactory {

  /**
   * Statistician mixin composition
   */
  private statistician = FluentStatistician

  /**
   * Strategy configuration
   */
  public configuration: FluentStatConfig = {withTestCaseOutput: false}

  /**
   * Enables the gathering of information and presentation of statistics which results in higher execution time.
   */
  withTestCaseOutput() {
    this.configuration = {...this.configuration, withTestCaseOutput: true}
    return this
  }

  /**
   * Builds and returns the FluentStrategy with a specified configuration.
   */
  build(): FluentStatistician {
    return new this.statistician(this.configuration)
  }

}
