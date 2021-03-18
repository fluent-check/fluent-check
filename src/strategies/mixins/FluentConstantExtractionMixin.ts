
import * as espree from 'espree'
import * as glob from 'glob'
import * as fs from 'fs'
import * as utils from './utils'
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
    public constants: StrategyExtractedConstants = {'numeric': [], 'string': []}

    /**
     * Tokenizes either the file or function passed as parameter.
     */
    tokenize(data: Buffer | ((...args: any[]) => boolean)) {
      const tokens = espree.tokenize(data.toString('utf-8')) //.replace(/['`]/g, '"')
      this.parseNumericTokens(tokens)
      this.parseStringTokens(tokens)
    }

    /**
     * Parses the numeric tokens already extracted from code.
     */
    parseNumericTokens(tokens: Token[]) {
      if (this.constants['numeric'].length > this.configuration.maxNumericConst!) return

      const filteredTokens = tokens.filter(token => {
        return (token.type === 'Punctuator') || (token.type === 'Numeric')
      })

      const numericsAndPunctuators = filteredTokens.reduce(function (acc, token, index) {
        if (token.type === 'Numeric') {
          const leftPunctuatorIndex = (filteredTokens[index - 1] !== undefined &&
            filteredTokens[index - 1].value !== '-') ? 1 : 2

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
      const lesserThanConstants: number[] = []
      const greaterThanConstants: number[] = []

      for (const pair of numericsAndPunctuators) {
        if (pair.punctuator === undefined) continue

        const punctuator = pair.punctuator.value
        const value = pair.numeric.includes('.') ?
          Number.parseFloat(pair.numeric) :
          Number.parseInt(pair.numeric)

        const decimals = utils.countDecimals(value)
        const increment = (1000 / (1000 * 10 ** decimals))

        constants.push(value, +(value + increment).toFixed(decimals), +(value - increment).toFixed(decimals))

        if (['>', '>='].includes(punctuator)) greaterThanConstants.push(+(value + increment).toFixed(decimals))
        else if (['<', '<='].includes(punctuator)) lesserThanConstants.push(+(value - increment).toFixed(decimals))
      }

      if (this.configuration.numericConstMaxRange! > 0) {
        greaterThanConstants.sort((a,b) => a - b)
        lesserThanConstants.sort((a,b) => a - b)

        let last
        constants.push(...greaterThanConstants
          .flatMap(lower => lesserThanConstants.map(upper => ([lower, upper])))
          .filter(range => (range[0]<range[1] && utils.computeRange(range) <= this.configuration.numericConstMaxRange!))
          .reduce((nonOverlappingRanges, range) => {
            if (!last || range[0] > last[1]) nonOverlappingRanges.push(last = range)
            else if (range[1] > last[1]) last[1] = range[1]
            return nonOverlappingRanges
          }, [] as any)
          .flatMap(range => utils.buildSequentialArray(range))
        )
      }

      this.constants['numeric'] = [...new Set(this.constants['numeric'].concat(constants.slice(0,
        Math.min(constants.length,
          Math.max(0, this.configuration.maxNumericConst! - this.constants['numeric'].length)))))]
    }

    /**
     * Parses the string tokens already extracted from code.
     */
    parseStringTokens(tokens: Token[]) {
      if (this.constants['string'].length > this.configuration.maxStringConst!) return

      const filteredTokens = tokens.filter(token => { return token.type === 'String' })
        .map(token => token.value.substring(1, token.value.length - 1))

      const constants = filteredTokens.slice(0,
        Math.min(filteredTokens.length, this.configuration.maxStringConst! - this.constants['string'].length))

      this.constants['string'] = [...new Set(this.constants['string'].concat(constants))]
    }

    /**
     * Extracts the constants from a set of functions and files and returns an array of FluentPicks.
     */
    extractConstants() {
      for (const assertion of this.assertions)
        this.tokenize(assertion)

      if (this.configuration.globSource !== '') {
        const files = fs.lstatSync(this.configuration.globSource!).isDirectory() ?
          glob.sync(this.configuration.globSource + '/**/*', {nodir: true}) :
          [this.configuration.globSource]

        for (const file of files)
          this.tokenize(fs.readFileSync(file))
      }
    }

    getArbitraryExtractedConstants<A>(arbitrary: Arbitrary<A>): FluentPick<A>[] {
      if (!this.extractionStatus) {
        this.extractConstants()
        this.extractionStatus = !this.extractionStatus
      }

      const extractedConstants: Array<FluentPick<A>> = []

      // TODO: String support not possible considering the current status of ArbitraryString.
      // if (arbitrary.toString().includes('Map' && 'Array' && 'Integer')) {
      // for (const elem of this.constants['string'])
      //     if (arbitrary.canGenerate({value: elem, original: elem}))
      //       extractedConstants.push({value: elem, original: elem})
      // }

      if (arbitrary.toString().includes('Integer' || 'Constant') && !arbitrary.toString().includes('Array'))
        for (const elem of this.constants['numeric'])
          if (arbitrary.canGenerate({value: elem, original: elem}))
            extractedConstants.push({value: elem, original: elem})

      return extractedConstants
    }

  }
}
