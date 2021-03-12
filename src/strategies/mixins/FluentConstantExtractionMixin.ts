
import * as espree from 'espree'
import * as glob from 'glob'
import * as fs from 'fs'
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
    public constants: StrategyExtractedConstants = {'numeric': []}

    /**
     * Tokenizes either the file or function passed as parameter.
     */
    tokenize(data: Buffer | ((...args: any[]) => boolean)) {
      const tokens = espree.tokenize(data.toString('utf-8')) //.replace(/['`]/g, '"')
      this.parseNumericTokens(tokens)
    }

    /**
     * Parses the numeric tokens already extracted. So far it only extract integer constants.
     * TODO - Parse floats
     */
    parseNumericTokens(tokens: Token[]) {
      const filteredTokens = tokens.filter(token => {
        return (token.type === 'Punctuator') || (token.type === 'Numeric' && !token.value.includes('.'))
      })

      const indexOfNumericsAndPunctuators = filteredTokens.reduce(function (acc, token, index) {
        if (token.type === 'Numeric')
          acc.push(
            {opIndex: index - 1, numIndex: index},
            {opIndex: index + 1, numIndex: index}
          )
        return acc
      }, [])

      const constants: number[] = []
      let lesserThanConstants: number[] = []
      let greaterThanConstants: number[] = []

      for (const pair of indexOfNumericsAndPunctuators) {
        if (pair.opIndex >= 0 && pair.opIndex < filteredTokens.length) {
          const punctuator = filteredTokens[pair.opIndex].value
          const value = Number.parseInt(filteredTokens[pair.numIndex].value)

          if (punctuator === '===' || punctuator === '==') constants.push(value)
          else if (punctuator === '!==' || punctuator === '!=') constants.push(value - 1, value + 1)
          else if (punctuator === '>=') greaterThanConstants.push(value)
          else if (punctuator === '>') greaterThanConstants.push(value + 1)
          else if (punctuator === '<=') lesserThanConstants.push(value)
          else if (punctuator === '<') lesserThanConstants.push(value - 1)
          else constants.push(value * (punctuator === '-' ? -1 : 1))
        }
      }

      greaterThanConstants.sort((a,b) => a - b)
      lesserThanConstants.sort((a,b) => b - a)

      for (let i = 0; i < greaterThanConstants.length; i++) {
        let constant = greaterThanConstants[i]
        // eslint-disable-next-line max-len
        const upperLimit = lesserThanConstants.find(x => x >= constant && (x - constant <= this.configuration.maxRange!))

        if (upperLimit === undefined) {
          constants.push(constant)
          continue
        }

        while (constant <= upperLimit)
          constants.push(constant++)

        lesserThanConstants = lesserThanConstants.filter(x => !constants.includes(x))
        greaterThanConstants = [...new Set(greaterThanConstants.map(x => x < upperLimit ? upperLimit : x))]
      }

      constants.push(...lesserThanConstants)
      this.constants['numeric'] = [...new Set(this.constants['numeric'].concat(constants))]
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

      if (arbitrary.toString().includes('Integer Arbitrary'))
        for (const elem of this.constants['numeric'])
          if (arbitrary.canGenerate({value: elem, original: elem}))
            extractedConstants.push({value: elem, original: elem})

      return extractedConstants
    }

  }
}
