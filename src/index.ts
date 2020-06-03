import * as fc from 'fast-check'

export abstract class CucumberCheck {
    #arbitraries: Map<string, fc.Arbitrary<any>> = new Map
    #properties: Array<(sut: this, tc: any) => void> = []

    abstract initialize(): void

    arbitrary<U>(name: string, a: fc.Arbitrary<U>) {
        this.#arbitraries.set(name, a)
    }

    property(f: (out: this, tc: any) => void) {
        this.#properties.push(tc => f(this, tc))
    }

    assert(assertion: (out: this, _: any) => void) {
        const obj = [...this.#arbitraries.entries()].reduce((obj, [key, value]) => { (obj as any)[key] = value; return obj }, {})
        const suite = fc.record(obj)

        fc.assert(fc.property(suite, tc => {
            this.initialize();
            this.#properties.forEach(f => f(this, tc))
            assertion(this, tc)
        })) 
    }
}