import {ArbitraryCoverage, Graphs, IndexCollection, ScenarioCoverage, TestCases,
  ValueResult, Data1D, Data2D, CsvFilter} from '../arbitraries'
import {FluentCheck} from '../FluentCheck'
import {StrategyArbitraries} from '../strategies/FluentStrategyTypes'

export type FluentReporterConfig = {
  withTestCaseOutput: boolean,
  withInputSpaceCoverage: boolean,
  withOutputOnSuccess: boolean,
  withGraphs: boolean,
  csvPath?: string,
  csvFilter?: CsvFilter,
  graphsPath?: string
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
    public graphs: Graphs) {
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
  calculateIndexes(testCases: TestCases): IndexCollection {
    const indexesCollection: IndexCollection = {oneD: [], twoD: []}
    const values = testCases.unwrapped
    const original = testCases.wrapped.map(e => FluentCheck.unwrapFluentPickOriginal(e))
    const times = testCases.time
    const results = testCases.result

    const sizes: ValueResult<number> = {}
    for (const k in this.arbitraries)
      sizes[k] = this.arbitraries[k].arbitrary.size(this.configuration.realPrecision).credibleInterval[1]

    if (this.configuration.withDefaultGraphs)
      for (const k in this.arbitraries) {
        const indexes: Data1D[] = []
        const repeated: Map<string, number> = new Map()
        for (const i in original) {
          const input = {value: values[i][k], original: original[i][k]}
          const value = this.arbitraries[k].arbitrary.calculateIndex(input, this.configuration.realPrecision)
          indexes.push({value})
          repeated.set(JSON.stringify(value), (repeated.get(JSON.stringify(value)) ?? 0) + 1)
        }
        indexesCollection.oneD.push(
          {path: (this.reporterConfiguration.graphsPath ?? '') + k + '.svg', indexes, repeated}
        )
      }

    for (const g of this.graphs.oneD) {
      const indexes: Data1D[] = []
      const repeated: Map<string, number> = new Map()
      for (const i in original) {
        const index = g.func(original[i], sizes, times[i], results[i])
        if (index !== undefined && index.value !== undefined) {
          indexes.push(index)
          repeated.set(JSON.stringify(index.value), (repeated.get(JSON.stringify(index.value)) ?? 0) + 1)
        }
      }
      indexesCollection.oneD.push({path: g.path, indexes, repeated})
    }

    for (const g of this.graphs.twoD) {
      const indexes: Data2D[] = []
      const repeated: Map<string, number> = new Map()
      for (const i in original) {
        const index = g.func(original[i], sizes, times[i], results[i])
        if (index !== undefined && index.valueX !== undefined && index.valueY !== undefined) {
          indexes.push(index)
          repeated.set(JSON.stringify([index.valueX, index.valueY]),
            (repeated.get(JSON.stringify([index.valueX, index.valueY])) ?? 0) + 1)
        }
      }
      indexesCollection.twoD.push({path: g.path, indexes, repeated})
    }

    return indexesCollection
  }
}
