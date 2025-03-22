import * as fc from '../src/index.js'
import {it, describe} from 'mocha'
import * as chai from 'chai'
const {expect} = chai

describe('Arbitrary tests', () => {
  it('should return has many numbers has asked', () => {
    expect(fc.scenario()
      .forall('n', fc.integer(0, 100))
      .given('a', () => fc.integer())
      .then(({n, a}) => a.sample(n).length === n)
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should return values in the specified range', () => {
    expect(fc.scenario()
      .forall('n', fc.integer(0, 100))
      .given('a', () => fc.integer(0, 50))
      .then(({n, a}) => a.sample(n).every(i => i.value <= 50))
      .and(({n, a}) => a.sampleWithBias(n).every(i => i.value <= 50))
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should return corner cases if there is space', () => {
    expect(fc.scenario()
      .forall('n', fc.integer(4, 100))
      .given('a', () => fc.integer(0, 50))
      .then(({n, a}) => a.sampleWithBias(n).some(v => v.value === 0))
      .and(({n, a}) => a.sampleWithBias(n).some(v => v.value === 50))
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should return values smaller than what was shrunk', () => {
    expect(fc.scenario()
      .forall('n', fc.integer(0, 100))
      .forall('s', fc.integer(0, 100))
      .given('a', () => fc.integer(0, 100))
      .then(({n, s, a}) => a.shrink({value: s}).sample(n).every(i => i.value < s))
      .and(({n, s, a}) => a.shrink({value: s}).sampleWithBias(n).every(i => i.value < s))
      .check()
    ).to.have.property('satisfiable', true)
  })

  it('should allow shrinking of mapped arbitraries', () => {
    expect(fc.scenario()
      .exists('n', fc.integer(0, 25).map(x => x + 25).map(x => x * 2))
      .forall('a', fc.integer(0, 10))
      .then(({n, a}) => a <= n)
      .check()
    ).to.deep.include({satisfiable: true, example: {n: 50}})
  })

  it('should allow shrinking of mapped tupples', () => {
    expect(fc.scenario()
      .exists('point', fc.tuple(
        fc.integer(50, 1000).filter(x => x > 100),
        fc.string(1, 10, fc.char('a')).filter(x => x.length > 2)).map(([a, b]) => [a * 2, '_'.concat(b)]))
      .check()).to.deep.include({satisfiable: true, example: {point: [202, '_aaa']}})
  })

  describe('Corner Cases', () => {
    it('should return the corner cases of integers', () => {
      expect(fc.integer().cornerCases().map(c => c.value)).to.have.members(
        [0, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]
      )
      expect(fc.integer(1,10).cornerCases().map(c => c.value)).to.have.members([1, 6, 10])
      expect(fc.integer(-10,10).cornerCases().map(c => c.value)).to.have.members([0, -10, 10])
      expect(fc.integer(5,5).cornerCases().map(c => c.value)).to.have.members([5])
    })

    it('should return the corner cases of booleans', () => {
      expect(fc.boolean().cornerCases().map(c => c.value)).to.have.members([true, false])
    })

    it('should return the corner cases of strings', () => {
      expect(fc.string(0, 0).cornerCases().map(c => c.value)).to.have.members([''])
      expect(fc.string(1, 3, fc.char('a')).cornerCases().map(c => c.value)).to.have.members(['a', 'aaa'])
      expect(fc.string(1, 3, fc.char('a','b')).cornerCases().map(c => c.value)).to.have.members(
        ['a', 'aaa', 'b', 'bbb'])
      expect(fc.string(1, 3, fc.char('a','c')).cornerCases().map(c => c.value)).to.have.members(
        ['a', 'aaa', 'b', 'bbb', 'c', 'ccc']
      )
      expect(fc.string(1, 3, fc.char('a','d')).cornerCases().map(c => c.value)).to.have.members(
        ['a', 'aaa', 'c', 'ccc', 'd', 'ddd']
      )
      expect(fc.string(1, 3, fc.char('a','e')).cornerCases().map(c => c.value)).to.have.members(
        ['a', 'aaa', 'c', 'ccc', 'e', 'eee']
      )
    })

    it('should return the corner cases of arrays/sets', () => {
      expect(fc.array(fc.integer(0, 5), 1, 3).cornerCases().map(c => c.value)).to.have.deep.members(
        [[0], [0, 0, 0], [3], [3, 3, 3], [5], [5, 5, 5]]
      )
      expect(fc.set(['a', 'b', 'c'], 1, 3).cornerCases().map(c => c.value)).to.have.deep.members(
        [['a'], ['a', 'b', 'c']]
      )
    })

    it('should return the corner cases of maps', () => {
      expect(fc.integer(0, 1).map(i => i === 0).cornerCases().map(c => c.value)).to.have.members([true, false])
    })

    it('should return the corner cases of tuples', () => {
      expect(fc.tuple(fc.integer(0, 1), fc.string(1, 2, fc.char('a','c')))
        .cornerCases().map(c => c.value)).to.have.deep.members([
        [0, 'a'], [0, 'aa'], [0, 'b'], [0, 'bb'], [0, 'c'], [0, 'cc'],
        [1, 'a'], [1, 'aa'], [1, 'b'], [1, 'bb'], [1, 'c'], [1, 'cc']
      ])
    })
  })

  describe('Builders', () => {
    it('should return a constant for strings with no chars', () => {
      expect(fc.string(0, 0)).to.be.deep.equal(fc.constant(''))
    })

    it('should return a constant for integers/reals with min == max', () => {
      expect(fc.integer(123,123)).to.be.deep.equal(fc.constant(123))
      expect(fc.real(123,123)).to.be.deep.equal(fc.constant(123))
    })

    it('should return empty for integers/reals with min > max', () => {
      expect(fc.integer(2,1)).to.be.deep.equal(fc.empty())
      expect(fc.real(2,1)).to.be.deep.equal(fc.empty())
    })

    it('should return empty for array/set with min > max', () => {
      expect(fc.array(fc.integer(), 2, 1)).to.be.deep.equal(fc.empty())
      expect(fc.set(['a', 'b', 'c'], 2, 1)).to.be.deep.equal(fc.empty())
    })

    it('should return the only arbitrary for unions with only one arbitrary', () => {
      expect(fc.union(fc.integer(0,10))).to.be.deep.equal(fc.integer(0, 10))
      expect(fc.union(fc.integer(123,123))).to.be.deep.equal(fc.constant(123))
      expect(fc.union(fc.integer(1,0))).to.be.deep.equal(fc.empty())
    })

    it('should return no arbitrary for oneofs of no elements', () => {
      expect(fc.oneof([])).to.be.deep.equal(fc.empty())
    })
  })

  describe('Transformations', () => {
    it('should allow booleans to be mappeable', () => {
      expect(fc.scenario()
        .forall('n', fc.integer(10, 100))
        .given('a', () => fc.boolean().map(e => e ? 'Heads' : 'Tails'))
        .then(({a, n}) => a.sampleWithBias(n).some(s => s.value === 'Heads'))
        .and(({a, n}) => a.sampleWithBias(n).some(s => s.value === 'Tails'))
        .check()
      ).to.have.property('satisfiable', true)
    })

    it('should allow integers to be filtered', () => {
      expect(fc.scenario()
        .forall('n', fc.integer(0, 100).filter(n => n < 10))
        .then(({n}) => n < 10)
        .check()
      ).to.have.property('satisfiable', true)
    })

    it('filters should exclude corner cases, even after shrinking', () => {
      expect(fc.scenario()
        .exists('a', fc.integer(-20, 20).filter(a => a !== 0))
        .then(({a}) => a % 11 === 0 && a !== 11 && a !== -11)
        .check()
      ).to.have.property('satisfiable', false)
    })

    it('should allow integers to be both mapped and filtered', () => {
      expect(fc.scenario()
        .forall('n', fc.integer(0, 100).map(n => n + 100).filter(n => n < 150))
        .then(({n}) => n >= 100 && n <= 150)
        .check()
      ).to.have.property('satisfiable', true)
    })
  })

  describe('Sizes', () => {
    describe('Statistics tests', () => {
      it('size should be exact for exact well-bounded integer arbitraries', () => {
        expect(fc.integer(1, 1000).size()).to.deep.include({value: 1000, type: 'exact'})
        expect(fc.integer(0, 10).size()).to.deep.include({value: 11, type: 'exact'})
        expect(fc.integer(-50, 50).size()).to.deep.include({value: 101, type: 'exact'})
      })

      it('size should be exact for well-bounded mapped arbitraries', () => {
        expect(fc.integer(0, 1).map(i => i === 0).size()).to.deep.include({value: 2, type: 'exact'})
        expect(fc.integer(0, 10).map(i => i * 10).size()).to.deep.include({value: 11, type: 'exact'})
      })

      it('size should be estimated for filtered arbitraries', () => {
        expect(fc.integer(1, 1000).filter(i => i > 200).filter(i => i < 800).size().credibleInterval[0])
          .to.be.below(600)
        expect(fc.integer(1, 1000).filter(i => i > 200).filter(i => i < 800).size().credibleInterval[1])
          .to.be.above(600)
        expect(fc.integer(1, 1000).filter(i => i > 200 && i < 800).size().credibleInterval[0])
          .to.be.below(600)
        expect(fc.integer(1, 1000).filter(i => i > 200 && i < 800).size().credibleInterval[1])
          .to.be.above(600)
      })

      it("sampling should terminate even if arbitrary's size is potentially zero", () => {
        expect(fc.integer(1, 1000).filter(() => false).sample()).to.be.empty
      })
    })

    it('should return the correct size of shrinked integer arbitraries', () => {
      expect(fc.integer(0, 10).shrink({value: 5}).size()).to.have.property('value', 5)
    })

    it('should return the correct size of a composite arbitrary', () => {
      expect(fc.union(fc.boolean(), fc.boolean(), fc.boolean()).size()).to.have.property('value', 6)
    })

    it('should return the correct size of a collection arbitrary', () => {
      expect(fc.array(fc.boolean(), 10, 10).size()).to.have.property('value', 1024)
      expect(fc.array(fc.boolean(), 1, 10).size()).to.have.property('value', 2046)
      expect(fc.array(fc.empty(), 0, 10).size()).to.have.property('value', 1)
      expect(fc.array(fc.empty(), 1, 10).size()).to.have.property('value', 0)
      expect(fc.array(fc.integer(0, 3), 3, 4).size()).to.have.property('value', 320)

      expect(fc.set([], 0, 0).size()).to.have.property('value', 1)
      expect(fc.set(['a', 'b', 'c'], 1, 3).size()).to.have.property('value', 7)
      // TODO(rui): should we replace exact values with an "unbounded" value when they're bigger
      // than MAX_SAFE_INTEGER? This will bite us later.
      expect(fc.array(fc.integer(), 1, 2).size()).to.have.property('value').gt(Number.MAX_SAFE_INTEGER)
    })

    it('should return the correct size of a oneof arbitrary', () => {
      expect(fc.oneof(['a', 'b', 'c']).size()).to.have.property('value', 3)
    })

  })

  describe('Filtered Arbitraries', () => {
    it('should be able to verify if a pick can be generated by a filtered mapped filtered arbitrary', () => {
      expect(fc.integer(0, 1)
        .map(a => a === 1, {inverseMap: b => b ? [1] : [0]})
        .filter(a => a === false)
        .map(a => a ? 0 : 1, {inverseMap: b => b === 0 ? [true] : [false]})
        .canGenerate({original: 0, value: 0})).to.be.false

      expect(fc.integer(0, 1)
        .map(a => a === 1, {inverseMap: b => b ? [1] : [0]})
        .filter(a => a === false)
        .map(a => a ? 0 : 1, {inverseMap: b => b === 0 ? [true] : [false]})
        .canGenerate({original: 1, value: 1})).to.be.true
    })
  })

  describe('Mapped Arbitraries', () => {
    it('should be able to inverse map transformation', () => {
      expect(fc.integer(-10, 0).map(a => Math.abs(a), {inverseMap: b => [-b]})
        .canGenerate({original: -5, value: -5})).to.be.false
      expect(fc.integer(-10, 0).map(a => Math.abs(a), {canGenerate: b => b.value >= 0 && b.value <= 10})
        .canGenerate({original: -5, value: -5})).to.be.false

      expect(fc.integer(-10, 10).map(a => Math.abs(a), {inverseMap: b => [-b, b]})
        .canGenerate({original: -5, value: -5})).to.be.true
      expect(fc.integer(-10, 10).map(a => Math.abs(a), {canGenerate: b => b.value >= -10 && b.value <= 10})
        .canGenerate({original: -5, value: -5})).to.be.true

      expect(fc.array(fc.integer(-10, 0), 2, 5)
        .map(a => a.map(b => Math.abs(b)), {inverseMap: b => [b.map(x => -x)]})
        .canGenerate({original: [-5, -3, -2], value: [-5, -3, -2]})).to.be.false
    })
  })

  describe('Unique Arbitraries', () => {
    it('should return all the available values when sample size === size', () => {
      expect(
        fc.integer(0, 10).sampleUnique(11).map(v => v.value)
      ).to.include.members([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    })

    it('should return no more than the number of possible cases', () => {
      expect(fc.scenario()
        .forall('n', fc.integer(3, 10))
        .given('ub', () => fc.boolean())
        .then(({n, ub}) => ub.sampleUnique(n).length === 2)
        .check()
      ).to.have.property('satisfiable', true)
    })

    it('should return a unique sample with bias with corner cases', () => {
      expect(fc.scenario()
        .forall('n', fc.integer(10, 20))
        .forall('s', fc.integer(5, 10))
        .given('a', ({n}) => fc.integer(0, n))
        .and('r', ({a, s}) => a.sampleUniqueWithBias(s))
        .then(({r, s}) => r.length === s)
        .and(({r}) => r.length === new Set(r.map(e => e.value)).size)
        .and(({a, r}) => a.cornerCases().map(c => c.value).every(e => r.map(e => e.value).includes(e)))
        .check()
      ).to.have.property('satisfiable', true)
    })

    it('should return a unique sample with bias even with a small sample', () => {
      expect(fc.scenario()
        .forall('n', fc.integer(10, 20))
        .forall('s', fc.integer(0, 5))
        .given('a', ({n}) => fc.integer(0, n))
        .and('r', ({a, s}) => a.sampleUniqueWithBias(s))
        .then(({r, s}) => r.length === s)
        .and(({r}) => r.length === new Set(r.map(e => e.value)).size)
        .check()
      ).to.have.property('satisfiable', true)
    })
  })

  describe('Chained Arbitraries', () => {
    it('should allow the creation of array with size based on an integer arbitrary', () => {
      expect(
        fc.integer(2, 2).chain(i => fc.array(fc.constant(i), i, i)).sample(1)[0].value
      ).to.eql([2, 2])
    })

    it('should check a property based on a chained arbitrary', () => {
      expect(
        fc.scenario()
          .forall('a', fc.integer(1, 10).chain(i => fc.array(fc.constant(i), i, i)))
          .then(({a}) => a.length === a[0])
          .check()
      ).to.have.property('satisfiable', true)
    })
  })

  describe('Can Generate', () => {
    it('knows if it can generate an integer', () => {
      expect(fc.integer(1, 10).canGenerate({value: 1})).to.be.true
      expect(fc.integer(1, 10).canGenerate({value: 10})).to.be.true
      expect(fc.integer(1, 10).canGenerate({value: -1})).to.be.false
      expect(fc.integer(1, 10).canGenerate({value: 11})).to.be.false
    })

    it('knows if it can generate a string', () => {
      expect(fc.string(1, 4).canGenerate({value: 'a', original: [97]})).to.be.true
      expect(fc.string(1, 4).canGenerate({value: 'abcd', original: [97, 98, 99, 100]})).to.be.true
      expect(fc.string(1, 2).canGenerate({value: 'abc', original: [97, 98, 99]})).to.be.false
      expect(fc.string(2, 4).canGenerate({value: 'a', original: [97]})).to.be.false
      expect(fc.string(2, 4).canGenerate({value: 'abcd', original: [97, 98, 99, 100]})).to.be.true
      expect(fc.string(2, 4).canGenerate({value: '12', original: [49, 50]})).to.be.true
      expect(fc.string(2, 4).canGenerate({value: 'ab12', original: [97, 98, 49, 50]})).to.be.true
    })

    it('knows if it can generate a boolean', () => {
      expect(fc.boolean().canGenerate({value: true})).to.be.true
      expect(fc.boolean().canGenerate({value: false})).to.be.true
    })

    it('knows if it can generate an array', () => {
      expect(fc.array(fc.integer(1, 10), 1, 10).canGenerate({value: [1, 2, 3], original: [1, 2, 3]})).to.be.true
      expect(fc.array(fc.integer(1, 10), 1, 10).canGenerate({value: [1, 2, 30], original: [1, 2, 30]})).to.be.false
      expect(fc.array(fc.integer(1, 2), 1, 10).canGenerate({value: [1, 2, 3], original: [1, 2, 3]})).to.be.false
    })

    it('knows if it can be generated by a composite', () => {
      expect(fc.union(fc.integer(1, 10), fc.integer(20, 30)).canGenerate({value: 1})).to.be.true
      expect(fc.union(fc.integer(1, 10), fc.integer(20, 30)).canGenerate({value: 10})).to.be.true
      expect(fc.union(fc.integer(1, 10), fc.integer(20, 30)).canGenerate({value: 20})).to.be.true
      expect(fc.union(fc.integer(1, 10), fc.integer(20, 30)).canGenerate({value: 30})).to.be.true
      expect(fc.union(fc.integer(1, 10), fc.integer(20, 30)).canGenerate({value: 15})).to.be.false
      expect(fc.union(fc.integer(1, 10), fc.integer(20, 30)).canGenerate({value: 0})).to.be.false
      expect(fc.union(fc.integer(1, 10), fc.integer(20, 30)).canGenerate({value: 31})).to.be.false
    })

    it('knows if it can be generated by a map', () => {
      expect(fc.integer(97, 100).map(n => String.fromCharCode(n)).canGenerate({original: 97, value: 'a'})).to.be.true
      expect(fc.integer(97, 100).map(n => String.fromCharCode(n)).canGenerate({original: 99, value: 'c'})).to.be.true
      expect(fc.integer(97, 100).map(n => String.fromCharCode(n)).canGenerate({original: 101, value: 'e'})).to.be.false
      expect(fc.integer(97, 100).map(n => String.fromCharCode(n)).canGenerate({original: 102, value: 'f'})).to.be.false
    })

    it('knows if it can be generated by a filter', () => {
      expect(fc.integer(0,4).filter(n => n !== 2).canGenerate({value: -1})).to.be.false
      expect(fc.integer(0,4).filter(n => n !== 2).canGenerate({value: 0})).to.be.true

      // TODO: This should be false. However, we are not checking if the filter is able to actually generate the value
      // due to missing intermediate information (i.e. multiple maps generate intermediate different values - and
      // types - and we only preserve the root). Maybe we should consider preserving the full path.
      // expect(fc.integer(0,4).filter(n => n !== 2).canGenerate({ value: 2 })).to.be.false
      expect(fc.integer(0,4).filter(n => n !== 2).canGenerate({value: 4})).to.be.true
      expect(fc.integer(0,4).filter(n => n !== 2).canGenerate({value: 5})).to.be.false
    })

    it('knows if it can be generated by a set', () => {
      expect(fc.set(['a', 'b', 'c'], 1, 3) .canGenerate({value: ['a', 'b', 'c']})).to.be.true
      expect(fc.set(['a', 'b', 'c'], 1, 3) .canGenerate({value: ['a', 'b', 'd']})).to.be.false
      expect(fc.set(['a', 'b', 'c'], 1, 2) .canGenerate({value: ['a', 'b', 'c']})).to.be.false
      expect(fc.set([], 0, 0).canGenerate({value: []})).to.be.true
      expect(fc.set([], 1, 2).canGenerate({value: []})).to.be.false
    })

    it('knows if it can be generated by a oneof', () => {
      expect(fc.oneof(['a', 'b', 'c']).canGenerate({value: 'a', original: 0})).to.be.true
      expect(fc.oneof(['a', 'b', 'c']).canGenerate({value: 'd', original: 3})).to.be.false
    })

    it('knows if it can be generated by a constant', () => {
      expect(fc.constant('a').canGenerate({value: 'a'})).to.be.true
      expect(fc.constant(1).canGenerate({value: 1, original: undefined})).to.be.true
      expect(fc.constant('a').canGenerate({value: 'b'})).to.be.false
      expect(fc.constant(1).canGenerate({value: 2, original: undefined})).to.be.false
    })

    it('knows if it can be generated by a tuple', () => {
      expect(fc.tuple(fc.integer(1, 5), fc.string(1, 5, fc.char('a','c')))
        .canGenerate({value: [1, 'b'], original: [undefined, [98]]})).to.be.true
      expect(fc.tuple(fc.integer(1, 5), fc.string(1, 5, fc.char('a','c')))
        .canGenerate({value: [6, 'b'], original: [undefined, [98]]})).to.be.false
      expect(fc.tuple(fc.integer(1, 5), fc.string(1, 5, fc.char('a','c')))
        .canGenerate({value: [1, 'd'], original: [undefined, [100]]})).to.be.false
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

    it('should remain no arbitrary when compose with map, and filter', () => {
      expect(fc.empty().map(a => a)).to.eq(fc.empty())
      expect(fc.empty().filter(_ => true)).to.eq(fc.empty())
    })

    it('should always be satisfiable due to vacuous truth in universal assertions', () => {
      /* istanbul ignore next */
      expect(fc.scenario()
        .forall('empty', fc.empty())
        .then(_ => false)
        .check()
      ).to.have.property('satisfiable', true)
    })

    it('should never be satisfiable due to vacuous truth in existential assertions', () => {
      /* istanbul ignore next */
      expect(fc.scenario()
        .exists('empty', fc.empty())
        .then(_ => true)
        .check()
      ).to.have.property('satisfiable', false)
    })
  })
})
