import * as fc from '../src/index'
import {it} from 'mocha'

describe('Strings tests', () => {
  it('finds that the length of the concatenation of string is the sum of the lengths', () => {
    fc.scenario()
      .forall('a', fc.string())
      .forall('b', fc.string())
      .then(({a, b}) => a.length + b.length === (a + b).length)
      .check()
      .assertSatisfiable()
  })

  it('finds a string with length 5 in all strings', () => {
    fc.scenario()
      .exists('s', fc.string())
      .then(({s}) => s.length === 5)
      .check()
      .assertSatisfiable()
  })

  it('finds any substring inside the string', () => {
    fc.scenario()
      .forall('s', fc.string())
      .forall('a', fc.integer(0, 10))
      .forall('b', fc.integer(0, 10))
      .then(({s, a, b}) => s.includes(s.substring(a, b)))
      .check()
      .assertSatisfiable()
  })
})
