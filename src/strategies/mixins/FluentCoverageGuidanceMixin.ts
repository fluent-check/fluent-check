import * as fs from 'fs'
import * as glob from 'glob'
import * as utils from './utils'
import * as schema from '@istanbuljs/schema'
import * as libInstrument from 'istanbul-lib-instrument'

import {resolve} from 'path'
import {MixinStrategy} from '../FluentStrategyTypes'
import {FluentCoverage} from '../FluentCoverage'

export function CoverageGuidance<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {

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
     * // TODO - .coverage/methods.ts must exist before running
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
     * Computes coverage for a given test case.
     */
    computeCoverage(inputData: {}) {
      this.coverageBuilder.compute(inputData)
    }

    /**
     * Resets the coverage global variable, removes the instrumented files and cleans the content of the
     * methods.ts file.
     */
    coverageTearDown() {
      this.coverageBuilder.resetCoverage()

      utils.deleteFromFileSystem('./src/.instrumented')
      utils.writeDataToFile('./src/.coverage/methods.ts', '')
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
  }
}
