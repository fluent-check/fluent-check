import * as fc from '../src/index'
import {it} from 'mocha'

describe('Math properties tests', () => {
  it('finds if addition is commutative', () => {
    fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a + b === b + a)
      .check()
      .assertSatisfiable()
  })

  it('finds if additions is associative', () => {
    fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .forall('c', fc.integer(-10, 10))
      .then(({a, b, c}) => a + b + c === a + (b + c))
      .check()
      .assertSatisfiable()
  })

  it('finds if addition has an inverse', () => {
    fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .exists('b', fc.integer(-10, 10))
      .then(({a, b}) => a + b === 0)
      .check()
      .assertSatisfiable()
  })

  it('finds if multiplication is commutative', () => {
    fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a * b === b * a)
      .check()
      .assertSatisfiable()
  })

  it('finds if multiplication is associative', () => {
    fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .forall('c', fc.integer(-10, 10))
      .then(({a, b, c}) => a * b * c === a * (b * c))
      .check()
      .assertSatisfiable()
  })

  it('finds if multiplication is distributive over addition', () => {
    fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .forall('c', fc.integer(-10, 10))
      .then(({a, b, c}) => (a + b) * c === a * c + b * c)
      .check()
      .assertSatisfiable()
  })

  it('finds the neutral element of addition', () => {
    const result = fc.scenario()
      .exists('a', fc.integer())
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a + b === b)
      .check()
    result.assertSatisfiable()
    result.assertExample({a: 0})
  })

  it('finds the neutral element of multiplication', () => {
    const result = fc.scenario()
      .exists('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a * b === b)
      .check()
    result.assertSatisfiable()
    result.assertExample({a: 1})
  })

  it('finds the absorbing element of multiplication', () => {
    const result = fc.scenario()
      .exists('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a * b === 0)
      .check()
    result.assertSatisfiable()
    result.assertExample({a: 0})
  })

  it('finds that subtraction is not cummutative', () => {
    const result = fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a - b === b - a)
      .check()
    result.assertNotSatisfiable()
    result.assertExample({a: 0, b: -1})
  })
})
