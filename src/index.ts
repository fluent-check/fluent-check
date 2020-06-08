import * as fc from 'fast-check'

export class CucumberCheck<AS extends {}, S, TC extends {}> {
    constructor(private sutFactory: () => S = Object, 
                private arbitraries: AS = ({} as AS), 
                private properties: Array<(sut: S, tc: TC) => void> = []) { }
    
    arbitrary<A>(name: string, arbitrary: fc.Arbitrary<A>) {
        Object.defineProperty(this.arbitraries, name, { value: arbitrary, enumerable: true })
        return new CucumberCheck<AS & Record<string, fc.Arbitrary<A>>, S, TC & Record<string, A>>(
            this.sutFactory, 
            this.arbitraries as AS & Record<string, fc.Arbitrary<A>>, 
            this.properties)
    }

    chain<A>(name: string, f: (tc: TC) => fc.Arbitrary<A>) {
        return this.arbitrary(name, fc.record(this.arbitraries).chain(arbitraries => f(arbitraries as TC)))
    }

    property(p: (sut: S, tc: TC) => void) {
        this.properties.push(p)
        return this
    }

    assert(a: (sut: S, tc: TC) => void) {
        const arbs = fc.record(this.arbitraries)

        fc.assert(fc.property(arbs, tc => {
            const sut = this.sutFactory()
            this.properties.forEach(p => p(sut, tc as TC))
            a(sut, tc as TC)
        }))
    }
}