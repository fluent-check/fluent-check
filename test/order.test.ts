import { FluentCheck } from '../src/index'
import { ArbitraryInteger, ArbitraryBoolean, ArbitraryReal, ArbitraryString, ArbitraryComposite } from '../src/arbitraries'
import { it } from 'mocha' 
import { expect } from 'chai'

describe('order tests', () => {
  it("finds if for all elements there is an element such that a + b == 0", () => {
      expect(new FluentCheck() 
          .forall('a', new ArbitraryInteger(-10, 10))
          .exists('b', new ArbitraryInteger(-10, 10))
          .then(({ a, b }) => a + b == 0)
          .check()
      ).to.have.property('satisfiable', true)
  })

  it("finds an element such that a * b == 0 for all elements", () => {
    expect(new FluentCheck() 
        .exists('a', new ArbitraryInteger(-10, 10))
        .forall('b', new ArbitraryInteger(-10, 10))
        .then(({ a, b }) => a * b == 0)
        .check()
    ).to.deep.include({ satisfiable: true, example: { a: 0 } })
  })

  it("finds two elements such that a + b == 10", () => {
    expect(new FluentCheck() 
        .exists('a', new ArbitraryInteger(-10, 10))
        .exists('b', new ArbitraryInteger(-10, 10))
        .then(({ a, b }) => a + b == 10)
        .check()
    ).to.deep.include({ satisfiable: true, example: { b: 10, a: 0 } })
  })

  it("tests addition is comutative for all elements", () => {
    expect(new FluentCheck() 
        .forall('a', new ArbitraryInteger(-10, 10))
        .forall('b', new ArbitraryInteger(-10, 10))
        .then(({ a, b }) => a + b == b + a)
        .check()
    ).to.have.property('satisfiable', true)
  })

})