const globalObject:any = global

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as testMethods from '../.coverage/methods'
import * as libCoverage from 'istanbul-lib-coverage'

export class FluentCoverage {

  /**
   * Object that contains the coverage summary report
   */
  public coverageSummary = libCoverage.createCoverageSummary()

  /**
   * TODO - Document
   */
  compute(inputData: {}) {
    Object.keys(testMethods).forEach(methodName => {
      testMethods[methodName](inputData)
    })

    console.log(globalObject.__coverage__)

    Object.entries(globalObject.__coverage__).forEach(elem => {
      const coverageMap = libCoverage.createFileCoverage(elem[1])
      this.coverageSummary.merge(coverageMap.toSummary())
    })

    // console.log(this.coverageSummary)
  }

  /**
   * Clears the global variable responsible for holding coverage data.
   */
  resetCoverage() {
    globalObject.__coverage__ = undefined
  }

}
