import * as fc from '../src/index'
import {it} from 'mocha'
import {binaryProperty, positiveInt, scenarioWithSampleSize} from './test-utils.js'

describe('Strings tests', () => {
  it('finds that the length of the concatenation of string is the sum of the lengths', () => {
    binaryProperty(
      fc.string(),
      fc.string(),
      (a, b) => a.length + b.length === (a + b).length
    ).assertSatisfiable()
  })

  it('finds a string with length 5 in all strings', () => {
    scenarioWithSampleSize()
      .exists('s', fc.string())
      .then(({s}) => s.length === 5)
      .check()
      .assertSatisfiable()
  })

  it('finds any substring inside the string', () => {
    binaryProperty(
      fc.string(),
      fc.tuple(positiveInt(), positiveInt()),
      (s, [a, b]) => s.includes(s.substring(a, b))
    ).assertSatisfiable()
  })
})
