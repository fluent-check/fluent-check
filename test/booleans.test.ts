import * as fc from '../src/index'
import {it} from 'mocha'

describe('Boolean tests', () => {
  it('finds two true booleans', () => {
    const result = fc.scenario()
      .exists('a', fc.boolean())
      .exists('b', fc.boolean())
      .then(({a, b}) => a === true && b === true)
      .check()
    result.assertSatisfiable()
    result.assertExample({a: true, b: true})
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
    fc.scenario()
      .forall('a', fc.boolean())
      .then(({a}) => !(a !== a))
      .check()
      .assertSatisfiable()
  })

  it('finds implication using ORs', () => {
    fc.scenario()
      .forall('a', fc.boolean())
      .then(({a}) => a === true || a === false)
      .check()
      .assertSatisfiable()
  })
})
