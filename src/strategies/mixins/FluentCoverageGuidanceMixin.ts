import * as fs from 'fs'
import * as utils from './utils'
import * as schema from '@istanbuljs/schema'
import * as libInstrument from 'istanbul-lib-instrument'

import {ValueResult} from '../../arbitraries'
import {FluentCoverage} from '../FluentCoverage'
import {FluentStrategyInterface} from '../FluentStrategy'
import {MixinStrategy, MixinInstance} from '../FluentStrategyTypes'

export function CoverageGuidance<TBase extends MixinStrategy>(Base: TBase): {
  new(...a: any[]): MixinInstance;
} & TBase {
  return class extends Base implements FluentStrategyInterface {

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
      const importInfo = utils.extractImports(this.configuration.importsPath)
      let sourceData: string = importInfo.header
      const instrumentedFiles: string[] = importInfo.sourceFiles
        .map(file => {
          const fileArr = file.split('src/')
          return fileArr[0] + 'src/.instrumented/' + fileArr[1]
        })

      for (const file of instrumentedFiles) {
        const sourceFile = file.split('.instrumented/').join('') + '.ts'
        utils.writeDataToFile(file + '.ts', this.instrumenter.instrumentSync(
          fs.readFileSync(sourceFile).toString(), sourceFile))
      }

      for (const method of this.testMethods) {
        this.testMethodsNames.push(utils.generateUniqueMethodIdentifier())
        sourceData += 'export const ' + this.testMethodsNames[this.testMethodsNames.length - 1] + ' = '
          + method.toString().replace(new RegExp(/[a-zA-Z]+_\d+\./gm), '') + '\n'
      }

      utils.writeDataToFile('src/.coverage/methods.ts', this.instrumenter.instrumentSync(
        sourceData, 'src/.coverage/methods.ts'))

      this.coverageBuilder = new FluentCoverage()
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
     * TODO - The current implementation is still the same as the Random mixin and therefore needs to be changed.
     */
    hasInput<K extends string>(arbitraryName: K): boolean {
      return this.arbitraries[arbitraryName] !== undefined &&
        this.arbitraries[arbitraryName].pickNum < this.arbitraries[arbitraryName].collection.length
    }

    /**
     * TODO - The current implementation is still the same as the Random mixin and therefore needs to be changed.
     */
    getInput(name: string) {
      this.addInputToCurrentTestCase(name, this.arbitraries[name].collection[this.arbitraries[name].pickNum++])
    }

    /**
     * Computes coverage for a given test case and adds it to the testCases array.
     */
    handleResult<A>(testCase: ValueResult<A>, inputData: {}) {
      this.addTestCase(testCase)
      this.coverageBuilder.compute(inputData)
    }
  }
}
