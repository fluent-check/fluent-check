import * as fc from 'fast-check'
import { expect, assert } from 'chai'
import { Arbitrary } from 'fast-check'

type Replace<R> = { [K in keyof R]: R[K] extends fc.Arbitrary<infer A> ? A : R[K] };

export class FluentCheck<TP> {
    constructor(private parent: FluentCheck<TP> | undefined = undefined) { }
    
    forall<K extends string, A>(name: K, a: fc.Arbitrary<A>): FluentCheck<TP & Record<K, fc.Arbitrary<A>>> {
        return new FluentCheckUniversal<TP & Record<K, fc.Arbitrary<A>>, A>(this, name, a)
    }

    exists<K extends string, A>(name: K, a: fc.Arbitrary<A>): FluentCheck<TP & Record<K, fc.Arbitrary<A>>> {
        return new FluentCheckExistential<TP & Record<K, fc.Arbitrary<A>>, A>(this, name, a)
    }

    then<TC extends Replace<TP>>(f: (obj: TC) => void) {
        return new FluentCheckAssert(this, f)
    }

    run<TC extends TP>(parentArbitrary: fc.Arbitrary<TC>, callback: (childArbitrary: fc.Arbitrary<unknown>) => void) { 
        callback(parentArbitrary)
    } 

    check(child: (parentArbitrary: fc.Arbitrary<unknown>) => void = () => {}) { 
        if (this.parent !== undefined) this.parent.check((parentArbitrary) => this.run(parentArbitrary, child))
        this.run(fc.record({}) as Arbitrary<TP>, child)
    }
}


class FluentCheckUniversal<TP, A> extends FluentCheck<TP> {
    constructor(parent: FluentCheck<TP>, private name: string, private a: Arbitrary<A>) { 
        super(parent)
    }

    run<TC extends TP>(parentArbitrary: fc.Arbitrary<TC>, callback: (childArbitrary: fc.Arbitrary<unknown>) => void) { 
        const newArbitrary = parentArbitrary.chain(e => fc.tuple(fc.constant(e), this.a))
        callback(newArbitrary)
    }
}


class FluentCheckExistential<TP, A> extends FluentCheck<TP> {
    constructor(parent: FluentCheck<TP>, private name: string, private a: Arbitrary<A>) {
        super(parent)
    }

    run<TC extends TP>(parentArbitrary: fc.Arbitrary<TC>, callback: (childArbitrary: fc.Arbitrary<unknown>) => void) { 
        // const tps = fc.sample(this.a)
        // tps.forEach(tp => {
        //     callback(fc.record(tp, fc.constant(tp)))
        // })
    }
}

class FluentCheckAssert<TP, TC> extends FluentCheck<TP> {
    constructor(parent: FluentCheck<TP>, private f: (obj: TC) => void) {
        super(parent)
    }

    run<TC extends TP>(parentArbitrary: fc.Arbitrary<TC>, callback: (childArbitrary: fc.Arbitrary<unknown>) => void) { }
}


/* const c = new FluentCheck()
            .exists('a', fc.nat())
            .forall('b', fc.nat())
            .then(({ a, b }) => (a * b) === a && (b * a) === a)
            .check()
            // .property(({ a, b }) => { fc.sample(a) }) //?
*/

const c = new FluentCheck().forall('a', fc.integer(1, 10)).then(({ a }) => a > 0).check()
