import { FluentCheck } from '../src/index'
import * as fc from '../src/arbitraries'
import { it } from 'mocha'
import { expect } from 'chai'

describe('Integer tests', () => {
  it('finds there is a number in the -10, 10 range with inverse and shrink it to 0', () => {
    expect(new FluentCheck()
      .exists('b', fc.integer(-10, 10))
      .forall('a', fc.integer())
      .then(({ a, b }) => (a + b) === a && (b + a) === a)
      .check()
    ).to.deep.include({ satisfiable: true, example: { b: 0 } })
  })

  it('finds that there is an integer larger than any number in a range and shrinks it', () => {
    expect(new FluentCheck()
      .exists('a', fc.integer())
      .forall('b', fc.integer(-100, 100))
      .then(({ a, b }) => a > b)
      .check()
    ).to.deep.include({ satisfiable: true, example: { a: 101 } })
  })

  it('finds a number that is divisible by 13 and shrinks it', () => {
    expect(new FluentCheck()
      .exists('a', fc.integer(1))
      .then(({ a }) => a % 7 === 0)
      .check()
    ).to.deep.include({ satisfiable: true, example: { a: 7 } })
  })

  it('finds that summing two positive numbers in a range nevers returns zero', () => {
    expect(new FluentCheck()
      .forall('a', fc.integer(5, 10))
      .exists('b', fc.integer(1, 2))
      .then(({ a, b }) => a + b === 0)
      .check()
    ).to.have.property('satisfiable', false)
  })

  it('finds two elements such that a + b === 10', () => {
    expect(new FluentCheck()
      .exists('a', fc.integer(-10, 10))
      .exists('b', fc.integer(-10, 10))
      .then(({ a, b }) => a + b === 10)
      .check()
    ).to.deep.include({ satisfiable: true, example: { b: 10, a: 0 } })
  })

  it('finds that adding 1000 makes any number larger and shrinks the example', () => {
    expect(new FluentCheck()
      .exists('a', fc.integer())
      .then(({ a }) => a + 1000 > a)
      .check()
    ).to.deep.include({ satisfiable: true, example: { a: 0 } })
  })
})
