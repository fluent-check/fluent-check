import {StrategyArbitraries} from '../strategies/FluentStrategyTypes'

export type FluentReporterConfig = { withTestCaseOutput: boolean, withInputSpaceCoverage: boolean }

export type FluentStatConfig = { gatherTestCases: boolean, gatherArbitraryTestCases: boolean }

export class FluentStatistician {

  /**
   * Reference to strategy arbitraries
   */
  public arbitraries: StrategyArbitraries = {}

  /**
   * Statistician configuration
   */
  public configuration: FluentStatConfig

  /**
   * Default constructor.
   */
  constructor(public readonly reporterConfiguration: FluentReporterConfig) {
    this.configuration = {
      gatherTestCases: this.reporterConfiguration.withTestCaseOutput,
      gatherArbitraryTestCases: this.reporterConfiguration.withInputSpaceCoverage
    }
  }

  /**
   * This function calculates the coverage of each input.
   */
  calculateCoverages(): Record<string, number | undefined> {
    const coverages: Record<string, number | undefined> = {}
    for (const name in this.arbitraries) {
      const stArb = this.arbitraries[name]
      const coverage = stArb.arbitrary.calculateCoverage(stArb.picked.size)
      coverages[name] = coverage === undefined ? coverage : Math.round(coverage * 10000000)/100000
    }
    return coverages
  }
}
