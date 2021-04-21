
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
    public extractionStatus = false

    /**
     * Record that contains all the constants extracted.
     */
    public constants: StrategyExtractedConstants = {'numeric': [] as number[], 'string': [] as string[]}

    /**
     * Tokenizes either the file or function passed as parameter.
     */
    tokenize(data: Buffer | ((...args: any[]) => boolean)) {
      const tokens = espree.tokenize(data.toString('utf-8'))
      this.parseNumericTokens(tokens)
      this.parseStringTokens(tokens)
    }

    /**
     * Parses the numeric tokens already extracted from code.
     */
    parseNumericTokens(tokens: Token[]) {
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

      this.constants['numeric'] = [...new Set(this.constants['numeric'].concat(constants.slice(0,
        Math.min(constants.length,
          Math.max(0, this.configuration.maxNumConst - this.constants['numeric'].length)))))]
    }

    /**
     * Parses the string tokens already extracted from code.
     */
    parseStringTokens(tokens: Token[]) {
      if (this.constants['string'].length > this.configuration.maxNumConst) return

      const filteredTokens = tokens.filter(token => { return token.type === 'String' })
        .map(token => token.value.substring(1, token.value.length - 1))

      const constants: string[] = []

      for (const constant of filteredTokens) {
        constants.push(constant, constant.slice(0, Math.floor(constant.length / 2)),
          constant.slice(Math.floor(constant.length / 2), constant.length))
      }

      this.constants['string'] = [...new Set(this.constants['string'].concat(constants.slice(0,
        Math.min(constants.length,
          Math.max(0, this.configuration.maxNumConst - this.constants['string'].length)))))]
    }

    /**
     * Extracts the constants from a set of functions and files and returns an array of FluentPicks.
     */
    extractConstants() {
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

    getArbitraryExtractedConstants<A>(arbitrary: Arbitrary<A>): FluentPick<A>[] {
      if (!this.extractionStatus) {
        this.extractConstants()
        this.extractionStatus = !this.extractionStatus
      }

      const extractedConstants: Array<FluentPick<A>> = []

      if (arbitrary.toString().includes('Map') && arbitrary.toString().includes('Array')
        && arbitrary.toString().includes('Integer'))
        for (const elem of this.constants['string'])
          if (arbitrary.canGenerate({value: elem, original: Array.from(elem as string).map(x => x.charCodeAt(0))}))
            extractedConstants.push({value: elem, original: Array.from(elem as string).map(x => x.charCodeAt(0))})

      if ((arbitrary.toString().includes('Integer') || arbitrary.toString().includes('Constant'))
            && !arbitrary.toString().includes('Array'))
        for (const elem of this.constants['numeric'])
          if (arbitrary.canGenerate({value: elem, original: elem}))
            extractedConstants.push({value: elem, original: elem})

      return extractedConstants
    }

  }
}
