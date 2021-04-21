import * as fs from 'fs'
import * as glob from 'glob'
import * as utils from './utils'
import * as schema from '@istanbuljs/schema'
import * as libInstrument from 'istanbul-lib-instrument'

import {resolve} from 'path'
import {FluentPick, ValueResult} from '../../arbitraries'
import {MixinStrategy} from '../FluentStrategyTypes'
import {FluentCoverage} from '../FluentCoverage'
import {FluentStrategyInterface} from '../FluentStrategy'

export function CoverageGuidance<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base implements FluentStrategyInterface {

    /**
     * Contains all the created names for the test methods.
     */
    public testMethodsNames: string[] = []

    /**
     * Contains a record of all instrument files and their associated source map.
     */
    public instrumentedFiles: string[] = []

    /**
     * Instrumenter object.
     */
    public instrumenter = libInstrument.createInstrumenter({
      parserPlugins: schema.defaults.nyc.parserPlugins.concat('typescript')
    })

    /**
     * Coverage object responsible for computing and managing coverage
     */
    public coverageBuilder!: FluentCoverage

    /**
     * Function responsible for creating all the files needed so that coverage can be tracked.
     */
    coverageSetup() {
      let sourceData = this.extractImports(this.configuration.importsPath)

      for (const file of this.instrumentedFiles) {
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
    coverageTearDown() {
      const paths = ['./src/.coverage', './src/.instrumented']
      this.coverageBuilder.resetCoverage()

      for (const path of paths)
        utils.deleteFromFileSystem(path)
    }

    /**
     * Extracts all the imports from a given file or directory and returns a string containing a concise version of the
     * imports found with the relative paths converted into absolute ones.
     */
    extractImports(path: string) {
      const files = fs.lstatSync(path).isDirectory() ?
        glob.sync(path + '/**/*', {nodir: true}) : [path]

      const imports = {}

      for (const file of files) {
        const data = fs.readFileSync(file).toString().split('describe')[0].split('\n')
        const importData = data.filter(x => !x.startsWith('//') && x.includes('import'))

        for (const x of importData) {
          const relativePath = x.substring(x.indexOf('\'') + 1, x.length - 1) as string
          let resolvedPath = relativePath

          if (relativePath.includes('/') && !relativePath.includes('@')) {
            const pathArr = resolve(relativePath.split('../').join('')).split('src/')
            resolvedPath = pathArr[0] + 'src/.instrumented/' + pathArr[1]
            this.instrumentedFiles.push(resolvedPath)
          }

          const X = x.split('\'')[0].concat('\'' + resolvedPath + '\'')

          if (imports[resolvedPath] === undefined) imports[resolvedPath] = X
          else imports[resolvedPath] = imports[resolvedPath].length < X.length ? X : imports[resolvedPath]
        }
      }

      let header = ''
      Object.entries(imports).forEach(element => { header += element[1] + '\n' })
      return header + '\n'
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
    getInput<K extends string, A>(arbitraryName: K): FluentPick<A> {
      return this.arbitraries[arbitraryName].collection[this.arbitraries[arbitraryName].pickNum++]
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
