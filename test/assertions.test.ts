import * as fc from '../src/index'
import {it} from 'mocha'
import {expect} from 'chai'
import {assertSatisfiableWithExample} from './test-utils.js'

describe('FluentResult assertion methods', () => {
  describe('assertSatisfiable', () => {
    it('should not throw when result is satisfiable', () => {
      fc.scenario()
        .forall('x', fc.integer(-10, 10))
        .then(({x}) => x + 0 === x)
        .check()
        .assertSatisfiable()
    })

    it('should throw when result is not satisfiable', () => {
      expect(() => {
        fc.scenario()
          .forall('x', fc.integer(1, 10))
          .then(({x}) => x < 0) // Always false for positive integers
          .check()
          .assertSatisfiable()
      }).to.throw(Error, /Expected property to be satisfiable/)
    })

    it('should include counterexample in error message', () => {
      expect(() => {
        fc.scenario()
          .forall('x', fc.integer(1, 10))
          .then(({x}) => x < 0)
          .check()
          .assertSatisfiable()
      }).to.throw(Error, /"x":/)
    })

    it('should include seed in error message', () => {
      expect(() => {
        fc.scenario()
          .forall('x', fc.integer(1, 10))
          .then(({x}) => x < 0)
          .check()
          .assertSatisfiable()
      }).to.throw(Error, /seed:/)
    })

    it('should include custom message when provided', () => {
      expect(() => {
        fc.scenario()
          .forall('x', fc.integer(1, 10))
          .then(({x}) => x < 0)
          .check()
          .assertSatisfiable('Addition identity check')
      }).to.throw(Error, /Addition identity check:/)
    })
  })

  describe('assertNotSatisfiable', () => {
    it('should not throw when result is not satisfiable', () => {
      fc.scenario()
        .forall('x', fc.integer(-10, 10))
        .then(({x}) => x !== x) // Always false
        .check()
        .assertNotSatisfiable()
    })

    it('should throw when result is satisfiable', () => {
      expect(() => {
        fc.scenario()
          .forall('x', fc.integer(-10, 10))
          .then(({x}) => x === x) // Always true
          .check()
          .assertNotSatisfiable()
      }).to.throw(Error, /Expected property to NOT be satisfiable/)
    })

    it('should include example in error message', () => {
      expect(() => {
        fc.scenario()
          .forall('x', fc.integer(0, 10))
          .then(({x}) => x >= 0)
          .check()
          .assertNotSatisfiable()
      }).to.throw(Error, /found example:/)
    })

    it('should include seed in error message', () => {
      expect(() => {
        fc.scenario()
          .forall('x', fc.integer(0, 10))
          .then(({x}) => x >= 0)
          .check()
          .assertNotSatisfiable()
      }).to.throw(Error, /seed:/)
    })

    it('should include custom message when provided', () => {
      expect(() => {
        fc.scenario()
          .forall('x', fc.integer(0, 10))
          .then(({x}) => x >= 0)
          .check()
          .assertNotSatisfiable('Expected no solution')
      }).to.throw(Error, /Expected no solution:/)
    })
  })

  describe('assertExample', () => {
    it('should not throw when example matches expected', () => {
      fc.scenario()
        .exists('a', fc.integer())
        .forall('b', fc.integer(-10, 10))
        .then(({a, b}) => a + b === b)
        .check()
        .assertExample({a: 0})
    })

    it('should throw when example does not match expected', () => {
      expect(() => {
        fc.scenario()
          .exists('a', fc.integer())
          .forall('b', fc.integer(-10, 10))
          .then(({a, b}) => a + b === b)
          .check()
          .assertExample({a: 5})
      }).to.throw(Error, /Example mismatch/)
    })

    it('should indicate which properties differ in error message', () => {
      expect(() => {
        fc.scenario()
          .exists('a', fc.integer())
          .forall('b', fc.integer(-10, 10))
          .then(({a, b}) => a + b === b)
          .check()
          .assertExample({a: 5})
      }).to.throw(Error, /a: expected 5, got 0/)
    })

    it('should support partial matching', () => {
      // Only check 'a', don't care about 'b'
      fc.scenario()
        .exists('a', fc.integer())
        .forall('b', fc.integer(-10, 10))
        .then(({a, b}) => a + b === b)
        .check()
        .assertExample({a: 0}) // Partial match - only checks 'a'
    })

    it('should support matching multiple properties', () => {
      fc.scenario()
        .exists('a', fc.integer(-10, 10))
        .forall('b', fc.integer(-10, 10))
        .then(({a, b}) => a * b === 0)
        .check()
        .assertExample({a: 0})
    })

    it('should include seed in error message', () => {
      expect(() => {
        fc.scenario()
          .exists('a', fc.integer())
          .forall('b', fc.integer(-10, 10))
          .then(({a, b}) => a + b === b)
          .check()
          .assertExample({a: 999})
      }).to.throw(Error, /seed:/)
    })

    it('should include custom message when provided', () => {
      expect(() => {
        fc.scenario()
          .exists('a', fc.integer())
          .forall('b', fc.integer(-10, 10))
          .then(({a, b}) => a + b === b)
          .check()
          .assertExample({a: 999}, 'Neutral element check')
      }).to.throw(Error, /Neutral element check:/)
    })

    it('should match arrays deeply', () => {
      fc.scenario()
        .exists('es', fc.array(fc.integer()))
        .then(({es}) => es.length === 0)
        .check()
        .assertExample({es: []})
    })

    it('should detect array mismatches', () => {
      expect(() => {
        fc.scenario()
          .exists('es', fc.array(fc.integer()))
          .then(({es}) => es.length === 0)
          .check()
          .assertExample({es: [1, 2, 3]})
      }).to.throw(Error, /Example mismatch/)
    })
  })

  describe('fluent API usage', () => {
    it('should support chaining assertSatisfiable with assertExample', () => {
      const result = fc.scenario()
        .exists('a', fc.integer())
        .forall('b', fc.integer(-10, 10))
        .then(({a, b}) => a + b === b)
        .check()

      assertSatisfiableWithExample(result, {a: 0})
    })

    it('should replace verbose Chai pattern', () => {
      // Old pattern (commented for reference):
      // expect(fc.scenario()
      //   .forall('a', fc.integer(-10, 10))
      //   .forall('b', fc.integer(-10, 10))
      //   .then(({a, b}) => a + b === b + a)
      //   .check()
      // ).to.have.property('satisfiable', true)

      // New fluent pattern:
      fc.scenario()
        .forall('a', fc.integer(-10, 10))
        .forall('b', fc.integer(-10, 10))
        .then(({a, b}) => a + b === b + a)
        .check()
        .assertSatisfiable()
    })
  })
})
