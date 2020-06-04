import * as fc from 'fast-check'

export class CucumberCheck<A extends {}, P extends Array<(sut: F, tc: A) => void>, F> {
    constructor(public testFactory: () => F, private arbitraries: A = ({} as A), private properties: P = ([] as unknown as P)) { }
    
    arbitrary<U, V extends string>(name: V, arbitrary: fc.Arbitrary<U>) {
        Object.defineProperty(this.arbitraries, name, { value: arbitrary, enumerable: true })
        return new CucumberCheck(this.testFactory, this.arbitraries as A & Record<V, U>, this.properties)
    }

    property(property: (testObject: F, testCase: A) => void) {
        this.properties.push(property)
        return this
    }

    assert(assertion: (testObject: F, testCase: A) => void) {
        const suite = fc.record(this.arbitraries)

        fc.assert(fc.property(suite, testPoint => {
            const sut = this.testFactory()
            this.properties.forEach(f => f(sut, testPoint as A))
            assertion(sut, testPoint as A)
        }))
    }
}