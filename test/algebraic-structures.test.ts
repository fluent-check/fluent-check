import * as fc from '../src/index'
import {it, describe} from 'mocha'
import {testCommutative, testAssociative, testIdentity, smallInt, assertNotSatisfiableWithCounterExample} from './test-utils.js'

describe('Algebraic structures', () => {
  const semigroup = <T>(name: string, arbitrary: fc.Arbitrary<T>, op: (a: T, b: T) => T) => () => {
    it(`${name} is associative`, () => testAssociative(arbitrary, op).check().assertSatisfiable())
  }

  describe('Semigroups (associative binary operation)', () => {
    [
      semigroup('(ℤ, +)', smallInt(), (a, b) => a + b),
      semigroup('(ℤ, ×)', smallInt(), (a, b) => a * b),
      semigroup('(ℤ, max)', smallInt(), Math.max),
      semigroup('(ℤ, min)', smallInt(), Math.min),
      semigroup('(Boolean, ∧)', fc.boolean(), (a, b) => a && b),
      /* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */
      semigroup('(Boolean, ∨)', fc.boolean(), (a, b) => a || b),
      semigroup('(String, concat)', fc.string(0, 5), (a, b) => a + b),
    ].forEach(run => run())
  })

  const monoid = <T>(name: string, arbitrary: fc.Arbitrary<T>, op: (a: T, b: T) => T, identity: T) => () => {
    describe(name, () => {
      it('is associative', () => testAssociative(arbitrary, op).check().assertSatisfiable())
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
        it('is commutative', () => testCommutative(arbitrary, op).check().assertSatisfiable())
        it('is associative', () => testAssociative(arbitrary, op).check().assertSatisfiable())
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

  const group = <T>(name: string, arbitrary: fc.Arbitrary<T>, op: (a: T, b: T) => T, identity: T) => () => {
    it(`${name} - every element has an inverse`, () => {
      fc.scenario()
        .forall('a', arbitrary)
        .exists('b', arbitrary)
        .then(({a, b}) => op(a, b) === identity)
        .check()
        .assertSatisfiable()
    })
  }

  describe('Groups (monoid + inverse)', () => {
    [
      group('(ℤ, +, 0)', smallInt(), (a, b) => a + b, 0),
    ].forEach(run => run())
  })

  const commutativeRing = <T>(
    name: string,
    arbitrary: fc.Arbitrary<T>,
    add: (a: T, b: T) => T,
    mul: (a: T, b: T) => T,
    zero: T,
    one: T
  ) => () => {
      describe(name, () => {
        it(`has additive identity (${JSON.stringify(zero)})`, () => {
          testIdentity(arbitrary, add, zero).check().assertSatisfiable()
        })

        it(`has multiplicative identity (${JSON.stringify(one)})`, () => {
          testIdentity(arbitrary, mul, one).check().assertSatisfiable()
        })

        it('addition is commutative', () => {
          testCommutative(arbitrary, add).check().assertSatisfiable()
        })

        it('multiplication is commutative', () => {
          testCommutative(arbitrary, mul).check().assertSatisfiable()
        })

        it('multiplication distributes over addition (left)', () => {
          fc.scenario()
            .forall('a', arbitrary)
            .forall('b', arbitrary)
            .forall('c', arbitrary)
            .then(({a, b, c}) => mul(a, add(b, c)) === add(mul(a, b), mul(a, c)))
            .check()
            .assertSatisfiable()
        })

        it('multiplication distributes over addition (right)', () => {
          fc.scenario()
            .forall('a', arbitrary)
            .forall('b', arbitrary)
            .forall('c', arbitrary)
            .then(({a, b, c}) => mul(add(a, b), c) === add(mul(a, c), mul(b, c)))
            .check()
            .assertSatisfiable()
        })

        it(`has additive absorbing element (${JSON.stringify(zero)})`, () => {
          fc.scenario()
            .exists('a', arbitrary)
            .forall('b', arbitrary)
            .then(({a, b}) => mul(a, b) === zero)
            .check()
            .assertExample({a: zero})
        })
      })
    }

  describe('Rings (two operations with distributivity)', () => {
    [
      commutativeRing('(ℤ, +, ×) is a commutative ring', smallInt(), (a, b) => a + b, (a, b) => a * b, 0, 1),
      commutativeRing('(Boolean, ⊕, ∧) is a commutative ring', fc.boolean(), (a, b) => a !== b, (a, b) => a && b, false, true),
    ].forEach(run => run())
  })

  const semiring = <T>(
    name: string,
    arbitrary: fc.Arbitrary<T>,
    add: (a: T, b: T) => T,
    mul: (a: T, b: T) => T,
    zero: T,
    one: T
  ) => () => {
      describe(name, () => {
        it(`additive operation with ${JSON.stringify(zero)} is a commutative monoid`, () => {
          testCommutative(arbitrary, add).check().assertSatisfiable()
          testAssociative(arbitrary, add).check().assertSatisfiable()
          testIdentity(arbitrary, add, zero).check().assertSatisfiable()
        })

        it(`multiplicative operation with ${JSON.stringify(one)} is a commutative monoid`, () => {
          testCommutative(arbitrary, mul).check().assertSatisfiable()
          testAssociative(arbitrary, mul).check().assertSatisfiable()
          testIdentity(arbitrary, mul, one).check().assertSatisfiable()
        })

        it('multiplication distributes over addition (left)', () => {
          fc.scenario()
            .forall('a', arbitrary)
            .forall('b', arbitrary)
            .forall('c', arbitrary)
            .then(({a, b, c}) => mul(a, add(b, c)) === add(mul(a, b), mul(a, c)))
            .check()
            .assertSatisfiable()
        })

        it('multiplication distributes over addition (right)', () => {
          fc.scenario()
            .forall('a', arbitrary)
            .forall('b', arbitrary)
            .forall('c', arbitrary)
            .then(({a, b, c}) => mul(add(a, b), c) === add(mul(a, c), mul(b, c)))
            .check()
            .assertSatisfiable()
        })

        it(`${JSON.stringify(zero)} is absorbing for multiplication`, () => {
          fc.scenario()
            .forall('a', arbitrary)
            .then(({a}) => mul(a, zero) === zero && mul(zero, a) === zero)
            .check()
            .assertSatisfiable()
        })
      })
    }

  describe('Semirings (ring without inverse requirement)', () => {
    [
      semiring('(ℤ, +, ×, 0, 1) is a semiring', smallInt(), (a, b) => a + b, (a, b) => a * b, 0, 1),
      semiring('(Boolean, ∨, ∧, false, true) is a semiring', fc.boolean(), (a, b) => a || b, (a, b) => a && b, false, true),
    ].forEach(run => run())
  })

  describe('Non-examples (structures that fail properties)', () => {
    it('(ℤ, -) is not a semigroup (not associative)', () => {
      const result = testAssociative(smallInt(), (a, b) => a - b).check()
      assertNotSatisfiableWithCounterExample(result, {a: 0, b: 0, c: -1})
    })

    it('addition does not distribute over multiplication', () => {
      const result = fc.scenario()
        .forall('a', fc.integer(-10, 10))
        .forall('b', fc.integer(-10, 10))
        .forall('c', fc.integer(-10, 10))
        .then(({a, b, c}) => a + (b * c) === (a + b) * (a + c))
        .check()
      assertNotSatisfiableWithCounterExample(result, {a: -1, b: 0, c: 0})
    })
  })
})
