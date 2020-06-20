import * as fc from '../src/arbitraries'
import { it } from 'mocha'
import { expect } from 'chai'
import { FluentCheck } from '../src'

describe('Arbitrary tests', () => {
  it('should return has many numbers has asked', () => {
    expect(new FluentCheck()
      .forall('n', fc.integer(0, 100))
      .given('a', () => fc.integer())
      .then(({ n, a }) => a.sample(n).length === n)
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should return values in the specified range', () => {
    expect(new FluentCheck()
      .forall('n', fc.integer(0, 100))
      .given('a', () => fc.integer(0, 50))
      .then(({ n, a }) => a.sample(n).every(i => i.value <= 50))
      .and(({ n, a }) => a.sampleWithBias(n).every(i => i.value <= 50))
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should return corner cases if there is space', () => {
    expect(new FluentCheck()
      .forall('n', fc.integer(3, 100))
      .given('a', () => fc.integer(0, 50))
      .then(({ n, a }) => a.sampleWithBias(n).some(v => v.value === 0))
      .and(({ n, a }) => a.sampleWithBias(n).some(v => v.value === 50))
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should return values smaller than what was shrunk', () => {
    expect(new FluentCheck()
      .forall('n', fc.integer(0, 100))
      .forall('s', fc.integer(0, 100))
      .given('a', () => fc.integer(0, 100))
      .then(({ n, s, a }) => a.shrink(s).sample(n).every((i: number) => i < s))
      .and(({ n, s, a }) => a.shrink(s).sampleWithBias(n).every((i: number) => i < s))
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should allow shrinking of mapped arbitraries', () => {
    expect(new FluentCheck()
      .exists('n', fc.integer(0, 25).map(x => x + 25).map(x => x * 2))
      .forall('a', fc.integer(0, 10))
      .then(({ n, a }) => a <= n)
      .check()
    ).to.deep.include({ satisfiable: true, example: { n: 50 } })
  })

  describe('Transformations', () => {
    it('should allow booleans to be mappeable', () => {
      expect(new FluentCheck()
        .forall('n', fc.integer(10, 100))
        .given('a', () => fc.boolean().map(e => e ? 'Heads' : 'Tails'))
        .then(({ a, n }) => a.sampleWithBias(n).some(s => s.value === 'Heads'))
        .and(({ a, n }) => a.sampleWithBias(n).some(s => s.value === 'Tails'))
        .check()
      ).to.have.property('satisfiable', true)
    })

    it('should allow integers to be filtered', () => {
      expect(new FluentCheck()
        .forall('n', fc.integer(0, 100).filter(n => n < 10))
        .then(({ n }) => n < 10)
        .check()
      ).to.have.property('satisfiable', true)
    })

    it('filters should exclude corner cases, even after shrinking', () => {
      expect(new FluentCheck()
        .exists('a', fc.integer(-20, 20).filter(a => a !== 0))
        .then(({ a }) => a % 11 === 0 && a !== 11 && a !== -11)
        .check()
      ).to.have.property('satisfiable', false)
    })

    it('should allow integers to be both mapped and filtered', () => {
      expect(new FluentCheck()
        .forall('n', fc.integer(0, 100).map(n => n + 100).filter(n => n < 150))
        .then(({ n }) => n >= 100 && n <= 150)
        .check()
      ).to.have.property('satisfiable', true)
    })
  })

  describe('Sizes', () => {
    describe('Statistics tests', () => {
      it('size should be exact for exact well-bounded integer arbitraries', () => {
        expect(fc.integer(1, 1000).size()).to.deep.include({ value: 1000, type: 'exact' })
        expect(fc.integer(0, 10).size()).to.deep.include({ value: 11, type: 'exact' })
        expect(fc.integer(-50, 50).size()).to.deep.include({ value: 101, type: 'exact' })
      })

      it('size should be exact for well-bounded mapped arbitraries', () => {
        expect(fc.integer(0, 1).map(i => i === 0).size()).to.deep.include({ value: 2, type: 'exact' })
        expect(fc.integer(0, 10).map(i => i * 10).size()).to.deep.include({ value: 11, type: 'exact' })
      })

      it('size should be estimated for filtered arbitraries', () => {
        expect(fc.integer(1, 1000).filter(i => i > 200).filter(i => i < 800).size().credibleInterval![0]).to.be.below(600)
        expect(fc.integer(1, 1000).filter(i => i > 200).filter(i => i < 800).size().credibleInterval![1]).to.be.above(600)
        expect(fc.integer(1, 1000).filter(i => i > 200 && i < 800).size().credibleInterval![0]).to.be.below(600)
        expect(fc.integer(1, 1000).filter(i => i > 200 && i < 800).size().credibleInterval![1]).to.be.above(600)
      })

      it("sampling should terminate even if arbitrary's size is potentially zero", () => {
        expect(fc.integer(1, 1000).filter(() => false).sample()).to.deep.include({ value: undefined })
      })
    })

    it('should return the correct size of shrinked integer arbitraries', () => {
      expect(fc.integer(0, 10).shrink({ value: 5 }).size()).to.have.property('value', 5)
    })

    it('should return the correct size of a composite arbitrary', () => {
      expect(fc.union(fc.boolean(), fc.boolean(), fc.boolean()).size()).to.have.property('value', 6)
    })

    it('should return the correct size of a collection arbitrary', () => {
      expect(fc.array(fc.boolean(), 1, 10).size()).to.have.property('value', 512)
    })
  })

  describe('Filtered Arbitraries', () => {
    it('A filtered mapped filtered arbitrary is able to ', () => {
      expect(fc.integer(0, 1).map(a => a === 1).filter(a => a === false).map(a => a ? 0 : 1).canGenerate({ original: 0, value: 0 })).to.be.true
      // TODO: This should be false. However, we are not checking if the filter is able to actually generate the value due to missing intermediate
      // information (i.e. multiple maps generate intermediate different values - and types - and we only preserve the root). Maybe we should consider
      // preserving the full path.
      expect(fc.integer(0, 1).map(a => a === 1).filter(a => a === false).map(a => a ? 0 : 1).canGenerate({ original: 1, value: 1 })).to.be.true
    })
  })

  describe('Unique Arbitraries', () => {
    it('should return all the available values when sample size === size', () => {
      expect(
        fc.integer(0, 10).unique().sample(11).map(v => v.value)
      ).to.include.members([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    })

    it('should should be shrinkable and remain unique', () => {
      expect(
        fc.integer(0, 10).unique().shrink({ value: 5 }).sample(5).map(v => v.value)
      ).to.include.members([0, 1, 2, 3, 4])
    })

    it('should return no more than the number of possible cases', () => {
      expect(new FluentCheck()
        .forall('n', fc.integer(3, 10))
        .given('ub', () => fc.boolean().unique())
        .then(({ n, ub }) => ub.sample(n).length === 2)
        .check()
      ).to.have.property('satisfiable', true)
    })
  })

  describe('Can Generate', () => {
    it('knows if it can generate an integer', () => {
      expect(fc.integer(1, 10).canGenerate({ value: 1 })).to.be.true
      expect(fc.integer(1, 10).canGenerate({ value: 10 })).to.be.true
      expect(fc.integer(1, 10).canGenerate({ value: -1 })).to.be.false
      expect(fc.integer(1, 10).canGenerate({ value: 11 })).to.be.false
    })

    it('knows if it can generate a string', () => {
      expect(fc.string(1, 4, 'abcd').canGenerate({ value: 'a', original: [97] })).to.be.true
      expect(fc.string(1, 4, 'abcd').canGenerate({ value: 'abcd', original: [97, 98, 99, 100] })).to.be.true
      expect(fc.string(1, 4, 'bcd').canGenerate({ value: 'a', original: [97] })).to.be.false
      expect(fc.string(1, 2, 'abcd').canGenerate({ value: 'abc', original: [97, 98, 99] })).to.be.false
      expect(fc.string(2, 4, 'abcd').canGenerate({ value: 'a', original: [97] })).to.be.false
    })

    it('knows if it can generate a boolean', () => {
      expect(fc.boolean().canGenerate({ value: true })).to.be.true
      expect(fc.boolean().canGenerate({ value: false })).to.be.true
    })

    it('knows if it can generate an array', () => {
      expect(fc.array(fc.integer(1, 10), 1, 10).canGenerate({ value: [1, 2, 3], original: [1, 2, 3] })).to.be.true
      expect(fc.array(fc.integer(1, 10), 1, 10).canGenerate({ value: [1, 2, 30], original: [1, 2, 30] })).to.be.false
      expect(fc.array(fc.integer(1, 2), 1, 10).canGenerate({ value: [1, 2, 3], original: [1, 2, 3] })).to.be.false
    })

    it('knows if it can be generated by a composite', () => {
      expect(fc.union(fc.integer(1, 10), fc.integer(20, 30)).canGenerate({ value: 1 })).to.be.true
      expect(fc.union(fc.integer(1, 10), fc.integer(20, 30)).canGenerate({ value: 10 })).to.be.true
      expect(fc.union(fc.integer(1, 10), fc.integer(20, 30)).canGenerate({ value: 20 })).to.be.true
      expect(fc.union(fc.integer(1, 10), fc.integer(20, 30)).canGenerate({ value: 30 })).to.be.true
      expect(fc.union(fc.integer(1, 10), fc.integer(20, 30)).canGenerate({ value: 15 })).to.be.false
      expect(fc.union(fc.integer(1, 10), fc.integer(20, 30)).canGenerate({ value: 0 })).to.be.false
      expect(fc.union(fc.integer(1, 10), fc.integer(20, 30)).canGenerate({ value: 31 })).to.be.false
    })

    it('knows if it can be generated by a map', () => {
      expect(fc.integer(97, 100).map(n => String.fromCharCode(n)).canGenerate({ original: 97, value: 'a' })).to.be.true
      expect(fc.integer(97, 100).map(n => String.fromCharCode(n)).canGenerate({ original: 99, value: 'c' })).to.be.true
      expect(fc.integer(97, 100).map(n => String.fromCharCode(n)).canGenerate({ original: 101, value: 'e' })).to.be.false
      expect(fc.integer(97, 100).map(n => String.fromCharCode(n)).canGenerate({ original: 102, value: 'f' })).to.be.false
    })

    it('knows if it can be generated by a filter', () => {
      expect(fc.integer(0,4).filter(n => n !== 2).canGenerate({ value: -1 })).to.be.false
      expect(fc.integer(0,4).filter(n => n !== 2).canGenerate({ value: 0 })).to.be.true

      // TODO: This should be false. However, we are not checking if the filter is able to actually generate the value due to missing intermediate
      // information (i.e. multiple maps generate intermediate different values - and types - and we only preserve the root). Maybe we should consider
      // preserving the full path.
      // expect(fc.integer(0,4).filter(n => n !== 2).canGenerate({ value: 2 })).to.be.false
      expect(fc.integer(0,4).filter(n => n !== 2).canGenerate({ value: 4 })).to.be.true
      expect(fc.integer(0,4).filter(n => n !== 2).canGenerate({ value: 5 })).to.be.false
    })

  })

  describe('No Arbitrary', () => {
    it('should return size == 0', () => {
      expect(fc.empty().size().value).to.eq(0)
    })

    it('should return an empty sample', () => {
      expect(fc.empty().sample().length).to.eq(0)
      expect(fc.empty().sampleWithBias().length).to.eq(0)
    })

    it('should remain no arbitrary when compose with unique, map, and filter', () => {
      expect(fc.empty().unique()).to.eq(fc.empty())
      expect(fc.empty().map(a => a)).to.eq(fc.empty())
      expect(fc.empty().filter(a => true)).to.eq(fc.empty())
    })
  })
})
