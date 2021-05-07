import {ArbitraryCoverage, graphs, indexCollection, ScenarioCoverage, TestCases, ValueResult} from '../arbitraries'
import {FluentCheck} from '../FluentCheck'
import {StrategyArbitraries} from '../strategies/FluentStrategyTypes'

export type FluentReporterConfig = {
  withTestCaseOutput: boolean,
  withInputSpaceCoverage: boolean,
  withOutputOnSuccess: boolean,
  withGraphs: boolean
}

export type FluentStatConfig = {
  realPrecision: number,
  gatherTestCases: boolean,
  gatherArbitraryTestCases: boolean,
  withDefaultGraphs: boolean
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
    public readonly reporterConfiguration: FluentReporterConfig,
    public graphs: graphs) {
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

  /**
   * Calculates indexes using the defined functions and organizes them
   */
  calculateIndexes(testCases: TestCases): indexCollection {
    const indexesCollection: indexCollection = {oneD: [], twoD: []}
    const values = testCases.unwrapped
    const original = testCases.wrapped.map(e => FluentCheck.unwrapFluentPickOriginal(e))
    const times = testCases.time
    const results = testCases.result

    const sizes: ValueResult<number> = {}
    for (const k in this.arbitraries)
      sizes[k] = this.arbitraries[k].arbitrary.size(this.configuration.realPrecision).credibleInterval[1]

    if (this.configuration.withDefaultGraphs)
      for (const k in this.arbitraries) {
        const indexes: number[] = []
        for (const i in original) {
          const val = {value: values[i][k], original: original[i][k]}
          indexes.push(this.arbitraries[k].arbitrary.calculateIndex(val, this.configuration.realPrecision))
        }
        indexesCollection.oneD.push(indexes)
      }
    for (const f of this.graphs.oneD) {
      const indexes: number[] = []
      for (const i in original)
        indexes.push(f(original[i], sizes, times[i], results[i]))
      indexesCollection.oneD.push(indexes)
    }

    for (const f of this.graphs.twoD) {
      const indexes: [number, number][] = []
      for (const i in original)
        indexes.push(f(original[i], sizes, times[i], results[i]))
      indexesCollection.twoD.push(indexes)
    }

    return indexesCollection
  }
}
