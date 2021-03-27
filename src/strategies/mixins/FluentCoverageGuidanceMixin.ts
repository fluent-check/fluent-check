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
    public instrumentedFiles: Record<string, string> = {}

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

      Object.entries(this.instrumentedFiles).forEach(file => {
        console.log(file[0])
        utils.writeDataToFile(file[0] + '.ts', this.instrumenter.instrumentSync(
          fs.readFileSync(file[0] + '.ts').toString(), file[0] + '.ts'))
        this.instrumentedFiles[file[0]] = this.instrumenter.lastSourceMap().sourcesContent.join('')
      })

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
     * TODO - Document
     */
    computeCoverage(inputData: {}) {
      // this.coverageBuilder.compute(inputData)
    }

    /**
     * Removes all the temporary created files for coverage purposes.
     */
    coverageTearDown() {
      this.coverageBuilder.resetCoverage()

      Object.entries(this.instrumentedFiles).forEach(file => {
        utils.writeDataToFile(file[0] + '.ts', file[1])
      })
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
            resolvedPath = resolve(relativePath.split('../').join(''))
            this.instrumentedFiles[resolvedPath] = ''
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
