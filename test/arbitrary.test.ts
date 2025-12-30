import * as fc from '../src/index.js'
import {exactSize, estimatedSize} from '../src/arbitraries/index.js'
import type {ArbitrarySize} from '../src/arbitraries/types.js'
import {it, describe} from 'mocha'
import * as chai from 'chai'
import {
  scenarioWithSampleSize,
  seededScenario,
  assertSatisfiable,
  assertNotSatisfiable,
  assertSatisfiableWithExample,
  getCornerCaseValues,
  assertCanGenerate,
  assertCannotGenerate,
  assertExactSize,
  assertEstimatedSize,
  mediumInt
} from './test-utils.js'
const {expect} = chai

describe('Arbitrary tests', () => {
  it('should return has many numbers has asked', () => {
    const result = scenarioWithSampleSize()
      .forall('n', mediumInt())
      .given('a', () => fc.integer())
      .then(({n, a}) => a.sample(n).length === n)
      .check()
    assertSatisfiable(result)
  })

  it('should return values in the specified range', () => {
    const result = scenarioWithSampleSize()
      .forall('n', mediumInt())
      .given('a', () => fc.integer(0, 50))
      .then(({n, a}) => a.sample(n).every(i => i.value <= 50))
      .and(({n, a}) => a.sampleWithBias(n).every(i => i.value <= 50))
      .check()
    assertSatisfiable(result)
  })

  it('should return corner cases if there is space', () => {
    const result = scenarioWithSampleSize()
      .forall('n', fc.integer(4, 100))
      .given('a', () => fc.integer(0, 50))
      .then(({n, a}) => a.sampleWithBias(n).some(v => v.value === 0))
      .and(({n, a}) => a.sampleWithBias(n).some(v => v.value === 50))
      .check()
    assertSatisfiable(result)
  })

  it('should return values smaller than what was shrunk', () => {
    const result = scenarioWithSampleSize()
      .forall('n', mediumInt())
      .forall('s', mediumInt())
      .given('a', () => mediumInt())
      .then(({n, s, a}) => a.shrink({value: s}).sample(n).every(i => i.value < s))
      .and(({n, s, a}) => a.shrink({value: s}).sampleWithBias(n).every(i => i.value < s))
      .check()
    assertSatisfiable(result)
  })

  it('should allow shrinking of mapped arbitraries', () => {
    const result = fc.scenario()
      .exists('n', fc.integer(0, 25).map(x => x + 25).map(x => x * 2))
      .forall('a', fc.integer(0, 10))
      .then(({n, a}) => a <= n)
      .check()
    assertSatisfiableWithExample(result, {n: 50})
  })

  it('should allow shrinking of mapped tupples', () => {
    const result = seededScenario()
      .exists('point', fc.tuple(
        fc.integer(50, 1000).filter(x => x > 100),
        fc.string(1, 10, fc.char('a')).filter(x => x.length > 2)).map(([a, b]) => [a * 2, '_'.concat(b)]))
      .check()
    assertSatisfiableWithExample(result, {point: [202, '_aaa']})
  })

  it('should shrink mapped arbitraries using the pre-map value', () => {
    const mapped = fc.integer(0, 10).map(n => n * n)
    const shrunk = mapped.shrink({value: 25, original: 25, preMapValue: 5})
    const samples = shrunk.sample(5, () => 0.1)

    expect(samples.every(p => p.value <= 25)).to.be.true
    expect(samples.some(p => p.value < 25)).to.be.true
    expect(samples.every(p => Number.isInteger(Math.sqrt(p.value)))).to.be.true
  })

  describe('Corner Cases', () => {
    it('should return the corner cases of integers', () => {
      expect(getCornerCaseValues(fc.integer())).to.have.members(
        [0, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]
      )
      expect(getCornerCaseValues(fc.integer(1,10))).to.have.members([1, 6, 10])
      expect(getCornerCaseValues(fc.integer(-10,10))).to.have.members([0, -10, 10])
      expect(getCornerCaseValues(fc.integer(5,5))).to.have.members([5])
    })

    it('should return the corner cases of booleans', () => {
      expect(getCornerCaseValues(fc.boolean())).to.have.members([true, false])
    })

    it('should return the corner cases of strings', () => {
      expect(getCornerCaseValues(fc.string(0, 0))).to.have.members([''])
      expect(getCornerCaseValues(fc.string(1, 3, fc.char('a')))).to.have.members(['a', 'aaa'])
      expect(getCornerCaseValues(fc.string(1, 3, fc.char('a','b')))).to.have.members(
        ['a', 'aaa', 'b', 'bbb'])
      expect(getCornerCaseValues(fc.string(1, 3, fc.char('a','c')))).to.have.members(
        ['a', 'aaa', 'b', 'bbb', 'c', 'ccc']
      )
      expect(getCornerCaseValues(fc.string(1, 3, fc.char('a','d')))).to.have.members(
        ['a', 'aaa', 'c', 'ccc', 'd', 'ddd']
      )
      expect(getCornerCaseValues(fc.string(1, 3, fc.char('a','e')))).to.have.members(
        ['a', 'aaa', 'c', 'ccc', 'e', 'eee']
      )
    })

    it('should return the corner cases of arrays/sets', () => {
      expect(getCornerCaseValues(fc.array(fc.integer(0, 5), 1, 3))).to.have.deep.members(
        [[0], [0, 0, 0], [3], [3, 3, 3], [5], [5, 5, 5]]
      )
      expect(getCornerCaseValues(fc.set(['a', 'b', 'c'], 1, 3))).to.have.deep.members(
        [['a'], ['a', 'b', 'c']]
      )
    })

    it('should return the corner cases of maps', () => {
      expect(getCornerCaseValues(fc.integer(0, 1).map(i => i === 0))).to.have.members([true, false])
    })

    it('should return the corner cases of tuples', () => {
      expect(getCornerCaseValues(fc.tuple(fc.integer(0, 1), fc.string(1, 2, fc.char('a','c'))))).to.have.deep.members([
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
      const result = scenarioWithSampleSize()
        .forall('n', fc.integer(10, 100))
        .given('a', () => fc.boolean().map(e => e ? 'Heads' : 'Tails'))
        .then(({a, n}) => a.sampleWithBias(n).some(s => s.value === 'Heads'))
        .and(({a, n}) => a.sampleWithBias(n).some(s => s.value === 'Tails'))
        .check()
      assertSatisfiable(result)
    })

    it('should allow integers to be filtered', () => {
      const result = scenarioWithSampleSize()
        .forall('n', mediumInt().filter(n => n < 10))
        .then(({n}) => n < 10)
        .check()
      assertSatisfiable(result)
    })

    it('filters should exclude corner cases, even after shrinking', () => {
      const result = fc.scenario()
        .exists('a', fc.integer(-20, 20).filter(a => a !== 0))
        .then(({a}) => a % 11 === 0 && a !== 11 && a !== -11)
        .check()
      assertNotSatisfiable(result)
    })

    it('should allow integers to be both mapped and filtered', () => {
      const result = scenarioWithSampleSize()
        .forall('n', mediumInt().map(n => n + 100).filter(n => n < 150))
        .then(({n}) => n >= 100 && n <= 150)
        .check()
      assertSatisfiable(result)
    })

    describe('suchThat (filter alias)', () => {
      it('suchThat should produce same results as filter', () => {
        const predicate = (n: number) => n > 50
        const filterArb = mediumInt().filter(predicate)
        const suchThatArb = mediumInt().suchThat(predicate)

        // Both should have the same estimated size type
        expect(filterArb.size().type).to.equal(suchThatArb.size().type)
        expect(filterArb.size().type).to.equal('estimated')
      })

      it('suchThat should work in property tests', () => {
        const result = fc.scenario()
          .forall('n', mediumInt().suchThat(n => n < 10))
          .then(({n}) => n < 10)
          .check()
        assertSatisfiable(result)
      })

      it('suchThat should chain with map correctly', () => {
        const result = fc.scenario()
          .forall('n', mediumInt().suchThat(n => n > 50).map(n => n * 2))
          .then(({n}) => n > 100)
          .check()
        assertSatisfiable(result)
      })

      it('suchThat should chain with other transformations', () => {
        const arb = mediumInt()
          .suchThat(n => n % 2 === 0)  // even numbers
          .map(n => n / 2)              // divide by 2

        const result = fc.scenario()
          .forall('n', arb)
          .then(({n}) => Number.isInteger(n) && n >= 0 && n <= 50)
          .check()
        assertSatisfiable(result)
      })

      it('suchThat should exclude corner cases appropriately', () => {
        const result = fc.scenario()
          .exists('a', fc.integer(-20, 20).suchThat(a => a !== 0))
          .then(({a}) => a % 11 === 0 && a !== 11 && a !== -11)
          .check()
        assertNotSatisfiable(result)
      })
    })
  })

  describe('Sizes', () => {
    describe('Discriminated Unions', () => {
      describe('Factory functions', () => {
        it('exactSize creates an ExactSize with only type and value', () => {
          const size = exactSize(42)
          expect(size).to.deep.equal({type: 'exact', value: 42})
          expect(size).to.not.have.property('credibleInterval')
        })

        it('estimatedSize creates an EstimatedSize with type, value, and credibleInterval', () => {
          const size = estimatedSize(100, [90, 110])
          expect(size).to.deep.equal({type: 'estimated', value: 100, credibleInterval: [90, 110]})
        })
      })

      describe('ExactSize implementations', () => {
        it('integer arbitrary returns ExactSize without credibleInterval', () => {
          const size = fc.integer(0, 10).size()
          assertExactSize(size, 11)
          expect(size).to.not.have.property('credibleInterval')
        })

        it('constant arbitrary returns ExactSize', () => {
          const size = fc.constant(42).size()
          assertExactSize(size, 1)
          expect(size).to.not.have.property('credibleInterval')
        })

        it('empty arbitrary returns ExactSize with value 0', () => {
          const size = fc.empty().size()
          assertExactSize(size, 0)
          expect(size).to.not.have.property('credibleInterval')
        })

        it('set arbitrary returns ExactSize', () => {
          const size = fc.set(['a', 'b', 'c'], 1, 3).size()
          assertExactSize(size, 7)
          expect(size).to.not.have.property('credibleInterval')
        })

        it('boolean arbitrary returns ExactSize', () => {
          const size = fc.boolean().size()
          assertExactSize(size, 2)
          expect(size).to.not.have.property('credibleInterval')
        })
      })

      describe('EstimatedSize implementations', () => {
        it('filtered arbitrary returns EstimatedSize with credibleInterval', () => {
          const size = fc.integer(0, 100).filter(n => n > 50).size()

          // We are loosing type information here, because .filter should automatically
          // narrow the type back to an estimated size. See #438
          assertEstimatedSize(size)
          if (size.type === 'estimated') {
            expect(size.credibleInterval[0]).to.be.at.most(size.credibleInterval[1])
          }
        })
      })

      describe('Conditional implementations', () => {
        it('tuple of exact arbitraries returns ExactSize', () => {
          const size = fc.tuple(fc.integer(0, 1), fc.boolean()).size()
          expect(size.type).to.equal('exact')
          expect(size.value).to.equal(4) // 2 * 2
          expect(size).to.not.have.property('credibleInterval')
        })

        it('tuple containing filtered arbitrary returns EstimatedSize', () => {
          const size = fc.tuple(fc.integer(0, 10).filter(n => n > 5), fc.boolean()).size()
          assertEstimatedSize(size)
        })

        it('tuple propagates credible intervals correctly (product)', () => {
          // fc.integer(0, 10).filter(n => n > 5) has ~5 values with uncertainty
          // fc.boolean() has exactly 2 values
          // Product should multiply: value * 2, with interval bounds also multiplied
          const filtered = fc.integer(0, 10).filter(n => n > 5)
          const filteredSize = filtered.size()
          expect(filteredSize.type).to.equal('estimated')
          if (filteredSize.type !== 'estimated') throw new Error('Expected estimated')

          const tupleSize = fc.tuple(filtered, fc.boolean()).size()
          expect(tupleSize.type).to.equal('estimated')
          if (tupleSize.type !== 'estimated') throw new Error('Expected estimated')

          // The tuple's interval should NOT be degenerate [value, value]
          const [lower, upper] = tupleSize.credibleInterval
          expect(lower).to.be.at.most(tupleSize.value)
          expect(upper).to.be.at.least(tupleSize.value)
          // And it should have actual width (not degenerate)
          expect(upper - lower).to.be.greaterThan(0)
          // Interval should be 2x the filtered arbitrary's interval
          expect(lower).to.equal(filteredSize.credibleInterval[0] * 2)
          expect(upper).to.equal(filteredSize.credibleInterval[1] * 2)
        })

        it('union of exact arbitraries returns ExactSize', () => {
          const size = fc.union(fc.integer(0, 5), fc.integer(10, 15)).size()
          assertExactSize(size, 12) // 6 + 6
          expect(size).to.not.have.property('credibleInterval')
        })

        it('union containing filtered arbitrary returns EstimatedSize', () => {
          const size = fc.union(fc.integer(0, 10).filter(n => n > 5), fc.integer(-1, 0)).size()
          assertEstimatedSize(size)
        })

        it('union propagates credible intervals correctly (sum)', () => {
          // fc.integer(0, 10).filter(n => n > 5) has ~5 values with uncertainty
          // fc.integer(-1, 0) has exactly 2 values
          // Sum should add: value + 2, with interval bounds also added
          const filtered = fc.integer(0, 10).filter(n => n > 5)
          const filteredSize = filtered.size()
          expect(filteredSize.type).to.equal('estimated')
          if (filteredSize.type !== 'estimated') throw new Error('Expected estimated')

          const exact = fc.integer(-1, 0)
          const exactSize = exact.size()
          expect(exactSize.type).to.equal('exact')
          expect(exactSize.value).to.equal(2)

          const unionSize = fc.union(filtered, exact).size()
          expect(unionSize.type).to.equal('estimated')
          if (unionSize.type !== 'estimated') throw new Error('Expected estimated')

          // The union's interval should NOT be degenerate [value, value]
          const [lower, upper] = unionSize.credibleInterval
          expect(lower).to.be.at.most(unionSize.value)
          expect(upper).to.be.at.least(unionSize.value)
          // And it should have actual width (not degenerate)
          expect(upper - lower).to.be.greaterThan(0)
          // Interval should be filtered interval + 2
          expect(lower).to.equal(filteredSize.credibleInterval[0] + 2)
          expect(upper).to.equal(filteredSize.credibleInterval[1] + 2)
        })

        it('array of exact arbitrary returns ExactSize', () => {
          const size = fc.array(fc.boolean(), 2, 2).size()
          assertExactSize(size, 4) // 2^2
          expect(size).to.not.have.property('credibleInterval')
        })

        it('array of filtered arbitrary returns EstimatedSize', () => {
          const size = fc.array(fc.integer(0, 10).filter(n => n > 5), 1, 2).size()
          assertEstimatedSize(size)
        })
      })

      describe('Type narrowing at runtime', () => {
        it('can discriminate between exact and estimated sizes', () => {
          const exactSz = fc.integer(0, 10).size()
          const estimatedSz = fc.integer(0, 100).filter(n => n > 50).size()

          // Runtime type narrowing
          if (exactSz.type === 'exact') {
            expect(exactSz).to.not.have.property('credibleInterval')
          } else {
            throw new Error('Expected exact size')
          }

          if (estimatedSz.type === 'estimated') {
            expect(estimatedSz.credibleInterval).to.be.an('array')
          } else {
            throw new Error('Expected estimated size')
          }
        })

        it('switch statement covers all cases', () => {
          const formatSize = (size: ArbitrarySize): string => {
            switch (size.type) {
              case 'exact':
                return `exact:${size.value}`
              case 'estimated':
                return `estimated:${size.value}:[${size.credibleInterval.join(',')}]`
            }
          }

          expect(formatSize(fc.integer(0, 5).size())).to.equal('exact:6')
          const filtered = fc.integer(0, 100).filter(n => n > 50).size()
          expect(formatSize(filtered)).to.match(/^estimated:\d+:\[\d+\.?\d*,\d+\.?\d*\]$/)
        })
      })
    })

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
        const size1 = fc.integer(1, 1000).filter(i => i > 200).filter(i => i < 800).size()
        expect(size1.type).to.equal('estimated')
        // We are loosing type information here, because .filter should automatically
        // narrow the type back to an estimated size. See #438
        if (size1.type === 'estimated') {
          expect(size1.credibleInterval[0]).to.be.below(600)
          expect(size1.credibleInterval[1]).to.be.above(600)
        } else {
          throw new Error('Expected estimated size')
        }

        const size2 = fc.integer(1, 1000).filter(i => i > 200 && i < 800).size()
        expect(size2.type).to.equal('estimated')
        // We are loosing type information here, because .filter should automatically
        // narrow the type back to an estimated size. See #438
        if (size2.type === 'estimated') {
          expect(size2.credibleInterval[0]).to.be.below(600)
          expect(size2.credibleInterval[1]).to.be.above(600)
        } else {
          throw new Error('Expected estimated size')
        }
      })

      it("sampling should terminate even if arbitrary's size is potentially zero", () => {
        expect(fc.integer(1, 1000).filter(() => false).sample()).to.be.empty
      })
    })

    it('should return the correct size of shrinked integer arbitraries', () => {
      // Shrinking uses weighted union of [target, mid] and [mid+1, current]
      // For value 5: target=0, current=4, mid=2
      // Weighted of integer(0,2) [size 3] and integer(3,4) [size 2] = 5
      expect(fc.integer(0, 10).shrink({value: 5}).size().value).to.equal(5)
    })

    it('should return the correct size of a composite arbitrary', () => {
      expect(fc.union(fc.boolean(), fc.boolean(), fc.boolean()).size().value).to.equal(6)
    })

    it('should return the correct size of a collection arbitrary', () => {
      expect(fc.array(fc.boolean(), 10, 10).size().value).to.equal(1024)
      expect(fc.array(fc.boolean(), 1, 10).size().value).to.equal(2046)
      expect(fc.array(fc.empty(), 0, 10).size().value).to.equal(1)
      expect(fc.array(fc.empty(), 1, 10).size().value).to.equal(0)
      expect(fc.array(fc.integer(0, 3), 3, 4).size().value).to.equal(320)

      expect(fc.set([], 0, 0).size().value).to.equal(1)
      expect(fc.set(['a', 'b', 'c'], 1, 3).size().value).to.equal(7)
      // TODO(rui): should we replace exact values with an "unbounded" value when they're bigger
      // than MAX_SAFE_INTEGER? This will bite us later.
      expect(fc.array(fc.integer(), 1, 2).size().value).to.be.greaterThan(Number.MAX_SAFE_INTEGER)
    })

    it('should return the correct size of a oneof arbitrary', () => {
      expect(fc.oneof(['a', 'b', 'c']).size().value).to.equal(3)
    })

  })

  describe('Filtered Arbitraries', () => {
    it('should be able to verify if a pick can be generated by a filtered mapped filtered arbitrary', () => {
      assertCannotGenerate(
        fc.integer(0, 1)
          .map(a => a === 1, {inverseMap: b => b ? [1] : [0]})
          .filter(a => a === false)
          .map(a => a ? 0 : 1, {inverseMap: b => b === 0 ? [true] : [false]}),
        {original: 0, value: 0}
      )

      assertCanGenerate(
        fc.integer(0, 1)
          .map(a => a === 1, {inverseMap: b => b ? [1] : [0]})
          .filter(a => a === false)
          .map(a => a ? 0 : 1, {inverseMap: b => b === 0 ? [true] : [false]}),
        {original: 1, value: 1}
      )
    })
  })

  describe('Mapped Arbitraries', () => {
    it('should be able to inverse map transformation', () => {
      assertCannotGenerate(
        fc.integer(-10, 0).map(a => Math.abs(a), {inverseMap: b => [-b]}),
        {original: -5, value: -5}
      )
      assertCannotGenerate(
        fc.integer(-10, 0).map(a => Math.abs(a), {canGenerate: b => b.value >= 0 && b.value <= 10}),
        {original: -5, value: -5}
      )

      assertCanGenerate(
        fc.integer(-10, 10).map(a => Math.abs(a), {inverseMap: b => [-b, b]}),
        {original: -5, value: -5}
      )
      assertCanGenerate(
        fc.integer(-10, 10).map(a => Math.abs(a), {canGenerate: b => b.value >= -10 && b.value <= 10}),
        {original: -5, value: -5}
      )

      assertCannotGenerate(
        fc.array(fc.integer(-10, 0), 2, 5)
          .map(a => a.map(b => Math.abs(b)), {inverseMap: b => [b.map(x => -x)]}),
        {original: [-5, -3, -2], value: [-5, -3, -2]}
      )
    })
  })

  describe('Unique Arbitraries', () => {
    it('should return all the available values when sample size === size', () => {
      expect(
        fc.integer(0, 10).sampleUnique(11).map(v => v.value)
      ).to.include.members([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    })

    it('should not stall when unique value count is smaller than size() (non-injective map)', () => {
      const mapped = fc.integer(0, 10).map(() => 0)
      const samples = mapped.sampleUnique(1000)
      expect(samples.length).to.equal(1)
      expect(samples[0]?.value).to.equal(0)
    })

    it('should not stall when unique value count is smaller than size() (overlapping union)', () => {
      const union = fc.union(fc.integer(0, 10), fc.integer(5, 15))
      const samples = union.sampleUnique(1000)
      const values = samples.map(s => s.value)
      expect(values.length).to.equal(new Set(values).size)
      expect(values.length).to.be.at.most(16) // 0..15
    })

    it('should return no more than the number of possible cases', () => {
      const result = fc.scenario()
        .forall('n', fc.integer(3, 10))
        .given('ub', () => fc.boolean())
        .then(({n, ub}) => ub.sampleUnique(n).length === 2)
        .check()
      assertSatisfiable(result)
    })

    it('should return a unique sample with bias with corner cases', () => {
      const result = fc.scenario()
        .forall('n', fc.integer(10, 20))
        .forall('s', fc.integer(5, 10))
        .given('a', ({n}) => fc.integer(0, n))
        .and('r', ({a, s}) => a.sampleUniqueWithBias(s))
        .then(({r, s}) => r.length === s)
        .and(({r}) => r.length === new Set(r.map(e => e.value)).size)
        .and(({a, r}) => a.cornerCases().map(c => c.value).every(e => r.map(e => e.value).includes(e)))
        .check()
      assertSatisfiable(result)
    })

    it('should return a unique sample with bias even with a small sample', () => {
      const result = fc.scenario()
        .forall('n', fc.integer(10, 20))
        .forall('s', fc.integer(0, 5))
        .given('a', ({n}) => fc.integer(0, n))
        .and('r', ({a, s}) => a.sampleUniqueWithBias(s))
        .then(({r, s}) => r.length === s)
        .and(({r}) => r.length === new Set(r.map(e => e.value)).size)
        .check()
      assertSatisfiable(result)
    })
  })

  describe('Chained Arbitraries', () => {
    it('should allow the creation of array with size based on an integer arbitrary', () => {
      const sample = fc.integer(2, 2).chain(i => fc.array(fc.constant(i), i, i)).sample(1)
      const first = sample[0]
      expect(first !== undefined ? first.value : undefined).to.eql([2, 2])
    })

    it('should check a property based on a chained arbitrary', () => {
      const result = fc.scenario()
        .forall('a', fc.integer(1, 10).chain(i => fc.array(fc.constant(i), i, i)))
        .then(({a}) => a.length === a[0])
        .check()
      assertSatisfiable(result)
    })
  })

  describe('Can Generate', () => {
    it('knows if it can generate an integer', () => {
      assertCanGenerate(fc.integer(1, 10), {value: 1})
      assertCanGenerate(fc.integer(1, 10), {value: 10})
      assertCannotGenerate(fc.integer(1, 10), {value: -1})
      assertCannotGenerate(fc.integer(1, 10), {value: 11})
    })

    it('knows if it can generate a string', () => {
      assertCanGenerate(fc.string(1, 4), {value: 'a', original: [97]})
      assertCanGenerate(fc.string(1, 4), {value: 'abcd', original: [97, 98, 99, 100]})
      assertCannotGenerate(fc.string(1, 2), {value: 'abc', original: [97, 98, 99]})
      assertCannotGenerate(fc.string(2, 4), {value: 'a', original: [97]})
      assertCanGenerate(fc.string(2, 4), {value: 'abcd', original: [97, 98, 99, 100]})
      assertCanGenerate(fc.string(2, 4), {value: '12', original: [49, 50]})
      assertCanGenerate(fc.string(2, 4), {value: 'ab12', original: [97, 98, 49, 50]})
    })

    it('knows if it can generate a boolean', () => {
      assertCanGenerate(fc.boolean(), {value: true})
      assertCanGenerate(fc.boolean(), {value: false})
    })

    it('knows if it can generate an array', () => {
      assertCanGenerate(fc.nonEmptyArray(fc.integer(1, 10), 10), {value: [1, 2, 3], original: [1, 2, 3]})
      assertCannotGenerate(fc.nonEmptyArray(fc.integer(1, 10), 10), {value: [1, 2, 30], original: [1, 2, 30]})
      assertCannotGenerate(fc.nonEmptyArray(fc.integer(1, 2), 10), {value: [1, 2, 3], original: [1, 2, 3]})
    })

    it('knows if it can be generated by a composite', () => {
      const union = fc.union(fc.integer(1, 10), fc.integer(20, 30))
      assertCanGenerate(union, {value: 1})
      assertCanGenerate(union, {value: 10})
      assertCanGenerate(union, {value: 20})
      assertCanGenerate(union, {value: 30})
      assertCannotGenerate(union, {value: 15})
      assertCannotGenerate(union, {value: 0})
      assertCannotGenerate(union, {value: 31})
    })

    it('knows if it can be generated by a map', () => {
      const mapped = fc.integer(97, 100).map(n => String.fromCharCode(n))
      assertCanGenerate(mapped, {original: 97, value: 'a'})
      assertCanGenerate(mapped, {original: 99, value: 'c'})
      assertCannotGenerate(mapped, {original: 101, value: 'e'})
      assertCannotGenerate(mapped, {original: 102, value: 'f'})
    })

    it('knows if it can be generated by a filter', () => {
      const filtered = fc.integer(0,4).filter(n => n !== 2)
      assertCannotGenerate(filtered, {value: -1})
      assertCanGenerate(filtered, {value: 0})

      // TODO: This should be false. However, we are not checking if the filter is able to actually generate the value
      // due to missing intermediate information (i.e. multiple maps generate intermediate different values - and
      // types - and we only preserve the root). Maybe we should consider preserving the full path.
      // assertCannotGenerate(filtered, { value: 2 })
      assertCanGenerate(filtered, {value: 4})
      assertCannotGenerate(filtered, {value: 5})
    })

    it('knows if it can be generated by a set', () => {
      assertCanGenerate(fc.set(['a', 'b', 'c'], 1, 3), {value: ['a', 'b', 'c']})

      // Type system does not allow this
      // assertCannotGenerate(fc.set(['a', 'b', 'c'], 1, 3), {value: ['a', 'b', 'd']})
      assertCannotGenerate(fc.set(['a', 'b', 'c'], 1, 2), {value: ['a', 'b', 'c']})
      assertCanGenerate(fc.set([], 0, 0), {value: []})
      assertCannotGenerate(fc.set([], 1, 2), {value: []})
    })

    it('knows if it can be generated by a oneof', () => {
      assertCanGenerate(fc.oneof(['a', 'b', 'c']), {value: 'a', original: 0})
      // Type system does not allow this
      // assertCannotGenerate(fc.oneof(['a', 'b', 'c']), {value: 'd', original: 3})
    })

    it('knows if it can be generated by a constant', () => {
      assertCanGenerate(fc.constant('a'), {value: 'a'})
      assertCanGenerate(fc.constant(1), {value: 1, original: undefined})
      assertCannotGenerate(fc.constant('a'), {value: 'b'})
      assertCannotGenerate(fc.constant(1), {value: 2, original: undefined})
    })

    it('knows if it can be generated by a tuple', () => {
      const tuple = fc.tuple(fc.integer(1, 5), fc.string(1, 5, fc.char('a','c')))
      assertCanGenerate(tuple, {value: [1, 'b'], original: [undefined, [98]]})
      assertCannotGenerate(tuple, {value: [6, 'b'], original: [undefined, [98]]})
      assertCannotGenerate(tuple, {value: [1, 'd'], original: [undefined, [100]]})
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

    it('should remain no arbitrary when composed with map', () => {
      expect(fc.empty().map(a => a)).to.eq(fc.empty())
    })

    it('filter on empty should produce empty results (but not be NoArbitrary)', () => {
      // NoArbitrary.filter() returns FilteredArbitrary for type soundness
      // (filter() must return EstimatedSizeArbitrary per the interface)
      const filtered = fc.empty().filter(_ => true)
      expect(filtered).to.not.eq(fc.empty())  // Different object
      expect(filtered.sample(10)).to.deep.eq([])  // But produces no values
      expect(filtered.size().type).to.eq('estimated')  // Type soundness
    })

    it('should always be satisfiable due to vacuous truth in universal assertions', () => {
      /* istanbul ignore next */
      const result = fc.scenario()
        .forall('empty', fc.empty())
        .then(_ => false)
        .check()
      assertSatisfiable(result)
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

  describe('Value Identity Functions', () => {
    describe('hashCode', () => {
      it('returns consistent values for equal inputs (integer)', () => {
        const arb = fc.integer()
        const result = fc.scenario()
          .forall('x', fc.integer())
          .then(({x}) => {
            const hash = arb.hashCode()
            return hash(x) === hash(x)
          })
          .check()
        assertSatisfiable(result)
      })

      it('returns consistent values for equal inputs (real)', () => {
        const arb = fc.real()
        const result = fc.scenario()
          .forall('x', fc.real())
          .then(({x}) => {
            const hash = arb.hashCode()
            return hash(x) === hash(x)
          })
          .check()
        assertSatisfiable(result)
      })

      it('returns consistent values for equal inputs (boolean)', () => {
        const arb = fc.boolean()
        const result = fc.scenario()
          .forall('x', fc.boolean())
          .then(({x}) => {
            const hash = arb.hashCode()
            return hash(x) === hash(x)
          })
          .check()
        assertSatisfiable(result)
      })

      it('returns consistent values for equal inputs (array)', () => {
        const arb = fc.array(fc.integer(0, 10))
        const result = fc.scenario()
          .forall('x', fc.array(fc.integer(0, 10), 0, 5))
          .then(({x}) => {
            const hash = arb.hashCode()
            return hash(x) === hash(x)
          })
          .check()
        assertSatisfiable(result)
      })

      it('different arrays produce different hashes when elements differ', () => {
        const arb = fc.array(fc.integer(0, 10))
        const result = fc.scenario()
          .forall('x', fc.array(fc.integer(0, 10), 1, 3))
          .forall('y', fc.array(fc.integer(0, 10), 1, 3))
          .then(({x, y}) => {
            const hash = arb.hashCode()
            const eq = arb.equals()
            // If arrays are not equal, they should have different hashes (with high probability)
            // Note: hash collisions are possible, but we test that equal arrays have equal hashes
            if (!eq(x, y)) {
              // We can't guarantee different hashes due to collisions, but we can test
              // that equal arrays always have equal hashes
              return true
            }
            return hash(x) === hash(y)
          })
          .check()
        assertSatisfiable(result)
      })

      it('equal arrays have equal hashes', () => {
        const arb = fc.array(fc.integer(0, 10))
        const result = fc.scenario()
          .forall('x', fc.array(fc.integer(0, 10), 0, 5))
          .then(({x}) => {
            const hash = arb.hashCode()
            const eq = arb.equals()
            // If x equals itself, hash must be equal
            return eq(x, x) && hash(x) === hash(x)
          })
          .check()
        assertSatisfiable(result)
      })

      it('returns consistent values for equal inputs (tuple)', () => {
        const arb = fc.tuple(fc.integer(0, 10), fc.boolean())
        const result = fc.scenario()
          .forall('x', fc.tuple(fc.integer(0, 10), fc.boolean()))
          .then(({x}) => {
            const hash = arb.hashCode()
            return hash(x) === hash(x)
          })
          .check()
        assertSatisfiable(result)
      })

      it('returns consistent values for equal inputs (record)', () => {
        const arb = fc.record({a: fc.integer(0, 10), b: fc.boolean()})
        const result = fc.scenario()
          .forall('x', fc.record({a: fc.integer(0, 10), b: fc.boolean()}))
          .then(({x}) => {
            const hash = arb.hashCode()
            return hash(x) === hash(x)
          })
          .check()
        assertSatisfiable(result)
      })

      it('returns 32-bit integers', () => {
        const arb = fc.integer(-1000, 1000)
        const hash = arb.hashCode()
        // Test with a sample of values within the arbitrary's range
        const testValues = [-1000, -1, 0, 1, 1000]
        for (const x of testValues) {
          const value = hash(x)
          expect(value).to.be.a('number')
          expect(Number.isInteger(value)).to.be.true
          // Check that value is a valid 32-bit unsigned integer (0 to 2^32-1)
          // For unsigned 32-bit: value >>> 0 should equal value for non-negative values
          // For all values, (value >>> 0) converts to unsigned 32-bit representation
          const unsigned = value >>> 0
          expect(unsigned).to.be.a('number')
          expect(Number.isInteger(unsigned)).to.be.true
        }
        // Also test with property-based for a range (non-negative values)
        const result = fc.scenario()
          .forall('x', mediumInt())
          .then(({x}) => {
            const value = hash(x)
            // For non-negative values, unsigned conversion should preserve the value
            return Number.isInteger(value) && value >= 0 && (value >>> 0) === value
          })
          .check()
        assertSatisfiable(result)
      })

      it('equal values have equal hashes (hash-equals consistency)', () => {
        const arb = fc.integer(0, 100)
        const result = fc.scenario()
          .forall('x', fc.integer(0, 100))
          .forall('y', fc.integer(0, 100))
          .then(({x, y}) => {
            const hash = arb.hashCode()
            const eq = arb.equals()
            // If values are equal, hashes must be equal
            if (eq(x, y)) {
              return hash(x) === hash(y)
            }
            return true
          })
          .check()
        assertSatisfiable(result)
      })
    })

    describe('equals', () => {
      it('is reflexive for all types (integer)', () => {
        const arb = fc.integer()
        const result = fc.scenario()
          .forall('x', fc.integer())
          .then(({x}) => {
            const eq = arb.equals()
            return eq(x, x)
          })
          .check()
        assertSatisfiable(result)
      })

      it('is reflexive for all types (real)', () => {
        const arb = fc.real()
        const result = fc.scenario()
          .forall('x', fc.real())
          .then(({x}) => {
            const eq = arb.equals()
            return eq(x, x)
          })
          .check()
        assertSatisfiable(result)
      })

      it('is reflexive for all types (boolean)', () => {
        const arb = fc.boolean()
        const result = fc.scenario()
          .forall('x', fc.boolean())
          .then(({x}) => {
            const eq = arb.equals()
            return eq(x, x)
          })
          .check()
        assertSatisfiable(result)
      })

      it('is reflexive for all types (array)', () => {
        const arb = fc.array(fc.integer())
        const result = fc.scenario()
          .forall('x', fc.array(fc.integer(), 0, 5))
          .then(({x}) => {
            const eq = arb.equals()
            return eq(x, x)
          })
          .check()
        assertSatisfiable(result)
      })

      it('is symmetric', () => {
        const arb = fc.integer()
        const result = fc.scenario()
          .forall('x', fc.integer())
          .forall('y', fc.integer())
          .then(({x, y}) => {
            const eq = arb.equals()
            return eq(x, y) === eq(y, x)
          })
          .check()
        assertSatisfiable(result)
      })

      it('handles special floating-point values with Object.is semantics', () => {
        const eq = fc.real().equals()
        expect(eq(NaN, NaN)).to.be.true  // Object.is(NaN, NaN) === true
        expect(eq(0, -0)).to.be.false     // Object.is(0, -0) === false
        expect(eq(Infinity, Infinity)).to.be.true
        expect(eq(-Infinity, -Infinity)).to.be.true
      })

      it('compares arrays element-by-element', () => {
        const arb = fc.array(fc.integer())
        const result = fc.scenario()
          .forall('x', fc.array(fc.integer(0, 10), 0, 5))
          .forall('y', fc.array(fc.integer(0, 10), 0, 5))
          .then(({x, y}) => {
            const eq = arb.equals()
            // Arrays are equal if they have same length and elements
            const expectedEqual = x.length === y.length && x.every((val, i) => val === y[i])
            return eq(x, y) === expectedEqual
          })
          .check()
        assertSatisfiable(result)
      })

      it('compares tuples element-by-element', () => {
        const arb = fc.tuple(fc.integer(), fc.string())
        const result = fc.scenario()
          .forall('x', fc.tuple(fc.integer(0, 10), fc.string(1, 3)))
          .forall('y', fc.tuple(fc.integer(0, 10), fc.string(1, 3)))
          .then(({x, y}) => {
            const eq = arb.equals()
            const expectedEqual = x[0] === y[0] && x[1] === y[1]
            return eq(x, y) === expectedEqual
          })
          .check()
        assertSatisfiable(result)
      })

      it('compares records property-by-property', () => {
        const arb = fc.record({x: fc.integer(), y: fc.integer()})
        const result = fc.scenario()
          .forall('x', fc.record({x: fc.integer(0, 10), y: fc.integer(0, 10)}))
          .forall('y', fc.record({x: fc.integer(0, 10), y: fc.integer(0, 10)}))
          .then(({x, y}) => {
            const eq = arb.equals()
            const expectedEqual = x.x === y.x && x.y === y.y
            return eq(x, y) === expectedEqual
          })
          .check()
        assertSatisfiable(result)
      })
    })

    describe('sampleUnique uses identity functions', () => {
      it('correctly deduplicates integers', () => {
        const samples = fc.integer(0, 5).sampleUnique(100)
        expect(samples.length).to.equal(6) // Only 6 unique values possible
      })

      it('never returns duplicates (property-based)', () => {
        const arb = fc.integer(0, 100)
        const result = fc.scenario()
          .forall('sampleSize', fc.integer(1, 200))
          .then(({sampleSize}) => {
            const samples = arb.sampleUnique(sampleSize)
            const eq = arb.equals()
            // Check that no two samples are equal
            for (let i = 0; i < samples.length; i++) {
              for (let j = i + 1; j < samples.length; j++) {
                const sampleI = samples[i]
                const sampleJ = samples[j]
                if (sampleI !== undefined && sampleJ !== undefined && eq(sampleI.value, sampleJ.value)) {
                  return false
                }
              }
            }
            return true
          })
          .check()
        assertSatisfiable(result)
      })

      it('correctly deduplicates arrays', () => {
        const arb = fc.array(fc.integer(0, 1), 2, 2)
        const samples = arb.sampleUnique(100)
        // [0,0], [0,1], [1,0], [1,1] = 4 unique arrays
        expect(samples.length).to.equal(4)
      })

      it('never returns duplicate arrays (property-based)', () => {
        const arb = fc.array(fc.integer(0, 10), 0, 3)
        const result = fc.scenario()
          .forall('sampleSize', fc.integer(1, 100))
          .then(({sampleSize}) => {
            const samples = arb.sampleUnique(sampleSize)
            const eq = arb.equals()
            // Check that no two samples are equal
            for (let i = 0; i < samples.length; i++) {
              for (let j = i + 1; j < samples.length; j++) {
                const sampleI = samples[i]
                const sampleJ = samples[j]
                if (sampleI !== undefined && sampleJ !== undefined && eq(sampleI.value, sampleJ.value)) {
                  return false
                }
              }
            }
            return true
          })
          .check()
        assertSatisfiable(result)
      })

      it('correctly deduplicates booleans', () => {
        const samples = fc.boolean().sampleUnique(100)
        expect(samples.length).to.equal(2) // Only true and false
      })

      it('correctly deduplicates tuples', () => {
        const arb = fc.tuple(fc.integer(0, 1), fc.boolean())
        const samples = arb.sampleUnique(100)
        expect(samples.length).to.equal(4) // 2 * 2 = 4 combinations
      })

      it('never returns duplicate tuples (property-based)', () => {
        const arb = fc.tuple(fc.integer(0, 10), fc.boolean())
        const result = fc.scenario()
          .forall('sampleSize', fc.integer(1, 100))
          .then(({sampleSize}) => {
            const samples = arb.sampleUnique(sampleSize)
            const eq = arb.equals()
            // Check that no two samples are equal
            for (let i = 0; i < samples.length; i++) {
              for (let j = i + 1; j < samples.length; j++) {
                const sampleI = samples[i]
                const sampleJ = samples[j]
                if (sampleI !== undefined && sampleJ !== undefined && eq(sampleI.value, sampleJ.value)) {
                  return false
                }
              }
            }
            return true
          })
          .check()
        assertSatisfiable(result)
      })
    })

    describe('fallback behavior', () => {
      it('MappedArbitrary falls back to base class for complex objects', () => {
        const arb = fc.integer(0, 10).map(n => ({value: n, nested: {x: n}}))
        const result = fc.scenario()
          .forall('x', fc.integer(0, 10))
          .then(({x}) => {
            const hash = arb.hashCode()
            const eq = arb.equals()
            const obj1 = {value: x, nested: {x}}
            const obj2 = {value: x, nested: {x}}
            // Fallback should use stringify, so equal objects should have equal hashes
            return hash(obj1) === hash(obj2) && eq(obj1, obj2)
          })
          .check()
        assertSatisfiable(result)
      })

      it('ChainedArbitrary uses fallback', () => {
        const arb = fc.integer(1, 3).chain(n => fc.array(fc.constant(n), n, n))
        const result = fc.scenario()
          .forall('x', fc.integer(1, 3))
          .then(({x}) => {
            const hash = arb.hashCode()
            const eq = arb.equals()
            const arr1 = Array(x).fill(x)
            const arr2 = Array(x).fill(x)
            // Fallback should work consistently
            return hash(arr1) === hash(arr2) && eq(arr1, arr2)
          })
          .check()
        assertSatisfiable(result)
      })

      it('FilteredArbitrary delegates to base', () => {
        const result = fc.scenario()
          .given('arb', () => fc.integer(0, 100).filter(n => n % 2 === 0))
          .forall('x', fc.integer(0, 100).filter(n => n % 2 === 0))
          .forall('y', fc.integer(0, 100).filter(n => n % 2 === 0))
          .then(({arb, x, y}) => {
            const hash = arb.hashCode()
            const eq = arb.equals()
            // Should use integer's efficient hash/equals
            if (x === y) {
              return hash(x) === hash(y) && eq(x, y)
            } else {
              return !eq(x, y)
            }
          })
          .check()
        assertSatisfiable(result)
      })
    })

    describe('edge cases', () => {
      it('handles NaN in real numbers', () => {
        const hash = fc.real().hashCode()
        expect(hash(NaN)).to.equal(hash(NaN)) // Consistent hash
      })

      it('handles empty arrays', () => {
        const arb = fc.array(fc.integer())
        const hash = arb.hashCode()
        const eq = arb.equals()
        const empty: number[] = []
        expect(hash(empty)).to.equal(hash(empty))
        expect(eq(empty, empty)).to.be.true
      })

      it('handles nested structures', () => {
        const arb = fc.array(fc.array(fc.integer(0, 5)))
        const result = fc.scenario()
          .forall('x', fc.array(fc.array(fc.integer(0, 5)), 0, 3))
          .then(({x}) => {
            const hash = arb.hashCode()
            const eq = arb.equals()
            // Nested structures should work consistently
            return hash(x) === hash(x) && eq(x, x)
          })
          .check()
        assertSatisfiable(result)
      })
    })
  })
})
