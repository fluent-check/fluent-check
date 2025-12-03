/**
 * Tests for Arbitrary Laws - verifying that all arbitrary implementations
 * satisfy universal contracts.
 */

import * as fc from '../src/index.js'
import {
  samplingLaws,
  shrinkingLaws,
  compositionLaws,
  arbitraryLaws
} from '../src/arbitraries/index.js'
import {it, describe} from 'mocha'
import * as chai from 'chai'
const {expect} = chai

// ============================================
// Arbitrary Registry for Meta-Testing
// ============================================

interface ArbitraryEntry<T = unknown> {
  name: string
  arb: () => fc.Arbitrary<T>
  predicate?: (t: unknown) => boolean
}

/**
 * Registry of representative arbitraries for law verification.
 */
const arbitraryRegistry: ArbitraryEntry[] = [
  // Primitive arbitraries
  {name: 'integer()', arb: () => fc.integer()},
  {
    name: 'integer(0, 100)',
    arb: () => fc.integer(0, 100),
    predicate: ((n: number) => n > 50) as (t: unknown) => boolean
  },
  {
    name: 'integer(-10, 10)',
    arb: () => fc.integer(-10, 10),
    predicate: ((n: number) => n !== 0) as (t: unknown) => boolean
  },
  {name: 'real(0, 1)', arb: () => fc.real(0, 1), predicate: ((n: number) => n > 0.5) as (t: unknown) => boolean},
  {name: 'boolean()', arb: () => fc.boolean()},
  {name: 'nat()', arb: () => fc.nat(0, 100)},

  // String arbitraries
  {
    name: 'string(1, 10)',
    arb: () => fc.string(1, 10),
    predicate: ((s: string) => s.length > 1) as (t: unknown) => boolean
  },
  {name: 'char(a, z)', arb: () => fc.char('a', 'z')},
  {name: 'ascii()', arb: () => fc.ascii()},

  // Collection arbitraries
  {
    name: 'array(integer, 1, 5)',
    arb: () => fc.array(fc.integer(0, 10), 1, 5),
    predicate: ((arr: number[]) => arr.length > 1) as (t: unknown) => boolean
  },
  {name: 'set([a,b,c], 1, 3)', arb: () => fc.set(['a', 'b', 'c'] as const, 1, 3)},
  {name: 'tuple(int, bool)', arb: () => fc.tuple(fc.integer(0, 10), fc.boolean())},

  // Combinator arbitraries
  {name: 'oneof([1,2,3])', arb: () => fc.oneof([1, 2, 3] as const)},
  {name: 'union(int, int)', arb: () => fc.union(fc.integer(0, 10), fc.integer(90, 100))},
  {name: 'constant(42)', arb: () => fc.constant(42)},

  // Record arbitrary
  {name: 'record({x: int, y: bool})', arb: () => fc.record({x: fc.integer(0, 10), y: fc.boolean()})},

  // Preset arbitraries
  {name: 'positiveInt()', arb: () => fc.positiveInt()},
  {name: 'byte()', arb: () => fc.byte(), predicate: ((n: number) => n < 128) as (t: unknown) => boolean},
  {name: 'nonEmptyString(5)', arb: () => fc.nonEmptyString(5)},
  {name: 'nonEmptyArray(int)', arb: () => fc.nonEmptyArray(fc.integer(0, 10), 5)},
  {name: 'pair(int)', arb: () => fc.pair(fc.integer(0, 10))},
  {name: 'nullable(int)', arb: () => fc.nullable(fc.integer(0, 10))},
  {name: 'optional(int)', arb: () => fc.optional(fc.integer(0, 10))},

  // Transformed arbitraries
  {name: 'integer.map(x => x * 2)', arb: () => fc.integer(0, 50).map(x => x * 2)},
  {name: 'integer.filter(x => x > 50)', arb: () => fc.integer(0, 100).filter(x => x > 50)},
]

// ============================================
// Tests
// ============================================

describe('Arbitrary Laws', () => {
  describe('Sampling Laws', () => {
    describe('sampleValidity', () => {
      arbitraryRegistry.forEach(({name, arb}) => {
        it(`${name} - all samples pass canGenerate`, () => {
          const result = samplingLaws.sampleValidity(arb())
          expect(result.passed, result.message).to.be.true
        })
      })
    })

    describe('sampleSizeBound', () => {
      arbitraryRegistry.forEach(({name, arb}) => {
        it(`${name} - sample respects size bound`, () => {
          const result = samplingLaws.sampleSizeBound(arb())
          expect(result.passed, result.message).to.be.true
        })
      })
    })

    describe('uniqueSampleUniqueness', () => {
      arbitraryRegistry.forEach(({name, arb}) => {
        it(`${name} - sampleUnique returns distinct values`, () => {
          const result = samplingLaws.uniqueSampleUniqueness(arb())
          expect(result.passed, result.message).to.be.true
        })
      })
    })

    describe('cornerCaseInclusion', () => {
      arbitraryRegistry.forEach(({name, arb}) => {
        it(`${name} - sampleWithBias includes corner cases`, () => {
          const result = samplingLaws.cornerCaseInclusion(arb())
          expect(result.passed, result.message).to.be.true
        })
      })
    })

    describe('all sampling laws', () => {
      arbitraryRegistry.forEach(({name, arb}) => {
        it(`${name} - satisfies all sampling laws`, () => {
          const results = samplingLaws.all(arb())
          const failed = results.filter(r => !r.passed)
          expect(failed, `Failed laws: ${failed.map(f => f.law).join(', ')}`).to.be.empty
        })
      })
    })
  })

  describe('Shrinking Laws', () => {
    // Filter arbitraries that can produce picks for shrinking
    const shrinkableArbitraries = arbitraryRegistry.filter(({arb}) => arb().size().value > 0)

    describe('shrinkProducesValidArbitrary', () => {
      shrinkableArbitraries.forEach(({name, arb}) => {
        it(`${name} - shrink produces valid arbitrary`, () => {
          const arbitrary = arb()
          const pick = arbitrary.sample(1)[0]
          if (pick !== undefined) {
            const result = shrinkingLaws.shrinkProducesValidArbitrary(arbitrary, pick)
            expect(result.passed, result.message).to.be.true
          }
        })
      })
    })

    describe('shrinkTermination', () => {
      // Use bounded arbitraries for termination tests to avoid timeouts
      const boundedArbitraries = [
        {name: 'integer(0, 100)', arb: () => fc.integer(0, 100)},
        {name: 'boolean()', arb: () => fc.boolean()},
        {name: 'string(1, 5)', arb: () => fc.string(1, 5)},
        {name: 'array(int, 1, 3)', arb: () => fc.array(fc.integer(0, 5), 1, 3)},
        {name: 'constant(42)', arb: () => fc.constant(42)},
      ]

      boundedArbitraries.forEach(({name, arb}) => {
        it(`${name} - shrinking terminates`, () => {
          const arbitrary = arb()
          const pick = arbitrary.sample(1)[0]
          if (pick !== undefined) {
            const result = shrinkingLaws.shrinkTermination(arbitrary as fc.Arbitrary<unknown>, pick)
            expect(result.passed, result.message).to.be.true
          }
        })
      })
    })
  })

  describe('Composition Laws', () => {
    describe('filterRespectsPredicate', () => {
      const arbitrariesWithPredicates = arbitraryRegistry.filter(e => e.predicate !== undefined)

      arbitrariesWithPredicates.forEach(({name, arb, predicate}) => {
        it(`${name} - filtered values satisfy predicate`, () => {
          if (predicate === undefined) return
          const result = compositionLaws.filterRespectsPredicate(arb(), predicate)
          expect(result.passed, result.message).to.be.true
        })
      })
    })

    describe('noArbitraryMapIdentity', () => {
      it('map on NoArbitrary returns NoArbitrary', () => {
        const result = compositionLaws.noArbitraryMapIdentity()
        expect(result.passed, result.message).to.be.true
      })
    })

    describe('noArbitraryFilterIdentity', () => {
      it('filter on NoArbitrary returns NoArbitrary', () => {
        const result = compositionLaws.noArbitraryFilterIdentity()
        expect(result.passed, result.message).to.be.true
      })
    })
  })

  describe('Unified API', () => {
    describe('arbitraryLaws.check', () => {
      it('returns results for all applicable laws', () => {
        const results = arbitraryLaws.check(fc.integer(0, 100))
        expect(results.length).to.be.greaterThan(0)
        expect(results.every(r => typeof r.law === 'string')).to.be.true
        expect(results.every(r => typeof r.passed === 'boolean')).to.be.true
      })

      it('includes shrinking laws when pick is available', () => {
        const arb = fc.integer(0, 100)
        const pick = arb.sample(1)[0]
        const results = arbitraryLaws.check(arb, pick !== undefined ? {pick} : {})
        const shrinkLaws = results.filter(r => r.law.startsWith('shrinkingLaws'))
        expect(shrinkLaws.length).to.be.greaterThan(0)
      })

      it('includes composition laws when predicate is provided', () => {
        const results = arbitraryLaws.check(fc.integer(0, 100), {predicate: n => n > 50})
        const compLaws = results.filter(r => r.law.startsWith('compositionLaws'))
        expect(compLaws.length).to.be.greaterThan(0)
      })
    })

    describe('arbitraryLaws.assert', () => {
      it('does not throw for valid arbitrary', () => {
        expect(() => arbitraryLaws.assert(fc.integer(0, 100))).to.not.throw()
      })

      it('does not throw for boolean arbitrary', () => {
        expect(() => arbitraryLaws.assert(fc.boolean())).to.not.throw()
      })

      it('does not throw for string arbitrary', () => {
        expect(() => arbitraryLaws.assert(fc.string(1, 10))).to.not.throw()
      })

      it('does not throw for array arbitrary', () => {
        expect(() => arbitraryLaws.assert(fc.array(fc.integer(0, 10), 1, 5))).to.not.throw()
      })

      it('does not throw for record arbitrary', () => {
        expect(() => arbitraryLaws.assert(fc.record({x: fc.integer(), y: fc.boolean()}))).to.not.throw()
      })
    })

    describe('arbitraryLaws.summarize', () => {
      it('correctly summarizes results', () => {
        const results = arbitraryLaws.check(fc.integer(0, 100))
        const summary = arbitraryLaws.summarize(results)
        expect(summary.total).to.equal(results.length)
        expect(summary.passed + summary.failed).to.equal(summary.total)
      })
    })
  })

  describe('NoArbitrary Laws', () => {
    it('NoArbitrary satisfies sampling laws (vacuously)', () => {
      const results = samplingLaws.all(fc.empty())
      // All laws should pass for NoArbitrary since there's nothing to sample
      results.forEach(r => {
        expect(r.passed, `${r.law}: ${r.message}`).to.be.true
      })
    })

    it('NoArbitrary satisfies composition laws', () => {
      expect(compositionLaws.noArbitraryMapIdentity().passed).to.be.true
      expect(compositionLaws.noArbitraryFilterIdentity().passed).to.be.true
    })
  })

  describe('Edge Cases', () => {
    it('handles constant arbitrary', () => {
      const results = arbitraryLaws.check(fc.constant(42))
      const failed = results.filter(r => !r.passed)
      expect(failed, `Failed: ${failed.map(f => `${f.law}: ${f.message}`).join(', ')}`).to.be.empty
    })

    it('handles single-element set', () => {
      const results = arbitraryLaws.check(fc.set(['a'] as const, 1, 1))
      const failed = results.filter(r => !r.passed)
      expect(failed, `Failed: ${failed.map(f => `${f.law}: ${f.message}`).join(', ')}`).to.be.empty
    })

    it('handles mapped arbitrary', () => {
      const results = arbitraryLaws.check(fc.integer(0, 100).map(x => x * 2))
      const failed = results.filter(r => !r.passed)
      expect(failed, `Failed: ${failed.map(f => `${f.law}: ${f.message}`).join(', ')}`).to.be.empty
    })

    it('handles filtered arbitrary', () => {
      const results = arbitraryLaws.check(fc.integer(0, 100).filter(x => x > 50))
      const failed = results.filter(r => !r.passed)
      expect(failed, `Failed: ${failed.map(f => `${f.law}: ${f.message}`).join(', ')}`).to.be.empty
    })

    it('handles chained arbitrary', () => {
      const chained = fc.integer(1, 5).chain(n => fc.array(fc.constant(n), n, n))
      const results = arbitraryLaws.check(chained)
      const failed = results.filter(r => !r.passed)
      expect(failed, `Failed: ${failed.map(f => `${f.law}: ${f.message}`).join(', ')}`).to.be.empty
    })
  })
})
