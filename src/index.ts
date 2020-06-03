import * as fc from 'fast-check'

export abstract class CucumberCheck {
    arbitraries: Map<string, fc.Arbitrary<any>> = new Map
    properties: Map<string, Array<(tc: any) => void>> = new Map

    abstract initialize(): void

    arbitrary<U>(name: string, a: fc.Arbitrary<U>) {
        this.arbitraries.set(name, a)
    }

    property<U>(name: string, f: (out: this, _: U) => void) {
        if (!this.properties.has(name)) this.properties.set(name, new Array)
        this.properties.get(name)!.push(a => f(this, a))
    }

    assert(assertion: (out: this, _: any) => void) {
        const obj = [...this.arbitraries.entries()].reduce((obj, [key, value]) => { (obj as any)[key] = value; return obj }, {})
        const suite = fc.record(obj)

        fc.assert(fc.property(suite, tc => {
            this.initialize();
            [...this.properties.entries()].forEach(([k, p]) => {
                if (k in tc) p.forEach(f => f((tc as any)[k]))
            })
            assertion(this, tc)
        })) 
    }
}