import * as fc from '../src/index'
import { it } from 'mocha'
import { expect } from 'chai'

describe('Boolean tests', () => {
  it('finds two true booleans', () => {
    expect(fc.scenario()
      .exists('a', fc.boolean())
      .exists('b', fc.boolean())
      .then(({ a, b }) => (a && b))
      .check()
    ).to.deep.include({ satisfiable: true, example: { a: true, b: true } })
  })

  it('finds that some booleans are false', () => {
    expect(fc.scenario()
      .exists('b', fc.boolean())
      .forall('a', fc.boolean())
      .then(({ a, b }) => (a && b))
      .check()
    ).to.have.property('satisfiable', false)
  })

  it('finds that self-XOR returns true', () => {
    expect(fc.scenario()
      .forall('a', fc.boolean())
      .then(({ a }) => !(a !== a))
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('finds implication using ORs', () => {
    expect(fc.scenario()
      .forall('a', fc.boolean())
      .then(({ a }) => a || !a)
      .check()
    ).to.have.property('satisfiable', true)
  })
})