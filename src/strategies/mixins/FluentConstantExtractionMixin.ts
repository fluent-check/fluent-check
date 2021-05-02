
import * as espree from 'espree'
import * as glob from 'glob'
import * as fs from 'fs'
import * as utils from './utils'
import * as fc from '../../index'
import {Arbitrary, FluentPick} from '../../arbitraries'
import {MixinStrategy, StrategyExtractedConstants, Token} from '../FluentStrategyTypes'

export function ConstantExtractionBased<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {

    /**
     * Indicates whether the extraction process was already performed (True) or not (False).
     */
    private extractionStatus = false

    /**
     * Record that contains all the constants extracted.
     */
    private constants: StrategyExtractedConstants = {'numeric': [] as number[], 'string': [] as string[]}

    /**
     * Tokenizes either the file or function passed as parameter.
     */
    private tokenize(data: Buffer | ((...args: any[]) => boolean)) {
      const tokens = espree.tokenize(data.toString('utf-8'))
      this.parseNumericTokens(tokens)
      this.parseStringTokens(tokens)
    }

    /**
     * Parses the numeric tokens already extracted from code.
     */
    private parseNumericTokens(tokens: Token[]) {
      if (this.constants['numeric'].length > this.configuration.maxNumConst) return

      const filteredTokens = tokens.filter(token => {
        return token.type === 'Punctuator' || token.type === 'Numeric'
      })

      const numericsAndPunctuators = filteredTokens.reduce(function (acc, token, index) {
        if (token.type === 'Numeric') {
          const leftPunctuatorIndex = filteredTokens[index - 1] !== undefined &&
            filteredTokens[index - 1].value !== '-' ? 1 : 2

          acc.push(
            {
              punctuator: filteredTokens[index - leftPunctuatorIndex],
              numeric: leftPunctuatorIndex === 1 ? filteredTokens[index].value : '-' + filteredTokens[index].value
            },
            {punctuator: filteredTokens[index + 1], numeric: filteredTokens[index].value}
          )
        }
        return acc
      }, [])

      const constants: number[] = []

      for (const pair of numericsAndPunctuators) {
        if (pair.punctuator === undefined) continue

        const value = pair.numeric.includes('.') === true ?
          Number.parseFloat(pair.numeric) :
          Number.parseInt(pair.numeric)

        const decimals = utils.countDecimals(value)
        const increment = 1000 / (1000 * 10 ** decimals)

        constants.push(value, +(value + increment).toFixed(decimals), +(value - increment).toFixed(decimals))
      }

      const constantsSize = constants.length
      for (let i = 0; i < constantsSize - 1; i++)
        for (let j = i; j < constantsSize; j++)
          constants.push(constants[i] + constants[j], constants[i] - constants[j],
            constants[i] * constants[j], constants[i] / constants[j])

      this.constants['numeric'] = [...new Set(this.constants['numeric'].concat(constants.slice(0,
        Math.min(constants.length,
          Math.max(0, this.configuration.maxNumConst - this.constants['numeric'].length)))))]
    }

    /**
     * Parses the string tokens already extracted from code.
     */
    private parseStringTokens(tokens: Token[]) {
      if (this.constants['string'].length > this.configuration.maxNumConst) return

      const constants: string[] = tokens.filter(token => { return token.type === 'String' })
        .map(token => token.value.substring(1, token.value.length - 1))

      const constantsSize = constants.length
      for (let i = 0; i < constantsSize; i++)
        for (let j = i; j < constantsSize; j++)
          constants.push(constants[i].concat(constants[j]), constants[j].concat(constants[i]))

      this.constants['string'] = [...new Set(this.constants['string'].concat(constants.slice(0,
        Math.min(constants.length,
          Math.max(0, this.configuration.maxNumConst - this.constants['string'].length)))))]
    }

    /**
     * Extracts the constants from a set of functions and files and returns an array of FluentPicks.
     */
    private extractConstants() {
      if (this.extractionStatus) return
      else this.extractionStatus = !this.extractionStatus

      for (const method of this.testMethods)
        this.tokenize(method)

      if (this.configuration.globSource !== '') {
        const files = [... new Set(utils.extractImports(this.configuration.globSource).sourceFiles
          .map(file => file + '.ts').concat(fs.lstatSync(this.configuration.globSource).isDirectory() ?
            glob.sync(this.configuration.globSource + '/**/*', {nodir: true}) :
            [this.configuration.globSource]
          ))]

        for (const file of files)
          this.tokenize(fs.readFileSync(file))
      }

      for (const numeric of this.constants['numeric']) {
        if (this.constants['string'].length >= this.configuration.maxNumConst) break
        this.constants['string'].push(fc.string(numeric, numeric).pick(this.randomGenerator.generator)?.value)
      }
    }

    protected getArbitraryExtractedConstants<A>(arbitrary: Arbitrary<A>): FluentPick<A>[] {
      this.extractConstants()
      return arbitrary.extractedConstants(this.constants)
    }

  }
}
