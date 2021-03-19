import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Strategy tests', () => {
  describe('Constants extraction tests', () => {
    it('should be able to extract numeric constant from assertion', () => {
      expect(fc.scenario()
        .config(fc.strategy()
          .withRandomSampling()
          .withBasicConstantExtraction()
        )
        .forall('a', fc.integer())
        .then(({a}) => a !== 10)
        .check()
      ).to.deep.include({satisfiable: false})
    })

    it('should be able to extract constants and compute numeric range from assertion', () => {
      expect(fc.scenario()
        .config(fc.strategy()
          .defaultStrategy()
          .withAdvancedConstantExtraction()
        )
        .exists('a', fc.integer(0, 1000000))
        .then(({a}) => a % 11 === 0 && a > 90000 && a < 90010)
        .check()
      ).to.deep.include({satisfiable: true, example: {a: 90002}})
    })

    it('finds if addition is commutative', () => {
      expect(fc.scenario()
        .config(fc.strategy()
          .withRandomSampling()
          .withBias()
          .withSampleSize(100)
          .withAdvancedConstantExtraction()
        )
        .forall('a', fc.integer())
        .forall('b', fc.integer())
        .then(({a, b}) => a + b === 12 ? a + b === b : a + b === b + a)
        .check()
      ).to.have.property('satisfiable', false)
    })

    it('should be able to extract string constants from assertion', () => {
      expect(fc.scenario()
        .config(fc.strategy()
          .withRandomSampling()
          .withSampleSize(100)
          .withBasicConstantExtraction()
        )
        .exists('a', fc.string())
        .forall('b', fc.string())
        .exists('c', fc.string())
        .then(({a, b, c}) => a.concat(b).concat(c).includes('before-' && '-after'))
        .check()
      ).to.deep.include({satisfiable: true})
    })

    it('should be able to extract and manipulate string constants from assertion', () => {
      expect(fc.scenario()
        .config(fc.strategy()
          .withRandomSampling()
          .withAdvancedConstantExtraction()
        )
        .forall('a', fc.string(1, 10))
        .forall('b', fc.string(1, 10))
        .then(({a, b}) => a.concat(b) !== 'Hello')
        .check()
      ).to.deep.include({satisfiable: false})
    })

  })
})
