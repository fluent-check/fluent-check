import {graph1D, graph2D, graphs} from '../arbitraries'
import {FluentStatistician, FluentStatConfig, FluentReporterConfig} from './FluentStatistician'

export class FluentStatisticianFactory {

  /**
   * Statistician mixin composition
   */
  private statistician = FluentStatistician

  /**
   * Reporter configuration
   */
  public repConfiguration: FluentReporterConfig = {
    withTestCaseOutput: false,
    withInputSpaceCoverage: false,
    withOutputOnSuccess: false,
    withGraphs: false
  }

  /**
   * Statistician configuration
   */
  public configuration: FluentStatConfig = {
    realPrecision: 3,
    gatherTestCases: false,
    gatherArbitraryTestCases: false,
    withDefaultGraphs: false
  }

  public graphs: graphs = {oneD: [], twoD: []}

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
  withInputSpaceCoverage() {
    this.repConfiguration = {...this.repConfiguration, withInputSpaceCoverage: true}
    this.configuration = {...this.configuration, gatherTestCases: true, gatherArbitraryTestCases: true}
    return this
  }

  /**
   * Sets the precision used to calculate the Real input space size
   */
  withPrecision(precision: number) {
    this.configuration = {...this.configuration,realPrecision: precision}
  }

  /**
   * Enables the output of information in case of success
   */
  withOutputOnSuccess() {
    this.repConfiguration = {...this.repConfiguration, withOutputOnSuccess: true}
    return this
  }

  /**
   * States that a graph should be generated using the specified indexing function that can only return
   * 1 value due to it generating a 1D graph
   */
  with1DGraph(f: graph1D | graph1D[]) {
    this.repConfiguration = {...this.repConfiguration, withGraphs: true}
    this.configuration = {...this.configuration, gatherTestCases: true}
    Array.isArray(f) ? this.graphs.oneD.push(...f) : this.graphs.oneD.push(f)
    return this
  }

  /**
   * States that a graph should be generated using the specified indexing function that can only return
   * 2 values in [x,y] form due to it generating a 2D graph
   */
  with2DGraph(f: graph2D | graph2D[]) {
    this.repConfiguration = {...this.repConfiguration, withGraphs: true}
    this.configuration = {...this.configuration, gatherTestCases: true}
    Array.isArray(f) ? this.graphs.twoD.push(...f) : this.graphs.twoD.push(f)
    return this
  }

  /**
   * Enables all options except graph related ones
   */
  withAll(precision?: number) {
    this.repConfiguration = {
      withTestCaseOutput: true,
      withInputSpaceCoverage: true,
      withOutputOnSuccess: true,
      withGraphs: false
    }
    this.configuration = {
      realPrecision: 3,
      gatherTestCases: true,
      gatherArbitraryTestCases: true,
      withDefaultGraphs: false
    }
    if (precision !== undefined)
      this.configuration = {...this.configuration,realPrecision: precision}
    return this
  }

  /**
   * Enables creation of default graphs
   */
  withDefaultGraphs() {
    this.repConfiguration = {...this.repConfiguration, withGraphs: true}
    this.configuration = {...this.configuration, gatherTestCases: true, withDefaultGraphs: true}
    return this
  }

  /**
   * Builds and returns the FluentStatistician with a specified configuration.
   */
  build(): FluentStatistician {
    return new this.statistician(this.configuration, this.repConfiguration, this.graphs)
  }
}
