import * as fc from '../../src/index'
import {it} from 'mocha'

function upperCase(text: string) {
  let result = ''

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= 97 && code <= 122)
      result += String.fromCharCode(code - 32)
    else
      result += text[i]
  }

  return result
}

console.log(upperCase('xabdendjnwjfwkjrowhgrnoujwn')) //for no lint errors

describe('Upper case properties', () => {
  let seededGen: (seed: number) => () => number

  beforeEach(() =>
    seededGen = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647
  )

  it('Resulting string doesn\'t contain lower case letters', () => {
    fc.expect(fc.scenario()
      //.configStatistics(fc.statistics().withAll().withDefaultGraphs())
      .withGenerator(seededGen)
      .forall('text', fc.string(0, 10))
      .then(({text}) => !/[a-z]/.test(upperCase(text)))
      .check()
    )
  })

  it('Resulting string has the same length as original', () => {
    fc.expect(fc.scenario()
      //.configStatistics(fc.statistics().withAll().withDefaultGraphs())
      .withGenerator(seededGen)
      .forall('text', fc.string(0, 10))
      .then(({text}) => text.length === upperCase(text).length)
      .check()
    )
  })
})
