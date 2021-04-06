import {FluentStatistician, FluentStatConfig, FluentReporterConfig} from './FluentStatistician'

export class FluentStatisticianFactory {

  /**
   * Statistician mixin composition
   */
  private statistician = FluentStatistician

  /**
   * Reporter configuration
   */
  public repConfiguration: FluentReporterConfig = {withTestCaseOutput: false, withInputSpaceCoverage: false}

  /**
   * Statistician configuration
   */
  public configuration: FluentStatConfig = {realPrecision: 3, gatherTestCases: false, gatherArbitraryTestCases: false}

  /**
   * Enables the gathering of information and presentation of statistics which results in higher execution time.
   */
  withTestCaseOutput() {
    this.repConfiguration = {...this.repConfiguration, withTestCaseOutput: true}
    this.configuration = {...this.configuration, gatherTestCases: true}
    return this
  }

  /**
   * Enables the calculation and output of input space coverage. Allows the specification of the amount of
   * decimal places to use when calculating coverage ofreal type arbitraries
   */
  withInputSpaceCoverage(precision?: number) {
    this.repConfiguration = {...this.repConfiguration, withInputSpaceCoverage: true}
    this.configuration = {...this.configuration, gatherArbitraryTestCases: true}
    if (precision !== undefined)
      this.configuration = {...this.configuration,realPrecision: precision}
    return this
  }

  /**
   * Builds and returns the FluentStatistician with a specified configuration.
   */
  build(): FluentStatistician {
    return new this.statistician(this.configuration, this.repConfiguration)
  }

}
