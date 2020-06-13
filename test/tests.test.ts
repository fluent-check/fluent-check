import { FluentCheck } from '../src/index'
import { ArbitraryInteger, ArbitraryBoolean, ArbitraryReal, ArbitraryString, ArbitraryComposite } from '../src/arbitraries'
import { it } from 'mocha' 
import { expect } from 'chai'

describe('global tests', () => {
  it("finds the addition inverse", () => {
      expect(new FluentCheck() 
          .forall('a', new ArbitraryInteger(-10, 10))
          .exists('b', new ArbitraryInteger(-10, 10))
          .then(({ a, b }) => a + b == 0)
          .check()
      ).to.have.property('satisfiable', true)
  })

  it("finds that multiplication has a zero element", () => {
    expect(
      new FluentCheck()
        .forall('a', new ArbitraryInteger(-10, 10))
        .exists('b', new ArbitraryInteger(-100, 100))
        .then(({ a, b }) => a * b == 0)
        .check()
    ).to.have.property('satisfiable', true)
  })

  it("finds that multiplication has an identity element in the -10, 10 range", () => {
    expect(new FluentCheck() 
      .exists('b', new ArbitraryInteger(-10, 10))
      .forall('a', new ArbitraryInteger())
      .then(({ a, b }) => (a * b) === a && (b * a) === a)
      .check() 
    ).to.deep.include({ satisfiable: true, example: { b: 1 } })
  })
    
  it("finds there is a number in the -10, 10 range with inverse and shrink it to 0", () => {
    expect(new FluentCheck() 
      .exists('b', new ArbitraryInteger(-10, 10))
      .forall('a', new ArbitraryInteger())
      .then(({ a, b }) => (a + b) === a && (b + a) === a)
      .check() 
    ).to.deep.include({ satisfiable: true, example: { b: 0 } })
  })
    
  it("finds that addition is commutative", () => {
    expect(new FluentCheck() 
      .forall('a', new ArbitraryInteger())
      .forall('b', new ArbitraryInteger())
      .then(({ a, b }) => (a + b) === (b + a))
      .check()  
    ).to.have.property('satisfiable', true)
  })
    
  it("finds that the subctraction is not commutative", () => {
    expect(new FluentCheck() 
      .forall('a', new ArbitraryInteger())
      .forall('b', new ArbitraryInteger())
      .then(({ a, b }) => (a - b) === (b - a))
      .check() 
    ).to.have.property('satisfiable', false)
  })
    
  it("finds that the multiplication has zero element in a range", () => {
    expect(new FluentCheck() 
      .forall('a', new ArbitraryInteger())
      .exists('b', new ArbitraryInteger(-500, 500))
      .then(({ a, b }) => a * b == 0)
      .check()
    ).to.have.property('satisfiable', true)
  })
    
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

  it("finds two true booleans", () => {
    expect(new FluentCheck() 
      .exists('a', new ArbitraryBoolean())
      .exists('b', new ArbitraryBoolean())
      .then(({ a, b }) => (a && b))
      .check()
    ).to.deep.include({ satisfiable: true, example: { a: true, b: true } })
  })
    
  it("finds that some booleans are false", () => {
    expect(new FluentCheck() 
      .exists('b', new ArbitraryBoolean())
      .forall('a', new ArbitraryBoolean())
      .then(({ a, b }) => (a && b))
      .check()
    ).to.have.property('satisfiable', false)
  })
    
  it("finds that self-xor return true", () => {
    expect(new FluentCheck() 
      .forall('a', new ArbitraryBoolean())
      .then(({ a }) => !(a ^ a))
      .check()
    ).to.have.property('satisfiable', true)
  })
    
  it("finds implication using ors", () => {
    expect(new FluentCheck() 
      .forall('a', new ArbitraryBoolean())
      .then(({ a }) => a || !a)
      .check()
    ).to.have.property('satisfiable', true)
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
    
  it("finds that the length of the concatenation of string is the sum of the lengths", () => {
    expect(new FluentCheck() 
      .forall('a', new ArbitraryString())
      .forall('b', new ArbitraryString())
      .then(({ a, b }) => a.length + b.length === (a + b).length)
      .check()
    ).to.have.property('satisfiable', true)
  })
    
  it("finds a string with length 5 in all strings", () => {
    expect(new FluentCheck() 
      .exists('a', new ArbitraryString())
      .then(({ a }) => a.length  === 5)
      .check()
    ).to.have.property('satisfiable', true)
  })
    
  it("finds a string with length 5 in a composite", () => {
    expect(new FluentCheck() 
      .exists('a', new ArbitraryComposite([new ArbitraryString(0, 2), new ArbitraryString(4, 6)]))
      .then(({ a }) => a.length  === 5)
      .check()
    ).to.have.property('satisfiable', true)
  })
    
  it("finds no string with length 3 in a composite", () => {
    expect(new FluentCheck() 
      .exists('a', new ArbitraryComposite([new ArbitraryString(0, 2), new ArbitraryString(4, 6)]))
      .then(({ a }) => a.length  === 3)
      .check()
    ).to.have.property('satisfiable', false)
  })
})