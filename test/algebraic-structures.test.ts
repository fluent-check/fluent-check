import * as fc from '../src/index'
import {it, describe} from 'mocha'
import {testCommutative, testAssociative, testIdentity, smallInt, assertSatisfiableWithExample} from './test-utils.js'

describe('Algebraic structures', () => {
  const semigroup = <T>(name: string, arbitrary: fc.Arbitrary<T>, op: (a: T, b: T) => T) => () => {
    it(`${name} is associative`, () => {
      testAssociative(arbitrary, op).check().assertSatisfiable()
    })
  }

  describe('Semigroups (associative binary operation)', () => {
    [
      semigroup('(ℤ, +)', smallInt(), (a, b) => a + b),
      semigroup('(ℤ, ×)', smallInt(), (a, b) => a * b),
      semigroup('(ℤ, max)', smallInt(), Math.max),
      semigroup('(ℤ, min)', smallInt(), Math.min),
      semigroup('(Boolean, ∧)', fc.boolean(), (a, b) => a && b),
      semigroup('(Boolean, ∨)', fc.boolean(), (a, b) => a || b),
      semigroup('(String, concat)', fc.string(0, 5), (a, b) => a + b),
    ].forEach(run => run())
  })

  const monoid = <T>(name: string, arbitrary: fc.Arbitrary<T>, op: (a: T, b: T) => T, identity: T) => () => {
    describe(name, () => {
      it('is associative', () => {
        testAssociative(arbitrary, op).check().assertSatisfiable()
      })
      it(`has identity element ${JSON.stringify(identity)}`, () => {
        testIdentity(arbitrary, op, identity).check().assertSatisfiable()
      })
    })
  }

  describe('Monoids (semigroup + identity)', () => {
    [
      monoid('(ℤ, +, 0)', smallInt(), (a, b) => a + b, 0),
      monoid('(ℤ, ×, 1)', smallInt(), (a, b) => a * b, 1),
      monoid('(Boolean, ∧, true)', fc.boolean(), (a, b) => a && b, true),
      monoid('(Boolean, ∨, false)', fc.boolean(), (a, b) => a || b, false),
      monoid('(String, concat, "")', fc.string(0, 5), (a, b) => a + b, ''),
    ].forEach(run => run())
  })

  const abelianMonoid = <T>(
    name: string,
    arbitrary: fc.Arbitrary<T>,
    op: (a: T, b: T) => T,
    identity: T
  ) => () => {
    describe(name, () => {
      it('is commutative', () => {
        testCommutative(arbitrary, op).check().assertSatisfiable()
      })
      it('is associative', () => {
        testAssociative(arbitrary, op).check().assertSatisfiable()
      })
      it(`has identity element ${JSON.stringify(identity)}`, () => {
        testIdentity(arbitrary, op, identity).check().assertSatisfiable()
      })
    })
  }

  describe('Commutative monoids (abelian monoids)', () => {
    [
      abelianMonoid('(ℤ, +, 0)', smallInt(), (a, b) => a + b, 0),
      abelianMonoid('(ℤ, ×, 1)', smallInt(), (a, b) => a * b, 1),
      abelianMonoid('(ℤ, max, -∞)', fc.integer(-10, 10), Math.max, -Infinity),
      abelianMonoid('(ℤ, min, +∞)', fc.integer(-10, 10), Math.min, Infinity),
      abelianMonoid('(Boolean, ∧, true)', fc.boolean(), (a, b) => a && b, true),
      abelianMonoid('(Boolean, ∨, false)', fc.boolean(), (a, b) => a || b, false),
    ].forEach(run => run())
  })

  describe('Groups (monoid + inverse)', () => {
    it('(ℤ, +, 0) - every element has an additive inverse', () => {
      fc.scenario()
        .forall('a', fc.integer(-10, 10))
        .exists('b', fc.integer(-10, 10))
        .then(({a, b}) => a + b === 0)
        .check()
        .assertSatisfiable()
    })
  })

  describe('Rings (two operations with distributivity)', () => {
    describe('(ℤ, +, ×) is a commutative ring', () => {
      it('has additive identity (0)', () => {
        testIdentity(smallInt(), (a, b) => a + b, 0).check().assertSatisfiable()
      })

      it('has multiplicative identity (1)', () => {
        testIdentity(smallInt(), (a, b) => a * b, 1).check().assertSatisfiable()
      })

      it('addition is commutative', () => {
        testCommutative(smallInt(), (a, b) => a + b).check().assertSatisfiable()
      })

      it('multiplication is commutative', () => {
        testCommutative(smallInt(), (a, b) => a * b).check().assertSatisfiable()
      })

      it('multiplication distributes over addition (left)', () => {
        fc.scenario()
          .forall('a', fc.integer(-10, 10))
          .forall('b', fc.integer(-10, 10))
          .forall('c', fc.integer(-10, 10))
          .then(({a, b, c}) => a * (b + c) === a * b + a * c)
          .check()
          .assertSatisfiable()
      })

      it('multiplication distributes over addition (right)', () => {
        fc.scenario()
          .forall('a', fc.integer(-10, 10))
          .forall('b', fc.integer(-10, 10))
          .forall('c', fc.integer(-10, 10))
          .then(({a, b, c}) => (a + b) * c === a * c + b * c)
          .check()
          .assertSatisfiable()
      })

      it('has additive absorbing element (0)', () => {
        const result = fc.scenario()
          .exists('a', fc.integer())
          .forall('b', fc.integer(-10, 10))
          .then(({a, b}) => a * b === 0)
          .check()
        assertSatisfiableWithExample(result, {a: 0})
      })
    })
  })

  describe('Semirings (ring without inverse requirement)', () => {
    describe('(Boolean, ∨, ∧, false, true) is a semiring', () => {
      it('(Boolean, ∨, false) is a commutative monoid', () => {
        testCommutative(fc.boolean(), (a, b) => a || b).check().assertSatisfiable()
        testAssociative(fc.boolean(), (a, b) => a || b).check().assertSatisfiable()
        testIdentity(fc.boolean(), (a, b) => a || b, false).check().assertSatisfiable()
      })

      it('(Boolean, ∧, true) is a commutative monoid', () => {
        testCommutative(fc.boolean(), (a, b) => a && b).check().assertSatisfiable()
        testAssociative(fc.boolean(), (a, b) => a && b).check().assertSatisfiable()
        testIdentity(fc.boolean(), (a, b) => a && b, true).check().assertSatisfiable()
      })

      it('∧ distributes over ∨ (left)', () => {
        fc.scenario()
          .forall('a', fc.boolean())
          .forall('b', fc.boolean())
          .forall('c', fc.boolean())
          .then(({a, b, c}) => {
            const left = a && (b || c)
            const right = (a && b) || (a && c)
            return left === right
          })
          .check()
          .assertSatisfiable()
      })

      it('∧ distributes over ∨ (right)', () => {
        fc.scenario()
          .forall('a', fc.boolean())
          .forall('b', fc.boolean())
          .forall('c', fc.boolean())
          .then(({a, b, c}) => {
            const left = (a || b) && c
            const right = (a && c) || (b && c)
            return left === right
          })
          .check()
          .assertSatisfiable()
      })

      it('false is absorbing for ∧', () => {
        fc.scenario()
          .forall('a', fc.boolean())
          .then(({a}) => {
            // eslint-disable-next-line no-constant-binary-expression
            return (a && false) === false && (false && a) === false
          })
          .check()
          .assertSatisfiable()
      })
    })
  })

  describe('Non-examples (structures that fail properties)', () => {
    it('(ℤ, -) is not a semigroup (not associative)', () => {
      const result = testAssociative(smallInt(), (a, b) => a - b).check()
      result.assertNotSatisfiable()
      result.assertExample({a: 0, b: 0, c: -1})
    })

    it('addition does not distribute over multiplication', () => {
      const result = fc.scenario()
        .forall('a', fc.integer(-10, 10))
        .forall('b', fc.integer(-10, 10))
        .forall('c', fc.integer(-10, 10))
        .then(({a, b, c}) => a + (b * c) === (a + b) * (a + c))
        .check()
      result.assertNotSatisfiable()
      result.assertExample({a: -1, b: 0, c: 0})
    })
  })
})
