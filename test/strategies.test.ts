import * as fc from '../src/index.js'
import {it, describe} from 'mocha'
import * as chai from 'chai'
const {expect} = chai

describe('strategies presets', () => {
  describe('strategies.default', () => {
    it('should return a FluentStrategyFactory instance', () => {
      const factory = fc.strategies.default
      expect(factory).to.have.property('build')
      expect(factory).to.have.property('withSampleSize')
    })

    it('should return a new factory each time', () => {
      const factory1 = fc.strategies.default
      const factory2 = fc.strategies.default
      expect(factory1).to.not.equal(factory2)
    })

    it('should work with scenario().config()', () => {
      const result = fc.scenario()
        .config(fc.strategies.default)
        .forall('x', fc.integer())
        .then(({x}) => x + 0 === x)
        .check()

      result.assertSatisfiable()
    })

    it('should work with prop().config()', () => {
      fc.prop(fc.integer(), x => x + 0 === x)
        .config(fc.strategies.default)
        .assert()
    })

    it('should be chainable with additional configuration', () => {
      const result = fc.scenario()
        .config(fc.strategies.default.withSampleSize(50))
        .forall('x', fc.integer())
        .then(({x}) => x + 0 === x)
        .check()

      result.assertSatisfiable()
    })
  })

  describe('strategies.fast', () => {
    it('should return a FluentStrategyFactory instance', () => {
      const factory = fc.strategies.fast
      expect(factory).to.have.property('build')
    })

    it('should return a new factory each time', () => {
      const factory1 = fc.strategies.fast
      const factory2 = fc.strategies.fast
      expect(factory1).to.not.equal(factory2)
    })

    it('should work with scenario().config()', () => {
      const result = fc.scenario()
        .config(fc.strategies.fast)
        .forall('x', fc.integer())
        .then(({x}) => x + 0 === x)
        .check()

      result.assertSatisfiable()
    })

    it('should work with prop().config()', () => {
      fc.prop(fc.integer(), x => x + 0 === x)
        .config(fc.strategies.fast)
        .assert()
    })
  })

  describe('strategies.thorough', () => {
    it('should return a FluentStrategyFactory instance', () => {
      const factory = fc.strategies.thorough
      expect(factory).to.have.property('build')
    })

    it('should return a new factory each time', () => {
      const factory1 = fc.strategies.thorough
      const factory2 = fc.strategies.thorough
      expect(factory1).to.not.equal(factory2)
    })

    it('should work with scenario().config()', () => {
      const result = fc.scenario()
        .config(fc.strategies.thorough)
        .forall('x', fc.integer())
        .then(({x}) => x + 0 === x)
        .check()

      result.assertSatisfiable()
    })

    it('should work with prop().config()', () => {
      fc.prop(fc.integer(), x => x + 0 === x)
        .config(fc.strategies.thorough)
        .assert()
    })

    it('should find counterexamples with shrinking', () => {
      const result = fc.scenario()
        .config(fc.strategies.thorough)
        .forall('x', fc.integer(1, 100))
        .then(({x}) => x <= 50)
        .check()

      result.assertNotSatisfiable()
      // Shrinking should find a minimal counterexample close to 51
      expect(result.example.x).to.be.at.least(51)
    })
  })

  describe('strategies.minimal', () => {
    it('should return a FluentStrategyFactory instance', () => {
      const factory = fc.strategies.minimal
      expect(factory).to.have.property('build')
    })

    it('should return a new factory each time', () => {
      const factory1 = fc.strategies.minimal
      const factory2 = fc.strategies.minimal
      expect(factory1).to.not.equal(factory2)
    })

    it('should work with scenario().config()', () => {
      const result = fc.scenario()
        .config(fc.strategies.minimal)
        .forall('x', fc.integer())
        .then(({x}) => x + 0 === x)
        .check()

      result.assertSatisfiable()
    })

    it('should work with prop().config()', () => {
      fc.prop(fc.integer(), x => x + 0 === x)
        .config(fc.strategies.minimal)
        .assert()
    })

    it('should use only 10 samples', () => {
      const factory = fc.strategies.minimal
      const strategy = factory.build()
      expect(strategy.configuration.sampleSize).to.equal(10)
    })
  })

  describe('preset behavior differences', () => {
    it('fast should use default sample size', () => {
      const strategy = fc.strategies.fast.build()
      expect(strategy.configuration.sampleSize).to.equal(1000)
    })

    it('thorough should include shrinking configuration', () => {
      const strategy = fc.strategies.thorough.build()
      expect(strategy.configuration.shrinkSize).to.equal(500)
    })

    it('minimal should have small sample size', () => {
      const strategy = fc.strategies.minimal.build()
      expect(strategy.configuration.sampleSize).to.equal(10)
    })

    it('default should have shrinking configuration', () => {
      const strategy = fc.strategies.default.build()
      expect(strategy.configuration.shrinkSize).to.equal(500)
    })
  })

  describe('integration tests', () => {
    it('should allow switching presets between tests', () => {
      // First test with minimal
      const result1 = fc.scenario()
        .config(fc.strategies.minimal)
        .forall('x', fc.integer())
        .then(({x}) => x + 0 === x)
        .check()
      result1.assertSatisfiable()

      // Second test with thorough
      const result2 = fc.scenario()
        .config(fc.strategies.thorough)
        .forall('x', fc.integer())
        .then(({x}) => x + 0 === x)
        .check()
      result2.assertSatisfiable()
    })

    it('should work with multiple quantifiers', () => {
      const result = fc.scenario()
        .config(fc.strategies.thorough)
        .forall('a', fc.integer(-100, 100))
        .forall('b', fc.integer(-100, 100))
        .then(({a, b}) => a + b === b + a)
        .check()

      result.assertSatisfiable()
    })

    it('should work with exists quantifier', () => {
      const result = fc.scenario()
        .config(fc.strategies.fast)
        .exists('x', fc.integer(0, 100))
        .forall('y', fc.constant(5))
        .then(({x, y}) => x > y)
        .check()

      result.assertSatisfiable()
    })

    it('should work with given/when/then pattern', () => {
      const result = fc.scenario()
        .config(fc.strategies.default)
        .given('list', () => [1, 2, 3])
        .forall('elem', fc.integer())
        .then(({list, elem}) => {
          list.push(elem)
          return list.length === 4
        })
        .check()

      result.assertSatisfiable()
    })
  })
})
