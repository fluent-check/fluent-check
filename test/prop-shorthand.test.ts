import * as fc from '../src/index.js'
import {it, describe} from 'mocha'
import * as chai from 'chai'
const {expect} = chai

describe('prop() shorthand', () => {
  describe('single arbitrary', () => {
    it('should check property with single arbitrary', () => {
      fc.prop(fc.integer(), x => x + 0 === x).check().assertSatisfiable()
    })

    it('should find counterexample for failing property', () => {
      fc.prop(fc.integer(-100, 100), x => x > 0).check().assertNotSatisfiable()
    })

    it('should assert without throwing for valid property', () => {
      fc.prop(fc.integer(), x => x + 0 === x).assert()
    })

    it('should throw when asserting failing property', () => {
      expect(() => {
        fc.prop(fc.integer(-100, 100), x => x > 1000).assert()
      }).to.throw(/Property failed with counterexample/)
    })

    it('should include custom message in error', () => {
      expect(() => {
        fc.prop(fc.integer(-100, 100), x => x > 1000).assert('Custom message')
      }).to.throw(/Custom message/)
    })
  })

  describe('two arbitraries', () => {
    it('should check commutativity of addition', () => {
      fc.prop(fc.integer(), fc.integer(), (a, b) => a + b === b + a).check().assertSatisfiable()
    })

    it('should check associativity of addition', () => {
      fc.prop(fc.integer(-1000, 1000), fc.integer(-1000, 1000), 
        (a, b) => (a + b) - b === a
      ).check().assertSatisfiable()
    })

    it('should find counterexample with two arbitraries', () => {
      fc.prop(fc.integer(1, 10), fc.integer(1, 10), 
        (a, b) => a === b
      ).check().assertNotSatisfiable()
    })
  })

  describe('three arbitraries', () => {
    it('should check associativity of addition with three values', () => {
      fc.prop(
        fc.integer(-100, 100),
        fc.integer(-100, 100),
        fc.integer(-100, 100),
        (a, b, c) => (a + b) + c === a + (b + c)
      ).check().assertSatisfiable()
    })
  })

  describe('four arbitraries', () => {
    it('should check property with four values', () => {
      fc.prop(
        fc.integer(1, 10),
        fc.integer(1, 10),
        fc.integer(1, 10),
        fc.integer(1, 10),
        (a, b, c, d) => a + b + c + d >= 4
      ).check().assertSatisfiable()
    })
  })

  describe('five arbitraries', () => {
    it('should check property with five values', () => {
      fc.prop(
        fc.integer(0, 10),
        fc.integer(0, 10),
        fc.integer(0, 10),
        fc.integer(0, 10),
        fc.integer(0, 10),
        (a, b, c, d, e) => a + b + c + d + e >= 0
      ).check().assertSatisfiable()
    })
  })

  describe('with configuration', () => {
    it('should use custom strategy', () => {
      fc.prop(fc.integer(), x => x + 0 === x)
        .config(fc.strategy().defaultStrategy())
        .check()
        .assertSatisfiable()
    })

    it('should chain config with assert', () => {
      fc.prop(fc.integer(), x => x + 0 === x)
        .config(fc.strategy().defaultStrategy())
        .assert()
    })

    it('should use strategy with shrinking', () => {
      // Property fails - there are negative integers
      fc.prop(fc.integer(-100, 100), x => x >= 0)
        .config(fc.strategy().withRandomSampling().withShrinking())
        .check()
        .assertNotSatisfiable()
    })
  })

  describe('with different arbitrary types', () => {
    it('should work with string arbitrary', () => {
      fc.prop(fc.string(0, 10), s => s.length >= 0).check().assertSatisfiable()
    })

    it('should work with boolean arbitrary', () => {
      fc.prop(fc.boolean(), b => b === true || b === false).check().assertSatisfiable()
    })

    it('should work with array arbitrary', () => {
      fc.prop(
        fc.array(fc.integer(0, 10), 0, 5),
        arr => Array.isArray(arr)
      ).check().assertSatisfiable()
    })

    it('should work with mixed arbitrary types', () => {
      fc.prop(
        fc.integer(),
        fc.string(0, 5),
        fc.boolean(),
        (n, s, b) => typeof n === 'number' && typeof s === 'string' && typeof b === 'boolean'
      ).check().assertSatisfiable()
    })
  })

  describe('error messages', () => {
    it('should include counterexample in error message', () => {
      try {
        fc.prop(fc.constant(42), x => x !== 42).assert()
        expect.fail('Should have thrown')
      } catch (e) {
        expect((e as Error).message).to.include('42')
      }
    })

    it('should include seed in error message', () => {
      try {
        fc.prop(fc.constant(1), x => x !== 1).assert()
        expect.fail('Should have thrown')
      } catch (e) {
        expect((e as Error).message).to.include('seed')
      }
    })

    it('should format multiple arguments in error', () => {
      try {
        fc.prop(fc.constant(1), fc.constant(2), (a, b) => a + b !== 3).assert()
        expect.fail('Should have thrown')
      } catch (e) {
        expect((e as Error).message).to.include('(1, 2)')
      }
    })
  })
})
