import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Input space coverage tests', () => {
  it('Scenario coverage is calculated correctly', () => {
    const sc = fc.scenario()
      .config(fc.strategy().defaultStrategy().withSampleSize(100))
      .configStatistics(fc.statistics().withTestCaseOutput().withInputSpaceCoverage(2))
      .forall('a', fc.integer(-100,100))
      .forall('b', fc.integer(0,300))
      .then(({a, b}) => a + b === a + b)
      .check()

    expect(sc.coverages[0]).equal(16.52865)
  })

  it('Arbitrary coverage is calculated correctly', () => {
    const sc = fc.scenario()
      .config(fc.strategy().defaultStrategy().withSampleSize(100))
      .configStatistics(fc.statistics().withTestCaseOutput().withInputSpaceCoverage(2))
      .forall('a', fc.integer(-100,100))
      .forall('b', fc.integer(0,300))
      .then(({a, b}) => a + b === a + b)
      .check()

    expect(sc.coverages[1]['a']).equal(49.75124)
    expect(sc.coverages[1]['b']).equal(33.22259)
  })
})
