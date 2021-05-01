import * as fc from '../src/index'
import {it, beforeEach} from 'mocha'
import {expect} from 'chai'

describe('Indexation tests', () => {
  let prng: (seed: number) => () => number

  beforeEach(() =>
    prng = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647
  )

  it('Indexing function contains the correct arbitrary sizes', () => {
    const f1 = (_, sizes) => {
      return sizes.a
    }
    const f2 = (_, sizes) => {
      return sizes.b
    }

    const sc1 = fc.scenario()
      .config(fc.strategy().defaultStrategy().withSampleSize(1))
      .configStatistics(fc.statistics().withAll().with1DGraph(f1))
      .withGenerator(prng, 1234)
      .forall('a', fc.integer(0, 100))
      .forall('b', fc.integer(50, 250))
      .then(({a, b}) => a + b === a + b)
    const sc2 = fc.scenario()
      .config(fc.strategy().defaultStrategy().withSampleSize(1))
      .configStatistics(fc.statistics().withAll().with1DGraph(f2))
      .withGenerator(prng, 1234)
      .forall('a', fc.integer(0, 100))
      .forall('b', fc.integer(50, 250))
      .then(({a, b}) => a + b === a + b)

    expect(sc1.check().indexesForGraphs.oneD[0][0]).to.equal(101)
    expect(sc2.check().indexesForGraphs.oneD[0][0]).to.equal(201)
  })
})