import { FluentCheck } from '../src/index'
import { ArbitraryInteger } from '../src/arbitraries'
import { it } from 'mocha'
import { expect } from 'chai'

describe('Integer tests', () => {
    it("finds the addition inverse", () => {
        expect(new FluentCheck()
            .forall('a', new ArbitraryInteger(-10, 10))
            .exists('b', new ArbitraryInteger(-10, 10))
            .then(({ a, b }) => a + b == 0)
            .check()
        ).to.have.property('satisfiable', true)
    })

    it("finds that multiplication has a zero element", () => {
        expect(
            new FluentCheck()
                .forall('a', new ArbitraryInteger(-10, 10))
                .exists('b', new ArbitraryInteger(-100, 100))
                .then(({ a, b }) => a * b == 0)
                .check()
        ).to.have.property('satisfiable', true)
    })

    it("finds that multiplication has an identity element in the -10, 10 range", () => {
        expect(new FluentCheck()
            .exists('b', new ArbitraryInteger(-10, 10))
            .forall('a', new ArbitraryInteger())
            .then(({ a, b }) => (a * b) === a && (b * a) === a)
            .check()
        ).to.deep.include({ satisfiable: true, example: { b: 1 } })
    })

    it("finds there is a number in the -10, 10 range with inverse and shrink it to 0", () => {
        expect(new FluentCheck()
            .exists('b', new ArbitraryInteger(-10, 10))
            .forall('a', new ArbitraryInteger())
            .then(({ a, b }) => (a + b) === a && (b + a) === a)
            .check()
        ).to.deep.include({ satisfiable: true, example: { b: 0 } })
    })

    it("finds that addition is commutative", () => {
        expect(new FluentCheck()
            .forall('a', new ArbitraryInteger())
            .forall('b', new ArbitraryInteger())
            .then(({ a, b }) => (a + b) === (b + a))
            .check()
        ).to.have.property('satisfiable', true)
    })

    it("finds that the subctraction is not commutative", () => {
        expect(new FluentCheck()
            .forall('a', new ArbitraryInteger())
            .forall('b', new ArbitraryInteger())
            .then(({ a, b }) => (a - b) === (b - a))
            .check()
        ).to.have.property('satisfiable', false)
    })

    it("finds that the multiplication has zero element in a range", () => {
        expect(new FluentCheck()
            .forall('a', new ArbitraryInteger())
            .exists('b', new ArbitraryInteger(-500, 500))
            .then(({ a, b }) => a * b == 0)
            .check()
        ).to.have.property('satisfiable', true)
    })

    it("finds that there is an integer larger than any number in a range and shrinks it", () => {
        expect(new FluentCheck()
            .exists('a', new ArbitraryInteger())
            .forall('b', new ArbitraryInteger(-100, 100))
            .then(({ a, b }) => a > b)
            .check()
        ).to.deep.include({ satisfiable: true, example: { a: 101 } })
    })

    it("finds a number that is divisible by 13 and shrinks it", () => {
        expect(new FluentCheck()
            .exists('a', new ArbitraryInteger(1))
            .then(({ a }) => a % 7 == 0)
            .check()
        ).to.deep.include({ satisfiable: true, example: { a: 7 } })
    })

    it("finds that summing two positive numbers in a range nevers returns zero", () => {
        expect(new FluentCheck()
            .forall('a', new ArbitraryInteger(5, 10))
            .exists('b', new ArbitraryInteger(1, 2))
            .then(({ a, b }) => a + b == 0)
            .check()
        ).to.have.property('satisfiable', false)
    })

    it("finds that adding 1000 makes any number larger and shrinks the example", () => {
        expect(new FluentCheck()
            .exists('a', new ArbitraryInteger())
            .then(({ a }) => a + 1000 > a)
            .check()
        ).to.deep.include({ satisfiable: true, example: { a: 0 } })
    })
})