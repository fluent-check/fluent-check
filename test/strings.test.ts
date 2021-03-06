import * as fc from '../src/index'
import * as Strategies from '../src/strategies/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Strings tests', () => {
  it('finds that the length of the concatenation of string is the sum of the lengths', () => {
    expect(fc.scenario()
      .config(new Strategies.RandomCachedStrategy())
      .forall('a', fc.string())
      .forall('b', fc.string())
      .then(({a, b}) => a.length + b.length === (a + b).length)
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('finds a string with length 5 in all strings', () => {
    expect(fc.scenario()
      .config(new Strategies.RandomCachedStrategy())
      .exists('s', fc.string())
      .then(({s}) => s.length === 5)
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('finds any substring inside the string', () => {
    expect(fc.scenario()
      .config(new Strategies.RandomCachedStrategy())
      .forall('s', fc.string())
      .forall('a', fc.integer(0, 10))
      .forall('b', fc.integer(0, 10))
      .then(({s, a, b}) => s.includes(s.substring(a, b)))
      .check()
    ).to.have.property('satisfiable', true)
  })
})
