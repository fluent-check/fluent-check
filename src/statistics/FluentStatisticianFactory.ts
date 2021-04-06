import {FluentStatistician, FluentReporterConfig} from './FluentStatistician'

export class FluentStatisticianFactory {

  /**
   * Statistician mixin composition
   */
  private statistician = FluentStatistician

  /**
   * Statistician configuration
   */
  public configuration: FluentReporterConfig = {withTestCaseOutput: false, withInputSpaceCoverage: false}

  /**
   * Enables the gathering of information and presentation of statistics which results in higher execution time.
   */
  withTestCaseOutput() {
    this.configuration = {...this.configuration, withTestCaseOutput: true}
    return this
  }

  /**
   * Enables the calculation and output of input space coverage
   */
  withInputSpaceCoverage() {
    this.configuration = {...this.configuration, withInputSpaceCoverage: true}
    return this
  }

  /**
   * Builds and returns the FluentStatistician with a specified configuration.
   */
  build(): FluentStatistician {
    return new this.statistician(this.configuration)
  }

}
