import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Strategy tests', () => {
  describe('Constants extraction tests', () => {
    it('should be able to extract constant that is compromising the addition commutative property', () => {
      expect(fc.scenario()
        .config(fc.strategy()
          .withRandomSampling(100)
          .withBias()
          .withConstantExtraction()
        )
        .forall('a', fc.integer())
        .forall('b', fc.integer())
        .then(({a, b}) => a + b === 100 ? a + b === b : a + b === b + a)
        .check()
      ).to.have.property('satisfiable', false)
    })

    it('should be able to extract string constants from assertion', () => {
      expect(fc.scenario()
        .config(fc.strategy()
          .withRandomSampling(100)
          .withConstantExtraction()
        )
        .exists('a', fc.string())
        .forall('b', fc.string())
        .exists('c', fc.string())
        .then(({a, b, c}) => {
          const res = a.concat(b).concat(c)
          return res.includes('before-') && res.includes('-after')
        })
        .check()
      ).to.deep.include({satisfiable: true})
    })

    it('should be able to extract and manipulate string constants from assertion', () => {
      expect(fc.scenario()
        .config(fc.strategy()
          .withRandomSampling()
          .withConstantExtraction()
        )
        .forall('a', fc.string(1, 10))
        .forall('b', fc.string(1, 10))
        .then(({a, b}) => a.concat(b) !== 'Hello')
        .check()
      ).to.deep.include({satisfiable: false})
    })

  })
})
