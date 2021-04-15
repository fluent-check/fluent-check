import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Input space coverage tests', () => {
  it('Exact scenario coverage is calculated correctly', () => {
    const sc = fc.scenario()
      .config(fc.strategy().defaultStrategy().withSampleSize(100))
      .configStatistics(fc.statistics().withTestCaseOutput().withInputSpaceCoverage())
      .forall('a', fc.integer(-100,100))
      .forall('b', fc.integer(0,300))
      .then(({a, b}) => a + b === a + b)
      .check()

    expect(sc.coverages[0]).equal(16.52865)
  })

  it('Estimated scenario coverage is calculated correctly', () => {
    const prng = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647
    const sc = fc.scenario()
      .config(fc.strategy().defaultStrategy().withSampleSize(100))
      .configStatistics(fc.statistics().withTestCaseOutput().withInputSpaceCoverage())
      .withGenerator(prng, 1234)
      .forall('a', fc.integer(0, 200).filter(x => x > 10).filter(x => x < 190))
      .forall('b', fc.integer(-100,100))
      .then(({a, b}) => a + b === a + b)
      .check()

    expect(sc.coverages[0]).eql([27.41924, 29.41998])
  })

  it('Exact arbitrary coverage is calculated correctly', () => {
    const sc = fc.scenario()
      .config(fc.strategy().defaultStrategy().withSampleSize(100))
      .configStatistics(fc.statistics().withTestCaseOutput().withInputSpaceCoverage())
      .forall('a', fc.integer(-100,100))
      .then(({a}) => a === a)
      .check()

    expect(sc.coverages[1]['a']).equal(49.75124)
  })

  it('Estimated arbitrary coverage is calculated correctly', () => {
    const prng = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647
    const sc = fc.scenario()
      .config(fc.strategy().defaultStrategy().withSampleSize(100))
      .configStatistics(fc.statistics().withTestCaseOutput().withInputSpaceCoverage())
      .withGenerator(prng, 1234)
      .forall('a', fc.integer(0, 200).filter(x => x > 10).filter(x => x < 190))
      .then(({a}) => a === a)
      .check()

    expect(sc.coverages[1]['a']).eql([55.11267, 59.13416])
  })
})
