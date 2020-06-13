import { FluentCheck } from '../src/index'
import { ArbitraryInteger, ArbitraryReal } from '../src/arbitraries'
import { it } from 'mocha' 
import { expect } from 'chai'

describe('global tests', () => {
  it("finds that there is an integer larger than any number in a range and shrinks it", () => {
    expect(new FluentCheck() 
      .exists('a', new ArbitraryInteger())
      .forall('b', new ArbitraryInteger(-100, 100))
      .then(({ a, b }) => a > b)
      .check()
    ).to.deep.include({ satisfiable: true, example: { a: 101 } })
  })

  it("finds that there is a real larger than any number in a range and shrinks it", () => {
    expect(new FluentCheck() 
      .exists('a', new ArbitraryReal())
      .forall('b', new ArbitraryReal(-100, 100))
      .then(({ a, b }) => a > b)
      .check()
    ).to.deep.include({ satisfiable: true, example: { a: 101 } })
  })

  it("finds a number that is divisible by 13 and shrinks it", () => {
    expect(new FluentCheck() 
      .exists('a', new ArbitraryInteger(1))
      .then(({ a }) => a % 7 == 0)
      .check()
    ).to.deep.include({ satisfiable: true, example: { a: 7 } })
  })
    
  it("finds that summing two positive numbers in a range nevers returns zero", () => {
    expect(new FluentCheck() 
      .forall('a', new ArbitraryInteger(5, 10))
      .exists('b', new ArbitraryInteger(1, 2))
      .then(({ a, b }) => a + b == 0)
      .check()
    ).to.have.property('satisfiable', false)
  })
    
  it("finds that multiplication has a zero element even in reals", () => {
    expect(new FluentCheck() 
      .exists('a', new ArbitraryReal())
      .forall('b', new ArbitraryReal())
      .then(({ a, b }) => a * b == 0)
      .check()
    ).to.deep.include({ satisfiable: true, example: { a: 0 } })
  })
    
  it("finds that adding 1000 makes any number larger and shrinks the example", () => {
    expect(new FluentCheck() 
      .exists('a', new ArbitraryInteger())
      .then(({ a }) => a + 1000 > a)
      .check() 
    ).to.deep.include({ satisfiable: true, example: { a: 0 } })
  })
})