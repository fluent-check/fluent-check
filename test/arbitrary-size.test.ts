import {expect} from 'chai'
import * as fc from '../src/arbitraries/index'

describe('Arbitrary Size Estimation', () => {
  describe('MappedArbitrary', () => {
    it('should maintain exact size for bijective mappings', () => {
      const arb = fc.integer(1, 10).map(x => x * 2)
      expect(arb.size()).to.deep.include({
        value: 10,
        type: 'exact'
      })
    })

    it('should estimate size for non-bijective mappings when exact size is small', () => {
      // Maps 10 values to 2 possible values
      const arb = fc.integer(1, 10).map(x => x > 5 ? 'large' : 'small')
      const size = arb.size()

      expect(size.type).to.equal('estimated')
      expect(size.value).to.be.below(10)
      expect(size.value).to.be.at.least(2)
      expect(size.credibleInterval[0]).to.be.at.least(2)
      expect(size.credibleInterval[1]).to.be.at.most(10)
    })

    it('should handle inverse map if provided for accurate size', () => {
      const arb = fc.integer(1, 10).map(
        x => x > 5 ? 'large' : 'small', 
        { inverseMap: x => x === 'large' ? [6, 7, 8, 9, 10] : [1, 2, 3, 4, 5] }
      )
      
      expect(arb.size()).to.deep.include({
        value: 2,
        type: 'estimated'
      })
    })
  })

  describe('FilteredArbitrary', () => {
    it('should estimate size based on filter acceptance ratio', () => {
      const arb = fc.integer(1, 100).filter(x => x % 2 === 0)
      const size = arb.size()
      
      expect(size.type).to.equal('estimated')
      // We can't be too strict about the exact range because it's statistically estimated
      expect(size.value).to.be.at.least(20)
      expect(size.value).to.be.at.most(80)
      expect(size.credibleInterval[0]).to.be.at.least(10)
      expect(size.credibleInterval[1]).to.be.at.most(90)
    })

    it('should be able to estimate small acceptance ratios', () => {
      const arb = fc.integer(1, 1000).filter(x => x % 100 === 0)
      const size = arb.size()
      
      expect(size.type).to.equal('estimated')
      // We can't be too strict about the exact range because it's statistically estimated
      expect(size.value).to.be.at.most(200)
      expect(size.credibleInterval[0]).to.be.at.least(1)
      expect(size.credibleInterval[1]).to.be.at.most(300)
    })
  })
  
  describe('UniqueArbitrary', () => {
    it('should have the same size as the base arbitrary', () => {
      const arb = fc.integer(1, 10).unique()
      expect(arb.size()).to.deep.include({
        value: 10,
        type: 'exact'
      })
    })
    
    it('should handle uniqueness with mapped arbitraries', () => {
      // This creates values 1-20, maps them to 1-10 (with duplicates), then makes them unique again
      const arb = fc.integer(1, 20).map(x => Math.ceil(x/2)).unique()
      const size = arb.size()
      
      // Since the map is non-bijective, we first map 20 values to 10 distinct values
      // then unique() should keep those 10 distinct values
      expect(size.type).to.equal('estimated')
      expect(size.value).to.be.at.most(10)
      expect(size.credibleInterval[1]).to.be.at.most(10)
    })
    
    it('should allow sampling without replacement', () => {
      const arb = fc.integer(1, 10).unique()
      const samples = arb.sample(10)
      
      // Should get 10 unique values
      expect(samples).to.have.lengthOf(10)
      expect(new Set(samples.map(s => s.value)).size).to.equal(10)
      
      // After taking all values, another sample should be empty
      // (but first we need to create a new instance to reset the tracking)
      const freshArb = fc.integer(1, 10).unique()
      // We use a fixed generator to make the test deterministic
      const fixedRng = (() => {
        let i = 0
        const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
        return () => values[i++ % values.length]
      })()
      
      const firstSample = freshArb.sample(10, fixedRng)
      expect(firstSample).to.have.lengthOf(10)
      
      // Now all values are exhausted, so a second sample should be empty
      const secondSample = freshArb.sample(10, fixedRng)
      expect(secondSample).to.have.lengthOf(0)
    })
  })
}) 