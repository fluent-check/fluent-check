import * as fc from '../src/index'
import {it} from 'mocha'
import {assertSatisfiableWithExample, assertUniversalProperty} from './test-utils.js'

describe('Boolean tests', () => {
  it('finds two true booleans', () => {
    const result = fc.scenario()
      .exists('a', fc.boolean())
      .exists('b', fc.boolean())
      .then(({a, b}) => a === true && b === true)
      .check()
    assertSatisfiableWithExample(result, {a: true, b: true})
  })

  it('finds that some booleans are false', () => {
    fc.scenario()
      .exists('b', fc.boolean())
      .forall('a', fc.boolean())
      .then(({a, b}) => a === true && b === true)
      .check()
      .assertNotSatisfiable()
  })

  it('finds that self-XOR returns true', () => {
    assertUniversalProperty(fc.boolean(), a => !(a !== a))
  })

  it('finds implication using ORs', () => {
    assertUniversalProperty(fc.boolean(), a => a === true || a === false)
  })
})
