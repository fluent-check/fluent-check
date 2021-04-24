import {ArbitraryCoverage, ScenarioCoverage, ValueResult} from '../arbitraries'
import {StrategyArbitraries} from '../strategies/FluentStrategyTypes'

export type FluentReporterConfig = {
  withTestCaseOutput: boolean,
  withInputSpaceCoverage: boolean,
  withOutputOnSuccess: boolean,
  withConfidenceLevel: boolean
}

export type FluentStatConfig = {
  realPrecision: number,
  gatherTestCases: boolean,
  gatherArbitraryTestCases: boolean
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

  /**
   * This function calculates the confidence level of the scenario
   */
  calculateConfidenceLevel(testCases: ValueResult<any>[]) {
    const indexedTestCases: number[] = testCases.map(x => {
      let idx = 0
      const prev: string[] = []
      for(const k in x){
        let org = x[k].original
        console.log(org)
        if(Array.isArray(org)){
          const subArbSize = this.arbitraries[k].arbitrary.arbitrary.size(this.configuration.realPrecision).credibleInterval[1]
          org = org.reduce((acc, n) => [acc[0] + n * subArbSize ** acc[1], acc[1] + 1], [0, 0])[0]
        }
        console.log(org)
        prev.forEach(p => {
          org *= this.arbitraries[p].arbitrary.size(this.configuration.realPrecision).credibleInterval[1]
          console.log(this.arbitraries[p].arbitrary.size(this.configuration.realPrecision).credibleInterval[1])
        })
        console.log(org)
        idx += org
        prev.push(k)
        console.log('-')
      }
      console.log(idx)
      console.log('---')
      return idx
    })

    return 0
  }
}
