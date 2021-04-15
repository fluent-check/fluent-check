import {ArbitraryCoverage} from '../arbitraries'
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
  calculateCoverages(ntestCases: number): [number, ArbitraryCoverage] {
    const coverages: ArbitraryCoverage = {}
    let scSize = 1

    for (const name in this.arbitraries) {
      const stArb = this.arbitraries[name]
      const coverage = stArb.arbitrary.calculateCoverage(stArb.picked.size, this.configuration.realPrecision)
      coverages[name] = Array.isArray(coverage) ?
        [Math.round(coverage[0] * 10000000)/100000, Math.round(coverage[1] * 10000000)/100000] :
        Math.round(coverage * 10000000)/100000
      scSize *= stArb.arbitrary.size(this.configuration.realPrecision).value
    }

    const scCoverage = ntestCases / scSize
    return [Math.round(scCoverage * 10000000)/100000, coverages]
  }
}
