import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Coverage tests', () => {
  it('Mock up test for coverage purposes', () => {
    expect(fc.scenario()
      .config(fc.strategy()
        .withCoverageGuidance('test/coverage.test.ts')
        .withoutReplacement()
        .withBias()
        .withConstantExtraction()
        .withTimeout(2000)
        .withMinimumCoverage(100)
        .withMaxNumMutationsPerArbitrary(5)
      )
      .forall('a', fc.integer())
      .forall('b', fc.integer())
      .then(({a, b}) => {
        if (a === 10) return true
        else if (a + b === 57) return false
        return a + b === b + a
      })
      .check()).to.deep.include({satisfiable: false})
  })
})
