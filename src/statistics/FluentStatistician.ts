import {StrategyArbitraries} from '../strategies/FluentStrategyTypes'

export type FluentStatConfig = { withTestCaseOutput: boolean }

export class FluentStatistician {

  /**
   * Reference to strategy arbitraries
   */
  public arbitraries: StrategyArbitraries = {}

  /**
   * Default constructor. Receives the FluentCheck configuration, which is used for test case generation purposes.
   */
  constructor(public readonly configuration: FluentStatConfig) {}

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
