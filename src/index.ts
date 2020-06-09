import * as fc from 'fast-check'

export class FluentCheck<AS extends {}, ES extends {}, S, TC extends {}> {
    constructor(private sutFactory: () => S = Object, 
                private arbitraries: AS = ({} as AS), 
                private existentials: ES = ({} as ES), 
                private properties: Array<(sut: S, tc: TC) => void> = []) { }
    
    arbitrary<A, N extends string>(name: N, arbitrary: fc.Arbitrary<A>) {
        Object.defineProperty(this.arbitraries, name, { value: arbitrary, enumerable: true })
        return new FluentCheck<AS & Record<N, fc.Arbitrary<A>>, ES, S, TC & Record<N, A>>(
            this.sutFactory, 
            this.arbitraries as AS & Record<N, fc.Arbitrary<A>>, 
            this.existentials,
            this.properties)
    }

    chain<A>(name: string, f: (tc: TC) => fc.Arbitrary<A>) {
        return this.arbitrary(name, fc.record(this.arbitraries).chain(arbitraries => f(arbitraries as TC)))
    }

    property(p: (sut: S, tc: TC) => void) {
        this.properties.push(p)
        return this
    }


    // THIS CODE IS A FUCKING SHIT HOLE AND I NEED TO SLEEP

    // Here's a list of problems:
    // 1. We need to check if existentials actually contain something
    // 2. For that, we can no longer simply rely of { }. We need a Map, or a kind of container. See below
    // 3. The appearence order of exists and forall *matters*; having {} is funny, but it isn't preserving composition order.
    // 4. Assert should actually become the thing that runs the composition of forall and exists
    // 5. Hence, we should decide WTF should this return; it can:
    // 5.1. Fail, with a counter-example for all arbitraries
    // 5.2. Succeed, with a witness for all existentials
    // 6. The interface must become much clear, otherwise we are just poking at the monster...

    forall(a: (sut: S, tc: TC) => void, e: {}) {
        try {
            fc.assert(fc.property(fc.record(this.arbitraries), tc => {
                const sut = this.sutFactory()
                this.properties.forEach(p => p(sut, { ...tc, ...e } as any))    // Going crazy with types, so any for now...
                a(sut, { ...tc, ...e } as any)                                  // Same here...
            }))

            return true
        } catch {
            return false
        }
    }

    assert(a: (sut: S, tc: TC) => void) {           
        if (this.existentials != "{}") {            // This code won't even compile, because there's no way to know if a {} is empty.
            const expandExistentials: any[] = []    // This doesn't compose; the appearence order of exists and forall *matters*.
            fc.assert(fc.property(fc.record(this.existentials), e => { expandExistentials.push(e) }))

            return expandExistentials.find(e => this.forall(a, e))
        } else {
            return this.forall(a, {})
        }
    }

    exists<N extends keyof AS>(name: N) {
        return new FluentCheck<Omit<AS, N>, ES & Record<N, Pick<AS, N>>, S, Exclude<TC, N>>(
            this.sutFactory,
            this.arbitraries as Exclude<AS, fc.Arbitrary<N>>,   // 1. How the fuck do I extract N from the arbitraries? There's no Object.deleteProperty
            this.existentials as ES & Record<N, Pick<AS, N>>,   // 2. And how the fuck do I insert N into the existentials? These two need to be a Map<N, Arbitrary<A>>
            this.properties)
    }
}