import { reservoirSampling, duplicatesProbability } from '../src/sampling'
import { it } from 'mocha'
import { expect } from 'chai'

describe('Sampling tests', () => {

  describe('duplicatesProbability', () => {

    it('should return the correct probability', () => {
      // test cases created with the help of https://bit.ly/2AMWQwc
      expect(duplicatesProbability(23, 365)).to.be.closeTo(0.507297, 1e-6)
      expect(duplicatesProbability(10, 1000)).to.be.closeTo(0.0441394, 1e-6)
      expect(duplicatesProbability(1000, 429496)).to.be.closeTo(0.687732, 1e-6)

      expect(duplicatesProbability(1000, 500)).to.be.eq(1.0)
      expect(duplicatesProbability(135634, 23523)).to.be.eq(1.0)

      expect(duplicatesProbability(1, 3)).to.be.eq(0.0)
      expect(duplicatesProbability(1, Number.MAX_SAFE_INTEGER)).to.be.eq(0.0)
    })
  })

  describe('reservoirSampling', () => {

    it('should return samples without replacement', () => {
      const hist = [...Array(1000)]
        .map(() => reservoirSampling(3, 10, idx => idx))
        .forEach(sample => {
          expect(sample).to.have.length(3)
          expect(sample).to.have.same.members([...new Set(sample).values()])
        })
    })

    it('should support sample sizes larger than the population', () => {
      const sample = reservoirSampling(10, 3, idx => idx)
      expect(sample).to.have.length(3)
    })

    it('should return random samples', () => {
      const hist = [...Array(10000)]
        .flatMap(() => reservoirSampling(3, 10, idx => idx))
        .reduce((hist, k) => { hist[k] = (hist[k] || 0) + 1; return hist }, {})

      // TODO(rui): calculate probability of this test failing and adjust number of samples or
      // delta accordingly
      Object.entries(hist).forEach(([_, cnt]) => expect(cnt).to.be.closeTo(3000, 600))
    })

    it('should work efficiently for very large population sizes', () => {
      const sample = reservoirSampling(1000, Number.MAX_SAFE_INTEGER, idx => idx)
      expect(sample).to.have.length(1000)
      expect(sample).to.have.same.members([...new Set(sample).values()])
    })
  })
})
