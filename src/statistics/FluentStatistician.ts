import {ArbitraryCoverage, ScenarioCoverage, ValueResult} from '../arbitraries'
import {StrategyArbitraries} from '../strategies/FluentStrategyTypes'

export type FluentReporterConfig = {
  withTestCaseOutput: boolean,
  withInputSpaceCoverage: boolean,
  withOutputOnSuccess: boolean,
  withConfidenceLevel: boolean,
  withGraphics: boolean
}

export type FluentStatConfig = {
  realPrecision: number,
  gatherTestCases: boolean,
  gatherArbitraryTestCases: boolean,
  calculateInputScenarioIndexes: boolean
}

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
  calculateCoverages(ntestCases: number): [ScenarioCoverage, ArbitraryCoverage] {
    const coverages: ArbitraryCoverage = {}
    const scInterval = [1, 1]
    let scSize = 1
    let scType = 'exact'

    for (const name in this.arbitraries) {
      const stArb = this.arbitraries[name]
      const coverage = stArb.arbitrary.calculateCoverage(stArb.picked.size, this.configuration.realPrecision)
      coverages[name] = Array.isArray(coverage) ?
        [Math.round(coverage[1] * 10000000)/100000, Math.round(coverage[0] * 10000000)/100000] :
        Math.round(coverage * 10000000)/100000

      const strArbSz = stArb.arbitrary.size(this.configuration.realPrecision)
      scSize *= strArbSz.value
      scType = scType === 'exact' && strArbSz.type === 'exact' ? 'exact' : 'estimated'
      scInterval[0] *= strArbSz.credibleInterval[0]
      scInterval[1] *= strArbSz.credibleInterval[1]
    }

    const scCoverage: ScenarioCoverage = scType === 'exact' ?
      Math.round(ntestCases / scSize * 10000000)/100000 :
      [Math.round(ntestCases / scInterval[1] * 10000000)/100000,
        Math.round(ntestCases / scInterval[0] * 10000000)/100000]

    return [scCoverage, coverages]
  }

  calculateInputScenarioIndexes(testCases: ValueResult<any>[]) {
    const arbSizes = {}
    for (const k in this.arbitraries)
      arbSizes[k] = this.arbitraries[k].arbitrary.size(this.configuration.realPrecision).credibleInterval[1]

    const indexedTestCases: number[] = testCases.map(x => {
      let testIdx = 0
      const prev: string[] = []
      for (const k in x) {
        let arbIdx = x[k].index
        prev.forEach(p => {
          arbIdx *= arbSizes[p]
        })
        testIdx += arbIdx
        prev.push(k)
      }
      return testIdx
    })

    return indexedTestCases
  }

  /**
   * This function calculates the confidence level of the scenario
   */
  calculateConfidenceLevel(indexes: number[]) {
    const n = indexes.length
    const mean = indexes.reduce((acc, idx) => acc + idx, 0)/n
    const stdDev = () => {
      let sum = 0
      indexes.forEach(idx => { sum += Math.abs(idx - mean) ** 2 })
      return Math.sqrt(sum / n)
    }
    const max = Math.max.apply(null, indexes)
    const confIntHalf = max - mean

    const z = confIntHalf * Math.sqrt(n) / stdDev()

    return z
  }
}
