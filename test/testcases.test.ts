import * as fc from '../src/index'
import {it, beforeEach} from 'mocha'
import {expect} from 'chai'

describe('Test case tests', () => {
  let prng: (seed: number) => () => number

  beforeEach(() =>
    prng = (seed: number) => () => (seed = seed * 16807 % 2147483647) / 2147483647
  )

  it('Test cases contain at least one value', () => {
    const sc1 = fc.scenario()
      .configStatistics(fc.statistics().withTestCaseOutput())
      .withGenerator(prng, 1234)
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a+b === b+a)

    expect(sc1.check().testCases.values).to.not.eql([])
  })

  it('Test cases contain the correct arbitraries', () => {
    const sc1 = fc.scenario()
      .config(fc.strategy().defaultStrategy().withSampleSize(1))
      .configStatistics(fc.statistics().withTestCaseOutput())
      .withGenerator(prng, 1234)
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a+b === b+a)

    expect(sc1.check().testCases.values[0]).to.satisfy((tc) => { return 'a' in tc && 'b' in tc })
  })

  describe('Same type as arbitrary', () => {
    it('Array', () => {
      const sc1 = fc.scenario()
        .config(fc.strategy().defaultStrategy().withSampleSize(1))
        .configStatistics(fc.statistics().withTestCaseOutput())
        .withGenerator(prng, 1234)
        .forall('a', fc.array(fc.integer(-10, 10), 1, 1))
        .then(({a}) => a === a)

      expect(sc1.check().testCases.values[0].a).to.satisfy((a) => {
        return fc.array(fc.integer(-10, 10), 1, 1).canGenerate({value: a, original: a})
      })
    })

    it('Boolean', () => {
      const sc1 = fc.scenario()
        .config(fc.strategy().defaultStrategy().withSampleSize(1))
        .configStatistics(fc.statistics().withTestCaseOutput())
        .withGenerator(prng, 1234)
        .forall('a', fc.boolean())
        .then(({a}) => a === a)

      expect(sc1.check().testCases.values[0].a).to.satisfy((a) => {
        return fc.boolean().canGenerate({value: a, original: a})
      })
    })

    it('Composite', () => {
      const sc1 = fc.scenario()
        .config(fc.strategy().defaultStrategy().withSampleSize(1))
        .configStatistics(fc.statistics().withTestCaseOutput())
        .withGenerator(prng, 1234)
        .exists('a', fc.union(fc.string(1, 1), fc.string(1, 1)))
        .then(({a}) => a === a)

      expect(sc1.check().testCases.values[0].a).to.satisfy((a) => {
        return fc.union(fc.string(1, 1), fc.string(1, 1)).canGenerate({value: a, original: [a.codePointAt(0)]})
      })
    })

    it('Constant', () => {
      const sc1 = fc.scenario()
        .config(fc.strategy().defaultStrategy().withSampleSize(1))
        .configStatistics(fc.statistics().withTestCaseOutput())
        .withGenerator(prng, 1234)
        .forall('a', fc.constant(5))
        .then(({a}) => a === 5)

      expect(sc1.check().testCases.values[0].a).to.satisfy((a) => {
        return fc.constant(5).canGenerate({value: a, original: a})
      })
    })

    it('Integer', () => {
      const sc1 = fc.scenario()
        .config(fc.strategy().defaultStrategy().withSampleSize(1))
        .configStatistics(fc.statistics().withTestCaseOutput())
        .withGenerator(prng, 1234)
        .forall('a', fc.integer(-10, 10))
        .then(({a}) => a === a)

      expect(sc1.check().testCases.values[0].a).to.satisfy((a) => {
        return fc.integer(-10, 10).canGenerate({value: a, original: a})
      })
    })

    it('Real', () => {
      const sc1 = fc.scenario()
        .config(fc.strategy().defaultStrategy().withSampleSize(1))
        .configStatistics(fc.statistics().withTestCaseOutput())
        .withGenerator(prng, 1234)
        .forall('a', fc.real(-10, 10))
        .then(({a}) => a === a)

      expect(sc1.check().testCases.values[0].a).to.satisfy((a) => {
        return fc.real(-10, 10).canGenerate({value: a, original: a})
      })
    })

    it('Set', () => {
      const sc1 = fc.scenario()
        .config(fc.strategy().defaultStrategy().withSampleSize(1))
        .configStatistics(fc.statistics().withTestCaseOutput())
        .withGenerator(prng, 1234)
        .forall('a', fc.set([1, 2, 3]))
        .then(({a}) => a === a)

      expect(sc1.check().testCases.values[0].a).to.satisfy((a) => {
        return fc.set([1, 2, 3]).canGenerate({value: a, original: a})
      })
    })

    it('Tuple', () => {
      const sc1 = fc.scenario()
        .config(fc.strategy().defaultStrategy().withSampleSize(1))
        .configStatistics(fc.statistics().withTestCaseOutput())
        .withGenerator(prng, 1234)
        .forall('a', fc.tuple(fc.integer(-10, 10), fc.string(1, 1)))
        .then(({a}) => a === a)

      expect(sc1.check().testCases.values[0].a).to.satisfy((a) => {
        return fc.tuple(fc.integer(-10, 10), fc.string(1, 1)).canGenerate({
          value: a,
          original: a.map(x => typeof x == 'string' ? [x.codePointAt(0)] : x)
        })
      })
    })

    it('Chain', () => {
      const sc1 = fc.scenario()
        .config(fc.strategy().defaultStrategy().withSampleSize(1))
        .configStatistics(fc.statistics().withTestCaseOutput())
        .withGenerator(prng, 1234)
        .forall('a', fc.integer(2, 2).chain(i => fc.array(fc.constant(i), i, i)))
        .then(({a}) => a === a)

      expect(sc1.check().testCases.values[0].a).to.satisfy((a) => {
        return fc.integer(2, 2).chain(i => fc.array(fc.constant(i), i, i)).canGenerate({value: a, original: a})
      })
    })

    it('Filter', () => {
      const sc1 = fc.scenario()
        .config(fc.strategy().defaultStrategy().withSampleSize(1))
        .configStatistics(fc.statistics().withTestCaseOutput())
        .withGenerator(prng, 1234)
        .forall('a', fc.integer(-10,10).filter(n => n > 0))
        .then(({a}) => a === a)

      expect(sc1.check().testCases.values[0].a).to.satisfy((a) => {
        return fc.integer(-10,10).filter(n => n > 0).canGenerate({value: a, original: a})
      })
    })
  })
})
