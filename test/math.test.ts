import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Math properties tests', () => {
  it('finds if addition is commutative', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a + b === b + a)
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('finds if additions is associative', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .forall('c', fc.integer(-10, 10))
      .then(({a, b, c}) => a + b + c === a + (b + c))
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('finds if addition has an inverse', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .exists('b', fc.integer(-10, 10))
      .then(({a, b}) => a + b === 0)
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('finds if multiplication is commutative', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a * b === b * a)
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('finds if multiplication is associative', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .forall('c', fc.integer(-10, 10))
      .then(({a, b, c}) => a * b * c === a * (b * c))
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('finds if multiplication is distributive over addition', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .forall('c', fc.integer(-10, 10))
      .then(({a, b, c}) => (a + b) * c === a * c + b * c)
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('finds if multiplication has precendence over addition', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .forall('c', fc.integer(-10, 10))
      .then(({a, b, c}) => a + b * c === a + b * c)
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('finds the neutral element of addition', () => {
    expect(fc.scenario()
      .exists('a', fc.integer())
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a + b === b)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: 0}})
  })

  it('finds the neutral element of multiplication', () => {
    expect(fc.scenario()
      .exists('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a * b === b)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: 1}})
  })

  it('finds the absorbing element of multiplication', () => {
    expect(fc.scenario()
      .exists('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a * b === 0)
      .check()
    ).to.deep.include({satisfiable: true, example: {a: 0}})
  })

  it('finds that subtraction is not cummutative', () => {
    expect(fc.scenario()
      .forall('a', fc.integer(-10, 10))
      .forall('b', fc.integer(-10, 10))
      .then(({a, b}) => a - b === b - a)
      .check()
    ).to.deep.include({satisfiable: false, example: {a: 0, b: -1}})
  })
})
