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

    const sc = fc.scenario()
      .config(fc.strategy().defaultStrategy().withSampleSize(1))
      .configStatistics(fc.statistics().withAll().with1DGraph(f1).with1DGraph(f2))
      .withGenerator(prng, 1234)
      .forall('a', fc.integer(0, 100))
      .forall('b', fc.integer(50, 250))
      .then(({a, b}) => a + b === a + b)

    expect(sc.check().indexesForGraphs.oneD[0].indexes[0]).to.equal(101)
    expect(sc.check().indexesForGraphs.oneD[1].indexes[0]).to.equal(201)
  })

  it('Indexing function can remove inputs by returning undefined', () => {
    const f = (tc) => {
      return tc.a === 5 ? tc.a : undefined
    }

    const sc = fc.scenario()
      .config(fc.strategy().defaultStrategy().withSampleSize(5))
      .configStatistics(fc.statistics().withAll().with1DGraph(f))
      .withGenerator(prng, 1234)
      .forall('a', fc.integer(1, 5))
      .then(({a}) => a === a)

    expect(sc.check().indexesForGraphs.oneD[0].indexes).to.eql([5])
  })

  it('Array default index is calculated correctly', () => {
    const arb = fc.array(fc.array(fc.integer(-10, 10), 1, 1), 2, 3)

    expect(arb.calculateIndex({value: [[5], [-1], [4]], original: [[5], [-1], [4]]}, 2)).to.equal(6819)
  })

  it('Integer default index is calculated correctly', () => {
    const arb = fc.integer(-10, 10)

    expect(arb.calculateIndex({value: -9, original: -9})).to.equal(1)
  })

  it('Real default index is calculated correctly', () => {
    const arb = fc.real(-1, 1)

    expect(arb.calculateIndex({value: 0.9310004, original: 0.9310004}, 3)).to.equal(1931)
  })

  it('Set default index is calculated correctly', () => {
    const arb = fc.set(['a', 'b', 'c', 'd'])

    expect(arb.calculateIndex({value: ['b', 'c', 'd'], original: [1, 2, 3]})).to.eql(14)
  })

  it('Tuple default index is calculated correctly', () => {
    const arb = fc.tuple(fc.tuple(fc.integer(-10, 10), fc.union(fc.string(1, 1), fc.string(2, 2))), fc.integer(-10, 10))

    expect(arb.calculateIndex({value: [[-9, '  '], -1], original:  [[-9, [32, 32]], -1]}, 5)).to.equal(1725676)
  })
})
