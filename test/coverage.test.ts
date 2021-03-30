import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Debug tests', () => {
  it('Mock up test for coverage purposes', () => {
    expect(fc.scenario()
      .config(fc.strategy().withCoverageGuidance('test/coverage.test.ts'))
      .forall('a', fc.integer(0, 20))
      .forall('b', fc.integer(0, 20))
      .then(({a, b}) => {
        if (a === 10) return true
        else if (a + b < 2) return a - b === a + b
        return a + b === b + a
      })
      .check()).to.deep.include({satisfiable: false})
  })
})
