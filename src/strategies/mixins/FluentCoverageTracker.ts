import * as fs from 'fs'
import * as utils from './utils'
import * as schema from '@istanbuljs/schema'
import * as libInstrument from 'istanbul-lib-instrument'

import {FluentCoverage} from '../FluentCoverage'
import {MixinStrategy} from '../FluentStrategyTypes'

export function CoverageTracker<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {

    /**
     * Contains all the created names for the test methods.
     */
    private testMethodsNames: string[] = []

    /**
     * Instrumenter object.
     */
    private instrumenter = libInstrument.createInstrumenter({
      parserPlugins: schema.defaults.nyc.parserPlugins.concat('typescript')
    })

    /**
     * Coverage object responsible for computing and managing coverage
     */
    private coverageBuilder!: FluentCoverage

    /**
     * Function responsible for creating all the files needed so that coverage can be tracked.
     */
    protected coverageSetup() {
      const coverageID = utils.generateUniqueMethodIdentifier()
      const importInfo = utils.extractImports(this.configuration.importsPath, coverageID)
      let sourceData: string = importInfo.header
      const instrumentedFiles: string[] = importInfo.sourceFiles
        .map(file => {
          const fileArr = file.split('src/')
          return fileArr[0] + 'src/.instrumented/' + coverageID + '/' + fileArr[1]
        })

      for (const file of instrumentedFiles) {
        const sourceFile = file.split('.instrumented/' + coverageID + '/').join('') + '.ts'
        utils.writeDataToFile(file + '.ts', this.instrumenter.instrumentSync(
          fs.readFileSync(sourceFile).toString(), sourceFile))
      }

      for (const method of this.testMethods) {
        this.testMethodsNames.push(utils.generateUniqueMethodIdentifier())
        sourceData += 'export const ' + this.testMethodsNames[this.testMethodsNames.length - 1] + ' = '
          + method.toString().replace(new RegExp(/[a-zA-Z]+_\d+\./gm), '') + '\n'
      }

      utils.writeDataToFile('src/.coverage/' + coverageID + '.ts', this.instrumenter.instrumentSync(
        sourceData, 'src/.coverage/' + coverageID + '.ts'))

      this.coverageBuilder = new FluentCoverage(coverageID + '.ts')
    }

    /**
     * Resets the coverage global variable and removes all the files used for coverage purposes.
     */
    protected coverageTearDown() {
      const paths = ['./src/.coverage', './src/.instrumented']
      this.coverageBuilder.resetCoverage()

      for (const path of paths)
        utils.deleteFromFileSystem(path)
    }

    /**
     * Returns the instance responsible for tracking coverage.
     */
    protected getCoverageBuilder(): FluentCoverage | undefined {
      return this.coverageBuilder
    }

    /**
     * Returns the coverage builder coverage summary report.
     */
    getCoverage(): number {
      return this.coverageBuilder.getTotalCoverage()
    }
  }
}
