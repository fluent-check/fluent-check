import * as fc from 'fast-check'

export class CucumberCheck<T> {
    properties: Array<(tc: T) => void> = []

    constructor(public suite: fc.Arbitrary<T>) { }

    initialize(tc: T) {
        this.properties.forEach(f => f(tc))
    }

    register(f: (_: T) => void) {
        this.properties.push(f)
    }

    assert(f: (_: T) => void) {
        fc.assert(fc.property(this.suite, tc => {
            this.initialize(tc)
            f(tc)
        }))
    }
}