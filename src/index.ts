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

    chain(name: string, f: (givens) => any): FluentCheckChain {
        return new FluentCheckChain(this, name, f)
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

    protected run(parentArbitrary, callback, initialValue = undefined): FluentResult {
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

class FluentCheckChain extends FluentCheck {
    constructor(public parent: FluentCheck, public name: string, public f: (givens) => any) {
        super(parent)
    }

    protected run(parentArbitrary, callback) {
        return callback(parentArbitrary)
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

    protected run(parentArbitrary, callback, initialValue = undefined): FluentResult {
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

    protected run(parentArbitrary, callback, initialValue = undefined): FluentResult {
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
    preliminaries: FluentCheck[] = undefined

    constructor(protected parent: FluentCheck, public assertion: (args: any) => any) {
        super(parent)
    }

    and(assertion: (args: any) => any): FluentCheckAssert {
        return new FluentCheckAssert(this, assertion)
    }

    private runPreliminaries(parentArbitrary) {
        if (this.preliminaries == undefined) 
            this.preliminaries = this.pathFromRoot().filter(node => 
                (node instanceof FluentCheckGivenMutable) || 
                (node instanceof FluentCheckWhen) ||
                (node instanceof FluentCheckChain))

        const data = { }

        this.preliminaries.forEach(node => {
            if (node instanceof FluentCheckGivenMutable) data[node.name] = node.factory()
            if (node instanceof FluentCheckWhen) node.f({...parentArbitrary, ...data})
            if (node instanceof FluentCheckChain) data[node.name] = node.f({...parentArbitrary, ...data})
        })

        return data
    }

    protected run(parentArbitrary, callback): FluentResult {
        console.log({...parentArbitrary, ...this.runPreliminaries(parentArbitrary)})
        return (this.assertion({...parentArbitrary, ...this.runPreliminaries(parentArbitrary)})) ? callback(parentArbitrary) : new FluentResult(false)
    }
}