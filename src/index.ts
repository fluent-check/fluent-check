import * as fc from 'fast-check'

export class CucumberCheck<AS extends {}, F, TP extends {}> {
    constructor(private testFactory: () => F = Object, 
                private arbitraries: AS = ({} as AS), 
                private properties: Array<(sut: F, tc: TP) => void> = []) { }
    
    arbitrary<A, S extends string>(name: S, arbitrary: (arbs: AS) => fc.Arbitrary<A>) {
        Object.defineProperty(this.arbitraries, name, { value: arbitrary(this.arbitraries), enumerable: true })
        return new CucumberCheck<AS & Record<S, fc.Arbitrary<A>>, F, TP & Record<S, A>>(
            this.testFactory, 
            this.arbitraries as AS & Record<S, fc.Arbitrary<A>>, 
            this.properties)
    }

    chain<A, S extends string>(name: S, f: (arbitraryCases: TP) => fc.Arbitrary<A>) {
        return this.arbitrary(name, () => fc.record(this.arbitraries).chain(arbitraries => f(arbitraries as TP)))
    }

    property(p: (testObject: F, testCase: TP) => void) {
        this.properties.push(p)
        return this
    }

    assert(a: (testObject: F, testCase: TP) => void) {
        const suite = fc.record(this.arbitraries)

        fc.assert(fc.property(suite, testPoint => {
            const sut = this.testFactory()
            this.properties.forEach(p => p(sut, testPoint as TP))
            a(sut, testPoint as TP)
        }))
    }
}