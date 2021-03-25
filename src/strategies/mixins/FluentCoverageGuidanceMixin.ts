import * as utils from './utils'
import {MixinStrategy} from '../FluentStrategyTypes'

export function CoverageGuidance<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {

    /**
     * Function responsible for creating all the files needed so that coverage can be tracked.
     */
    coverageSetup() {
      let sourceData = utils.extractImports('test')
      let testData = 'import * as methodsFile from \'../src/.coverage/methods\'\nconst methods = ['

      for (const method of this.testMethods) {
        const methodName = utils.generateUniqueMethodIdentifier()
        testData += '\'' + methodName + '\','
        sourceData += 'export const ' + methodName + ' = ' + method.toString() + '\n'
      }

      testData = testData.slice(0,-1) + ']\nfor (const method of methods)\n  '
        + 'methodsFile[method](process.env[\'inputData\'] !== undefined ? '
        + 'JSON.parse(process.env[\'inputData\']) : {})\n'

      utils.writeDataToFile('src/.coverage/methods.ts', sourceData)
      utils.writeDataToFile('test/coverage.test.ts', testData)
    }

    /**
     * Removes all the temporary created files for coverage purposes.
     */
    coverageTearDown() {
      const paths = ['src/.coverage', 'test/coverage.test.ts', 'node_modules/.cache']

      for (const path of paths)
        utils.deleteFromFileSystem(path)
    }
  }
}

// import {execSync} from 'child_process'
//
// export function getCoverage(data: string) {
//   process.env['inputData'] = data
//   return execSync('nyc --no-clean mocha -r ts-node/register test/coverage.test.ts')
// }
