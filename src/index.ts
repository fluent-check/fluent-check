import * as fc from 'fast-check'

export class CucumberCheck<AS extends {}, S, T extends {}> {
    constructor(private testFactory: () => S = Object, 
                private arbitraries: AS = ({} as AS), 
                private properties: Array<(sut: S, tc: T) => void> = []) { }
    
    arbitrary<A, N extends string>(name: N, arbitrary: fc.Arbitrary<A>) {
        Object.defineProperty(this.arbitraries, name, { value: arbitrary, enumerable: true })
        return new CucumberCheck<AS & Record<N, fc.Arbitrary<A>>, S, T & Record<N, A>>(
            this.testFactory, 
            this.arbitraries as AS & Record<N, fc.Arbitrary<A>>, 
            this.properties)
    }

    chain<A>(name: string, f: (arbitraryCases: T) => fc.Arbitrary<A>) {
        return this.arbitrary(name, fc.record(this.arbitraries).chain(arbitraries => f(arbitraries as T)))
    }

    property(p: (testObject: S, testCase: T) => void) {
        this.properties.push(p)
        return this
    }

    assert(a: (testObject: S, testCase: T) => void) {
        const suite = fc.record(this.arbitraries)

        fc.assert(fc.property(suite, testPoint => {
            const sut = this.testFactory()
            this.properties.forEach(p => p(sut, testPoint as T))
            a(sut, testPoint as T)
        }))
    }
}