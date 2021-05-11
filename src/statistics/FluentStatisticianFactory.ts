import {Graph1D, Graph2D, Graphs, CsvFilter} from '../arbitraries'
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
    withGraphs: false,
    csvPath: undefined,
    csvFilter: undefined,
    graphsPath: undefined
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

  public graphs: Graphs = {oneD: [], twoD: []}

  /**
   * Enables the gathering of information and presentation of statistics which results in higher execution time.
   */
  withTestCaseOutput(csvPath?: string, csvFilter?: CsvFilter) {
    if (csvPath !== undefined)
      csvPath += '.csv'
    this.repConfiguration = {...this.repConfiguration, withTestCaseOutput: true, csvPath, csvFilter}
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
  with1DGraph(f: Graph1D, graphPath?: string) {
    if (graphPath !== undefined)
      graphPath += '.svg'
    this.repConfiguration = {...this.repConfiguration, withGraphs: true}
    this.configuration = {...this.configuration, gatherTestCases: true}
    this.graphs.oneD.push({path: graphPath, func: f})
    return this
  }

  /**
   * States that a graph should be generated using the specified indexing function that can only return
   * 2 values in [x,y] form due to it generating a 2D graph
   */
  with2DGraph(f: Graph2D, graphPath?: string) {
    if (graphPath !== undefined)
      graphPath += '.svg'
    this.repConfiguration = {...this.repConfiguration, withGraphs: true}
    this.configuration = {...this.configuration, gatherTestCases: true}
    this.graphs.twoD.push({path: graphPath, func: f})
    return this
  }

  /**
   * Enables all options except graph related ones
   */
  withAll(csvPath?: string, csvFilter?: CsvFilter) {
    if (csvPath !== undefined)
      csvPath += '.csv'
    this.repConfiguration = {
      ...this.repConfiguration,
      ...{
        withTestCaseOutput: true,
        withInputSpaceCoverage: true,
        withOutputOnSuccess: true,
        csvPath,
        csvFilter
      }
    }
    this.configuration = {
      ...this.configuration,
      ...{
        gatherTestCases: true,
        gatherArbitraryTestCases: true
      }
    }
    return this
  }

  /**
   * Enables creation of default graphs
   */
  withDefaultGraphs(graphsPath?: string) {
    if (graphsPath !== undefined)
      graphsPath += '/'
    this.repConfiguration = {...this.repConfiguration, withGraphs: true, graphsPath}
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
