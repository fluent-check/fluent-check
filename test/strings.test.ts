import { FluentCheck } from '../src/index'
import { ArbitraryString, ArbitraryInteger } from '../src/arbitraries'
import { it } from 'mocha'
import { expect } from 'chai'

describe('Strings tests', () => {
    it("finds that the length of the concatenation of string is the sum of the lengths", () => {
        expect(new FluentCheck()
            .forall('a', new ArbitraryString())
            .forall('b', new ArbitraryString())
            .then(({ a, b }) => a.length + b.length === (a + b).length)
            .check()
        ).to.have.property('satisfiable', true)
    })

    it("finds a string with length 5 in all strings", () => {
        expect(new FluentCheck()
            .exists('s', new ArbitraryString())
            .then(({ s }) => s.length === 5)
            .check()
        ).to.have.property('satisfiable', true)
    })

    it("finds any substring inside the string", () => {
        expect(new FluentCheck()
            .forall('s', new ArbitraryString())
            .forall('a', new ArbitraryInteger(0, 10))
            .forall('b', new ArbitraryInteger(0, 10))
            .then(({ s, a, b }) => s.includes(s.substring(a, b)))
            .check()
        ).to.have.property('satisfiable', true)
    })
})