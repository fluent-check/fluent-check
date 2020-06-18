import { FluentCheck } from '../src/index'
import * as fc from '../src/arbitraries'
import { it } from 'mocha'
import { expect } from 'chai'

describe('Strings tests', () => {
  it('finds that the length of the concatenation of string is the sum of the lengths', () => {
    expect(new FluentCheck()
      .forall('a', fc.string())
      .forall('b', fc.string())
      .then(({ a, b }) => a.length + b.length === (a + b).length)
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('finds a string with length 5 in all strings', () => {
    expect(new FluentCheck()
      .exists('s', fc.string())
      .then(({ s }) => s.length === 5)
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('finds any substring inside the string', () => {
    expect(new FluentCheck()
      .forall('s', fc.string())
      .forall('a', fc.integer(0, 10))
      .forall('b', fc.integer(0, 10))
      .then(({ s, a, b }) => s.includes(s.substring(a, b)))
      .check()
    ).to.have.property('satisfiable', true)
  })
})