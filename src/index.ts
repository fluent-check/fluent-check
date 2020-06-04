import * as fc from 'fast-check'

export class CucumberCheck<T extends {}, P extends Array<(sut: F, tc: T) => void>, F> {
    constructor(public factory: () => F, public arbitraries: T = ({} as unknown as T), public properties: P = ([] as unknown as P)) { }

    arbitrary<U, V extends string>(a: V, b: fc.Arbitrary<U>) {
        Object.defineProperty(this.arbitraries, a, { value: b, enumerable: true })
        return new CucumberCheck(this.factory, this.arbitraries as T & Record<V, U>, this.properties)
    }

    property(f: (sut: F, tc: T) => void) {
        this.properties.push(f)
        return this
    }

    assert(assertion: (sut: F, tc: T) => void) {
        const suite = fc.record(this.arbitraries)

        fc.assert(fc.property(suite, tc => {
            const sut = this.factory()
            this.properties.forEach(f => f(sut, tc as T))
            assertion(sut, tc as T)
        }))
    }
}