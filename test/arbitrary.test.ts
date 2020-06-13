import {ArbitraryInteger } from '../src/arbitraries'
import { it } from 'mocha'
import { expect } from 'chai'
import { FluentCheck } from '../src'

describe('Arbitrary tests', () => {
  it("should return has many numbers has asked", () => {
    expect(new FluentCheck()
      .forall('n', new ArbitraryInteger(0, 100))
      .given('a', () => new ArbitraryInteger())
      .then(({n, a}) => a.sample(n).length == n)
      .check()
      ).to.have.property('satisfiable', true)
    })

  it("should return values in the specified range", () => {
    expect(new FluentCheck()
      .forall('n', new ArbitraryInteger(0, 100))
      .given('a', () => new ArbitraryInteger(0, 50))
      .then(({n, a}) => a.sample(n).every((i: number) => i <= 50))
      .and(({n, a}) => a.sampleWithBias(n).every((i: number) => i <= 50))
      .check()
      ).to.have.property('satisfiable', true)
    })

  it("should return corner cases if there is space", () => {
    expect(new FluentCheck()
      .forall('n', new ArbitraryInteger(3, 100))
      .given('a', () => new ArbitraryInteger(0, 50))
      .then(({n, a}) => a.sampleWithBias(n).includes(0))
      .and(({n, a}) => a.sampleWithBias(n).includes(50))
      .check()
      ).to.have.property('satisfiable', true)
    })  

  it("should return values smaller than what was shrunk", () => {
    expect(new FluentCheck()
      .forall('n', new ArbitraryInteger(0, 100))
      .forall('s', new ArbitraryInteger(0, 100))
      .given('a', () => new ArbitraryInteger(0, 100))
      .then(({n, s, a}) => a.shrink(s).sample(n).every((i: number) => i < s))
      .and(({n, s, a}) => a.shrink(s).sampleWithBias(n).every((i: number) => i < s))
      .check()
      ).to.have.property('satisfiable', true)
    })    

})