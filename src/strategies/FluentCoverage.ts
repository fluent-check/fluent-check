const globalObject:any = global

import * as deasync from 'deasync'
import * as istanbulLibCoverage from 'istanbul-lib-coverage'
import {FileCoverage, CoverageSummary} from './FluentStrategyTypes'

export class FluentCoverage {

  /**
   * Imported test methods.
   */
  public testMethods

  /**
   * Object that contains the previous coverage summary report
   */
  private previousCoverageSummary = istanbulLibCoverage.createCoverageSummary()

  /**
   * Object that contains the current coverage summary report
   */
  private coverageSummary = istanbulLibCoverage.createCoverageSummary()

  /**
   * Object that contains the coverage information associated with each file involved in the testing process.
   */
  private coverageFiles: Record<string, FileCoverage> = {}

  /**
   * Determines whether .coverage/methods.ts has been imported or not.
   */
  private importStatus: Boolean = false

  /**
   * FluentCoverage constructor that dynamically imports the test methods to be used for coverage purposes.
   */
  constructor() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    import('../.coverage/methods').then(testMethods => {
      this.testMethods = testMethods
      this.importStatus = true
    })
    deasync.loopWhile(() => { return this.importStatus === false })
  }

  /**
   * Computes coverage for a given test case.
   */
  compute(inputData: {}) {
    Object.keys(this.testMethods).forEach(methodName => {
      this.testMethods[methodName](inputData)
    })

    Object.entries(globalObject.__coverage__).forEach(elem => {
      if (this.coverageFiles[elem[0]] === undefined)
        this.coverageFiles[elem[0]] = istanbulLibCoverage.createFileCoverage(elem[1])
      else
        this.coverageFiles[elem[0]].merge(istanbulLibCoverage.createFileCoverage(elem[1]))
    })

    this.previousCoverageSummary = this.coverageSummary

    this.coverageSummary = Object.entries(this.coverageFiles).reduce((acc, elem) => {
      acc.merge(elem[1].toSummary())
      return acc
    }, istanbulLibCoverage.createCoverageSummary())
  }

  /**
   * Returns the current lines' coverage percentage.
   */
  getLinesCoveragePercentage(coverageSummary = this.coverageSummary): number {
    return coverageSummary.data.lines.pct
  }

  /**
   * Returns the current statements' coverage percentage.
   */
  getStatementsCoveragePercentage(coverageSummary = this.coverageSummary): number {
    return coverageSummary.data.statements.pct
  }

  /**
   * Returns the current functions' coverage percentage.
   */
  getFunctionsCoveragePercentage(coverageSummary = this.coverageSummary): number {
    return coverageSummary.data.functions.pct
  }

  /**
   * Returns the current branches' coverage percentage.
   */
  getBranchesCoveragePercentage(coverageSummary = this.coverageSummary): number {
    return coverageSummary.data.branches.pct
  }

  /**
   * Compares two coverage summary (cs_) reports. Returns true if the first report (csA) has a greater coverage than the
   * second one (csB).
   */
  compare(csA: CoverageSummary = this.coverageSummary, csB: CoverageSummary = this.previousCoverageSummary): boolean {
    if (this.getLinesCoveragePercentage(csA) > this.getLinesCoveragePercentage(csB)
    || this.getStatementsCoveragePercentage(csA) > this.getStatementsCoveragePercentage(csB)
    || this.getFunctionsCoveragePercentage(csA) > this.getFunctionsCoveragePercentage(csB)
    || this.getBranchesCoveragePercentage(csA) > this.getBranchesCoveragePercentage(csB)) return true

    return false
  }

  /**
   * Clears the global variable responsible for holding coverage data.
   */
  resetCoverage() {
    globalObject.__coverage__ = undefined
  }

}
