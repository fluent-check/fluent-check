import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Integer tests', () => {
  it('finds there is a number in the -10, 10 range, which is neutral under addition for all integers.', () => {
    expect(fc.scenario()
      .exists('b', fc.integer(-10, 10))
      .forall('a', fc.integer())
      .then(({a, b}) => (a + b) === a && (b + a) === a)
      .check()
    ).to.deep.include({satisfiable: true, example: {b: 0}})
  })

  it('finds that there is an integer larger than any number in a range and shrinks it', () => {
    expect(fc.scenario()
      .exists('a', fc.integer())
      .forall('b', fc.integer(-100, 100))
      .then(({a, b}) => a > b)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: 101}})
  })

  it('finds a number that is divisible by 7 and shrinks it', () => {
    expect(fc.scenario()
      .exists('a', fc.integer(1))
      .then(({a}) => a % 7 === 0)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: 7}})
  })

  it('finds a number that is divisible by -13 and shrinks it', () => {
    expect(fc.scenario()
      .exists('a', fc.integer(-100, -1))
      .then(({a}) => a % 13 === 0)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: -13}})
  })

  it('finds that summing two positive numbers in a range nevers returns zero', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(5, 10))
      .exists('b', fc.integer(1, 2))
      .then(({a, b}) => a + b === 0)
      .check()
    ).to.have.property('satisfiable', false)
  })

  it('finds two elements such that a + b === 10', () => {
    expect(fc.scenario()
      .exists('a', fc.integer(-10, 10))
      .exists('b', fc.integer(-10, 10))
      .then(({a, b}) => a + b === 10)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: 0, b: 10}})
  })

  it('finds that adding 1000 makes any number larger and shrinks the example', () => {
    expect(fc.scenario()
      .config(fc.strategy()
        .withRandomSampling()
        .usingCache()
        .withoutReplacement()
        .withShrinking()
      )
      .exists('a', fc.integer())
      .then(({a}) => a + 1000 > a)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: 0}})
  })

  it('finds two elements such that a % 11 == 0', () => {
    // TODO: For this to pass, the shrink should perform an exhaustive search, otherwise the probability
    // of lying on the correct interval is very low.

    /* expect(fc.scenario()
      .exists('a', fc.integer(0, 1000000))
      .then(({ a }) => a % 11 === 0 && a > 90000 && a < 90010)
      .check()
    ).to.deep.include({ satisfiable: true, example: { a: 90002 } }) */
  })
})
