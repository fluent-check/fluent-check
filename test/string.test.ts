import { FluentCheck } from '../src/index'
import { ArbitraryString } from '../src/arbitraries'
import { it } from 'mocha' 
import { expect } from 'chai'

describe('string tests', () => {
  it("finds that the length of the concatenation of string is the sum of the lengths", () => {
    expect(new FluentCheck() 
      .forall('a', new ArbitraryString())
      .forall('b', new ArbitraryString())
      .then(({ a, b }) => a.length + b.length === (a + b).length)
      .check()
    ).to.have.property('satisfiable', true)
  })

  it("finds a string with length 5 in all strings", () => {
    expect(new FluentCheck() 
      .exists('a', new ArbitraryString())
      .then(({ a }) => a.length  === 5)
      .check()
    ).to.have.property('satisfiable', true)
  })
})