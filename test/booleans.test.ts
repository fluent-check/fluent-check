import { FluentCheck } from '../src/index'
import { ArbitraryBoolean } from '../src/arbitraries'
import { it } from 'mocha'
import { expect } from 'chai'

describe('Boolean tests', () => {
    it("finds two true booleans", () => {
        expect(new FluentCheck()
            .exists('a', new ArbitraryBoolean())
            .exists('b', new ArbitraryBoolean())
            .then(({ a, b }) => (a && b))
            .check()
        ).to.deep.include({ satisfiable: true, example: { a: true, b: true } })
    })

    it("finds that some booleans are false", () => {
        expect(new FluentCheck()
            .exists('b', new ArbitraryBoolean())
            .forall('a', new ArbitraryBoolean())
            .then(({ a, b }) => (a && b))
            .check()
        ).to.have.property('satisfiable', false)
    })

    it("finds that self-XOR returns true", () => {
        expect(new FluentCheck()
            .forall('a', new ArbitraryBoolean())
            .then(({ a }) => !(a ^ a))
            .check()
        ).to.have.property('satisfiable', true)
    })

    it("finds implication using ORs", () => {
        expect(new FluentCheck()
            .forall('a', new ArbitraryBoolean())
            .then(({ a }) => a || !a)
            .check()
        ).to.have.property('satisfiable', true)
    })
})