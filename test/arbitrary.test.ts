import { ArbitraryInteger, UniqueArbitrary, ArbitraryBoolean, ArbitraryComposite, ArbitraryCollection } from '../src/arbitraries'
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

  describe("Transformations", () => {
    it("should allow booleans to be mappeable", () => {
      expect(new FluentCheck()
        .forall('n', new ArbitraryInteger(3, 100))
        .given('a', () => new ArbitraryBoolean().map(e => e ? 'Heads' : 'Tails'))
        .then(({ a, n }) => a.sampleWithBias(n).includes('Heads') )
        .and(({ a, n }) => a.sampleWithBias(n).includes('Tails'))
        .check()
      ).to.have.property('satisfiable', true)
    })

    it("should allow integers to be filtered", () => {
      expect(new FluentCheck()
        .forall('n', new ArbitraryInteger(0, 100).filter(n => n < 10))
        .then(({ n }) => n < 10)
        .check()
      ).to.have.property('satisfiable', true)
    })

    it("should allow integers to be both mapped and filtered", () => {
      expect(new FluentCheck()
        .forall('n', new ArbitraryInteger(0, 100).map(n => n + 100).filter(n => n < 150))
        .then(({ n }) => n >= 100 && n <= 150)
        .check()
      ).to.have.property('satisfiable', true)
    })
  })

  describe("Sizes", () => {
    it("should return the correct size of bounded integer arbitraries", () => {
      expect(new ArbitraryInteger(0, 10).size()).equals(11)
      expect(new ArbitraryInteger(-50, 50).size()).equals(101)
    })

    it("should return the correct size of shrinked integer arbitraries", () => {
      // TODO: This is happening because of the overlap in the Composite
      expect(new ArbitraryInteger(0, 10).shrink(5).size()).equals(5)
    })

    it("should return the correct size of a composite arbitrary", () => {
      expect(new ArbitraryComposite([new ArbitraryBoolean(), new ArbitraryBoolean(), new ArbitraryBoolean()]).size()).equals(6)
    })

    it("should return the correct size of a collection arbitrary", () => {
      expect(new ArbitraryCollection(new ArbitraryBoolean(), 1, 10).size()).equals(512)
    })
  })

  describe("Unique Arbitraries", () => {
    it("should return all the available values when sample size == size", () => {
      expect(
        new UniqueArbitrary(new ArbitraryInteger(0, 10)).sample(11)
      ).to.include.members([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    })

    it("should return no more than the number of possible cases", () => {
      expect(new FluentCheck()
        .forall('n', new ArbitraryInteger(3, 10))
        .given('ub', () => new UniqueArbitrary(new ArbitraryBoolean()))
        .then(({ n, ub }) => ub.sample(n).length === 2)
        .check()
      ).to.have.property('satisfiable', true)
    })
  })
})

