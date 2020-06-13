import { Arbitrary } from './arbitraries'

class FluentResult {
    constructor(public satisfiable = false, public example = {}) { }

    addExample(name: string, value: any) {
        this.example[name] = value
        return this
    }
}

export class FluentCheck {
    constructor(protected parent = undefined) { }

    given(name: string, a: any): FluentCheckGivenMutable | FluentCheckGivenConstant {
        return (a instanceof Function) ? new FluentCheckGivenMutable(this, name, a) : new FluentCheckGivenConstant(this, name, a)  
    }

    when(f: (givens) => any): FluentCheckWhen {
        return new FluentCheckWhen(this, f)
    }

    forall<A>(name: string, a: Arbitrary<A>): FluentCheckUniversal<A> {
        return new FluentCheckUniversal(this, name, a)
    }

    exists<A>(name: string, a: Arbitrary<A>): FluentCheckExistential<A>  {
        return new FluentCheckExistential(this, name, a)
    }

    then(f): FluentCheckAssert {
        return new FluentCheckAssert(this, f)
    }

    protected run(parentArbitrary, callback, initialValue = undefined): FluentCheck {
        return callback(parentArbitrary)
    }

    protected pathFromRoot(): FluentCheck[] {
        const path = [] 
        let node = this
        while (node !== undefined) {
            path.unshift(node)
            node = node.parent
        }
        return path
    }

    protected pathToRoot(): FluentCheck[] {
        return this.pathFromRoot().reverse()
    }

    check(child = () => new FluentResult(true)) {
        if (this.parent !== undefined) return this.parent.check(parentArbitrary => this.run(parentArbitrary, child))
        else return this.run({}, child)
    }
}

class FluentCheckWhen extends FluentCheck {
    constructor(public parent: FluentCheck, public f: (givens) => any) {
        super(parent)
    }

    protected run(parentArbitrary, callback) {
        return callback(parentArbitrary)
    }

    and(f: (givens) => any): FluentCheckWhen {
        return new FluentCheckWhen(this, f)
    }
}

class FluentCheckGivenMutable extends FluentCheck {
    constructor(public parent: FluentCheck, public name: string, public factory: () => any) {
        super(parent)
    }

    protected run(parentArbitrary, callback) {
        return callback(parentArbitrary)
    }
}

class FluentCheckGivenConstant extends FluentCheck {
    constructor(public parent: FluentCheck, public name: string, public value: any) {
        super(parent)
    }

    protected run(parentArbitrary, callback) {
        const result = parentArbitrary
        result[this.name] = this.value
        return callback(result)
    }
}

class FluentCheckUniversal<A> extends FluentCheck {
    constructor(protected parent: FluentCheck, public name: string, public a: Arbitrary<A>) {
        super(parent)
    }

    protected run(parentArbitrary, callback, initialValue = undefined): FluentCheck {
        const newArbitrary = { ...parentArbitrary }

        let example = initialValue || new FluentResult(true)
        const collection = new Set(initialValue === undefined ? this.a.sampleWithBias(1000) : this.a.shrink(initialValue.example[this.name]).sampleWithBias(1000))
        for (const tp of collection) {
            newArbitrary[this.name] = tp
            const result = callback(newArbitrary).addExample(this.name, tp)
            if (!result.satisfiable) { example = this.run(parentArbitrary, callback, result); break }
        }

        return example
    }
}

class FluentCheckExistential<A> extends FluentCheck {
    tps = undefined

    constructor(protected parent: FluentCheck, public name: string, public a: Arbitrary<A>) {
        super(parent)
    }

    protected run(parentArbitrary, callback, initialValue = undefined): FluentCheck {
        const newArbitrary = { ...parentArbitrary }
        if (this.tps == undefined) this.tps = new Set(this.a.sampleWithBias(1000))
        let example = initialValue || new FluentResult(false)
        const collection = new Set(initialValue === undefined ? this.tps : this.a.shrink(initialValue.example[this.name]).sampleWithBias(1000))
        for (const tp of collection) {
            newArbitrary[this.name] = tp
            const result = callback(newArbitrary).addExample(this.name, tp)
            if (result.satisfiable) { example = this.run(parentArbitrary, callback, result); break }
        }

        return example
    }
}

class FluentCheckAssert extends FluentCheck {
    givenWhens: FluentCheck[] = undefined

    constructor(protected parent: FluentCheck, public assertion: (args: any) => any) {
        super(parent)
    }

    and(assertion: (args: any) => any): FluentCheckAssert {
        return new FluentCheckAssert(this, assertion)
    }

    private runGivensWhens(parentArbitrary) {
        if (this.givenWhens == undefined) 
            this.givenWhens = this.pathFromRoot().filter(node => 
                (node instanceof FluentCheckGivenMutable) || 
                (node instanceof FluentCheckWhen))

        const givens = { }

        this.givenWhens.forEach(node => {
            if (node instanceof FluentCheckGivenMutable) givens[node.name] = node.factory()
            if (node instanceof FluentCheckWhen) node.f({...parentArbitrary, ...givens})
        })

        return givens
    }

    protected run(parentArbitrary, callback): FluentCheck {
        return (this.assertion({...parentArbitrary, ...this.runGivensWhens(parentArbitrary)})) ? callback(parentArbitrary) : new FluentResult(false)
    }
}