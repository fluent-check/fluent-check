import {StrategyArbitraries} from '../strategies/FluentStrategyTypes'

export type FluentReporterConfig = { withTestCaseOutput: boolean, withInputSpaceCoverage: boolean }

export type FluentStatConfig = { realPrecision: number, gatherTestCases: boolean, gatherArbitraryTestCases: boolean }

export class FluentStatistician {

  /**
   * Reference to strategy arbitraries
   */
  public arbitraries: StrategyArbitraries = {}

  /**
   * Default constructor.
   */
  constructor(public readonly configuration: FluentStatConfig,
    public readonly reporterConfiguration: FluentReporterConfig) {
  }

  /**
   * This function calculates the coverage of each input.
   */
  calculateCoverages(): Record<string, number> {
    const coverages: Record<string, number> = {}
    for (const name in this.arbitraries) {
      const stArb = this.arbitraries[name]
      const coverage = stArb.arbitrary.calculateCoverage(stArb.picked.size, this.configuration.realPrecision)
      coverages[name] = Math.round(coverage * 10000000)/100000
    }
    return coverages
  }
}
