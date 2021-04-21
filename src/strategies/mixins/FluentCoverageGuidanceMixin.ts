import * as fs from 'fs'
import * as utils from './utils'
import * as schema from '@istanbuljs/schema'
import * as libInstrument from 'istanbul-lib-instrument'

import {performance} from 'perf_hooks'
import {FluentCoverage} from '../FluentCoverage'
import {MixinStrategy} from '../FluentStrategyTypes'
import {WrapFluentPick} from '../../arbitraries'
import {FluentStrategyInterface} from '../FluentStrategy'

export function CoverageGuidance<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base implements FluentStrategyInterface {

    /**
     * Contains all the created names for the test methods.
     */
    private testMethodsNames: string[] = []

    /**
     * Indicates whether the current test case collection inputs are the result of a mutation or not.
     */
    private testCaseCollectionMutationStatus = false

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
     * Generates each arbitrary seed collection, which is based on the arbitrary corner cases and extracted
     * constants from the code, and defines the arbitrary collection as equal to the previous and already
     * defined seed collection. Once all of the arbitrary collections are properly defined, it generates the
     * test case collection to be used during the testing process.
     */
    configArbitraries() {
      for (const name in this.arbitraries) {
        this.arbitraries[name].seedCollection = this.arbitraries[name].arbitrary.cornerCases().concat(
          this.getArbitraryExtractedConstants(this.arbitraries[name].arbitrary))
        this.arbitraries[name].collection = this.arbitraries[name].seedCollection
      }

      this.arbitrariesKeysIndex = Object.keys(this.arbitraries)
      this.generateTestCaseCollection()
    }

    /**
     * Returns false if either the minimum coverage or defined timeout are reached. Otherwise, it checks
     * whether a new test case collection should be created or not, and creates it if needed through a
     * series of mutations applied to each arbitrary seed collection. Regardless of the need for creating
     * a test case collection, it ends up returning true.
     */
    hasInput(): boolean {
      this.currTime = performance.now()

      if (this.coverageBuilder.getTotalCoverage() >= this.configuration.coveragePercentage ||
        this.configuration.timeout < this.currTime - (this.initTime ?? this.currTime)) return false
      else if (this.testCaseCollectionPick >= this.testCaseCollection.length) {
        for (const name in this.arbitraries) {
          this.arbitraries[name].collection = []
          for (const input of this.arbitraries[name].seedCollection)
            this.arbitraries[name].collection.push(... this.arbitraries[name].arbitrary
              .mutate(input, this.randomGenerator.generator, this.configuration.maxNumMutations))
        }
        this.testCaseCollectionPick = 0
        this.testCaseCollectionMutationStatus = true
        this.generateTestCaseCollection()
      }

      return true
    }

    /**
     * Updates the current input being used for testing purposes and returns it.
     */
    getInput(): WrapFluentPick<any> {
      this.currTestCase = this.testCaseCollection[this.testCaseCollectionPick++] as WrapFluentPick<any>
      return this.currTestCase
    }

    /**
     * Computes coverage for a given test case and adds it to the testCases array. It also checks if the test
     * case should be favored and its inputs added to the respective arbitrary seed collection.
     */
    handleResult(inputData: any[]) {
      inputData.forEach(data => {
        this.addTestCase(data)
        this.coverageBuilder.compute(data)
      })

      this.coverageBuilder.updateTotalCoverage()

      if (this.testCaseCollectionMutationStatus && this.coverageBuilder.compare())
        for (const name in this.arbitraries)
          this.arbitraries[name].seedCollection = [... new Set(this.arbitraries[name].seedCollection
            .concat([this.currTestCase[name]]))]
    }

  }
}
