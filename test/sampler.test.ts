import * as fc from '../src/index.js'
import {it, describe} from 'mocha'
import * as chai from 'chai'
import {
  RandomSampler,
  BiasedSampler,
  CachedSampler,
  DedupingSampler
} from '../src/strategies/Sampler.js'
const {expect} = chai

describe('Sampler', () => {
  describe('RandomSampler', () => {
    it('should sample values from an arbitrary', () => {
      const sampler = new RandomSampler()
      const arbitrary = fc.integer(0, 10)
      const samples = sampler.sample(arbitrary, 5)

      expect(samples).to.be.an('array')
      expect(samples.length).to.be.at.most(5)
      samples.forEach(pick => {
        expect(pick).to.have.property('value')
        expect(pick.value).to.be.a('number')
        expect(pick.value).to.be.at.least(0)
        expect(pick.value).to.be.at.most(10)
      })
    })

    it('should use custom generator when provided', () => {
      let callCount = 0
      const generator = () => {
        callCount++
        return 0.5 // Deterministic value
      }
      const sampler = new RandomSampler({generator})
      const arbitrary = fc.integer(0, 10)

      sampler.sample(arbitrary, 3)
      expect(callCount).to.be.greaterThan(0)
    })

    it('should support sampleWithBias', () => {
      const sampler = new RandomSampler()
      const arbitrary = fc.integer(0, 10)
      const samples = sampler.sampleWithBias(arbitrary, 5)

      expect(samples).to.be.an('array')
      expect(samples.length).to.be.at.most(5)
    })

    it('should support sampleUnique', () => {
      const sampler = new RandomSampler()
      const arbitrary = fc.integer(0, 5) // Small range to ensure uniqueness
      const samples = sampler.sampleUnique(arbitrary, 5)

      expect(samples).to.be.an('array')
      // Check uniqueness
      const values = samples.map(p => p.value)
      const uniqueValues = new Set(values)
      expect(uniqueValues.size).to.equal(values.length)
    })

    it('should return generator function', () => {
      const sampler = new RandomSampler()
      const generator = sampler.getGenerator()

      expect(generator).to.be.a('function')
      const value = generator()
      expect(value).to.be.a('number')
      expect(value).to.be.at.least(0)
      expect(value).to.be.at.most(1)
    })
  })

  describe('BiasedSampler', () => {
    it('should wrap another sampler', () => {
      const baseSampler = new RandomSampler()
      const biasedSampler = new BiasedSampler(baseSampler)
      const arbitrary = fc.integer(0, 10)

      const samples = biasedSampler.sample(arbitrary, 5)
      expect(samples).to.be.an('array')
      expect(samples.length).to.be.at.most(5)
    })

    it('should prioritize corner cases', () => {
      const baseSampler = new RandomSampler()
      const biasedSampler = new BiasedSampler(baseSampler)
      const arbitrary = fc.integer(0, 10)

      const samples = biasedSampler.sampleWithBias(arbitrary, 10)
      expect(samples).to.be.an('array')
      // Corner cases should be included (if arbitrary has them)
      const cornerCases = arbitrary.cornerCases()
      if (cornerCases.length > 0) {
        // At least some corner cases should be in the sample
        const sampleValues = samples.map(s => s.value)
        const cornerValues = cornerCases.map(c => c.value)
        const hasCornerCase = cornerValues.some(cv => sampleValues.includes(cv))
        expect(hasCornerCase).to.be.true
      }
    })

    it('should delegate getGenerator to base sampler', () => {
      const baseSampler = new RandomSampler()
      const biasedSampler = new BiasedSampler(baseSampler)

      const generator = biasedSampler.getGenerator()
      expect(generator).to.be.a('function')
    })
  })

  describe('CachedSampler', () => {
    it('should cache samples from the same arbitrary', () => {
      const baseSampler = new RandomSampler()
      const cachedSampler = new CachedSampler(baseSampler)
      const arbitrary = fc.integer(0, 10)

      const samples1 = cachedSampler.sample(arbitrary, 5)
      const samples2 = cachedSampler.sample(arbitrary, 5)

      // Cached results should be identical
      expect(samples1).to.deep.equal(samples2)
    })

    it('should cache different arbitraries separately', () => {
      const baseSampler = new RandomSampler()
      const cachedSampler = new CachedSampler(baseSampler)
      const arbitrary1 = fc.integer(0, 10)
      const arbitrary2 = fc.integer(20, 30)

      const samples1 = cachedSampler.sample(arbitrary1, 5)
      const samples2 = cachedSampler.sample(arbitrary2, 5)

      // Different arbitraries should have different samples
      expect(samples1).to.not.deep.equal(samples2)
    })

    it('should limit cached results to requested count', () => {
      const baseSampler = new RandomSampler()
      const cachedSampler = new CachedSampler(baseSampler)
      const arbitrary = fc.integer(0, 10)

      cachedSampler.sample(arbitrary, 10) // Cache 10 samples
      const samples = cachedSampler.sample(arbitrary, 5) // Request only 5

      expect(samples.length).to.equal(5)
    })

    it('should delegate getGenerator to base sampler', () => {
      const baseSampler = new RandomSampler()
      const cachedSampler = new CachedSampler(baseSampler)

      const generator = cachedSampler.getGenerator()
      expect(generator).to.be.a('function')
    })
  })

  describe('DedupingSampler', () => {
    it('should ensure unique samples', () => {
      const baseSampler = new RandomSampler()
      const dedupingSampler = new DedupingSampler(baseSampler)
      const arbitrary = fc.integer(0, 5) // Small range

      const samples = dedupingSampler.sample(arbitrary, 10)
      const values = samples.map(s => s.value)
      const uniqueValues = new Set(values)

      expect(uniqueValues.size).to.equal(values.length)
    })

    it('should handle sampleWithBias with uniqueness', () => {
      const baseSampler = new RandomSampler()
      const dedupingSampler = new DedupingSampler(baseSampler)
      const arbitrary = fc.integer(0, 5)

      const samples = dedupingSampler.sampleWithBias(arbitrary, 10)
      const values = samples.map(s => s.value)
      const uniqueValues = new Set(values)

      expect(uniqueValues.size).to.equal(values.length)
    })

    it('should delegate getGenerator to base sampler', () => {
      const baseSampler = new RandomSampler()
      const dedupingSampler = new DedupingSampler(baseSampler)

      const generator = dedupingSampler.getGenerator()
      expect(generator).to.be.a('function')
    })
  })

  describe('Sampler composition', () => {
    it('should compose multiple decorators', () => {
      const baseSampler = new RandomSampler()
      const composed = new CachedSampler(
        new BiasedSampler(
          new DedupingSampler(baseSampler)
        )
      )
      const arbitrary = fc.integer(0, 10)

      const samples1 = composed.sample(arbitrary, 5)
      const samples2 = composed.sample(arbitrary, 5)

      // Should be cached (same results)
      expect(samples1).to.deep.equal(samples2)

      // Should be unique
      const values = samples1.map(s => s.value)
      const uniqueValues = new Set(values)
      expect(uniqueValues.size).to.equal(values.length)
    })

    it('should apply decorators in correct order', () => {
      // Test that inner decorators are applied first
      const baseSampler = new RandomSampler()
      const deduping = new DedupingSampler(baseSampler)
      const biased = new BiasedSampler(deduping)
      const cached = new CachedSampler(biased)

      const arbitrary = fc.integer(0, 10)
      const samples = cached.sample(arbitrary, 5)

      expect(samples).to.be.an('array')
      expect(samples.length).to.be.at.most(5)
    })
  })
})
