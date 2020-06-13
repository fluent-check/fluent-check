import { Arbitrary } from './arbitraries'

interface TestCase { [k: string]: any }

class FluentResult {
    constructor(public readonly satisfiable = false, public example: TestCase = {}) { }

    addExample<A>(name: string, value: A) {
        this.example[name] = value
        return this
    }
}

export class FluentCheck {
    constructor(protected readonly parent: FluentCheck = undefined) { }

    given<A>(name: string, a: () => A): FluentCheckGivenMutable<A>
    given<A>(name: string, a: A): FluentCheckGivenMutable<A> | FluentCheckGivenConstant<A> {
        return (a instanceof Function) ? 
            new FluentCheckGivenMutable(this, name, a as unknown as (() => A)) : 
            new FluentCheckGivenConstant(this, name, a)  
    }

    when(f: (givens: TestCase) => void) {
        return new FluentCheckWhen(this, f)
    }

    chain<A>(name: string, f: (givens: TestCase) => Arbitrary<A>) {
        return new FluentCheckChain(this, name, f)
    }

    forall<A>(name: string, a: Arbitrary<A>) {
        return new FluentCheckUniversal(this, name, a)
    }

    exists<A>(name: string, a: Arbitrary<A>)  {
        return new FluentCheckExistential(this, name, a)
    }

    then(f: (arg: TestCase) => boolean) {
        return new FluentCheckAssert(this, f)
    }

    protected run(parentArbitrary: TestCase, callback: (arg: TestCase) => FluentResult, initialValue = undefined): FluentResult {
        return callback(parentArbitrary)
    }

    protected pathFromRoot(): FluentCheck[] {
        const path = [] 
        let node: FluentCheck = this
        while (node !== undefined) {
            path.unshift(node)
            node = node.parent
        }
        return path
    }

    protected pathToRoot() {
        return this.pathFromRoot().reverse()
    }

    check(child: (parentArbitrary: TestCase) => FluentResult = () => new FluentResult(true)) {
        if (this.parent !== undefined) return this.parent.check((parentArbitrary: TestCase) => this.run(parentArbitrary, child))
        else return this.run({}, child)
    }
}

class FluentCheckWhen extends FluentCheck {
    constructor(protected readonly parent: FluentCheck, public readonly f: (givens: TestCase) => void) {
        super(parent)
    }

    and(f: (givens: TestCase) => void) {
        return new FluentCheckWhen(this, f)
    }
}

class FluentCheckChain<A> extends FluentCheck {
    constructor(protected readonly parent: FluentCheck, public readonly name: string, public readonly f: (givens: TestCase) => Arbitrary<A>) {
        super(parent)
    }
}

class FluentCheckGivenMutable<A> extends FluentCheck {
    constructor(protected readonly parent: FluentCheck, public readonly name: string, public readonly factory: () => A) {
        super(parent)
    }
}

class FluentCheckGivenConstant<A> extends FluentCheck {
    constructor(protected readonly parent: FluentCheck, public readonly name: string, public readonly value: A) {
        super(parent)
    }

    protected run(parentArbitrary: TestCase, callback: (arg: TestCase) => FluentResult) {
        parentArbitrary[this.name] = this.value
        return callback(parentArbitrary)
    }
}

class FluentCheckUniversal<A> extends FluentCheck {
    constructor(protected readonly parent: FluentCheck, public readonly name: string, public readonly a: Arbitrary<A>) {
        super(parent)
    }

    protected run(parentArbitrary: TestCase, callback: (arg: TestCase) => FluentResult, initialValue = undefined): FluentResult {
        const newArbitrary = { ...parentArbitrary }
        const example = initialValue || new FluentResult(true)
        const collection = new Set(initialValue === undefined ? this.a.sampleWithBias(1000) : this.a.shrink(initialValue.example[this.name]).sampleWithBias(1000))
        
        for (const tp of collection) {
            newArbitrary[this.name] = tp
            const result = callback(newArbitrary).addExample(this.name, tp)
            if (!result.satisfiable) return this.run(parentArbitrary, callback, result)
        }

        return example
    }
}

class FluentCheckExistential<A> extends FluentCheck {
    cachedSample: Set<A> = undefined

    constructor(protected readonly parent: FluentCheck, public readonly name: string, public readonly a: Arbitrary<A>) {
        super(parent)
    }

    protected run(parentArbitrary: TestCase, callback: (arg: TestCase) => FluentResult, initialValue = undefined): FluentResult {
        if (this.cachedSample == undefined) this.cachedSample = new Set(this.a.sampleWithBias(1000))

        const newArbitrary = { ...parentArbitrary }
        const example = initialValue || new FluentResult(false)
        const collection = new Set(initialValue === undefined ? this.cachedSample : this.a.shrink(initialValue.example[this.name]).sampleWithBias(1000))

        for (const tp of collection) {
            newArbitrary[this.name] = tp
            const result = callback(newArbitrary).addExample(this.name, tp)
            if (result.satisfiable) return this.run(parentArbitrary, callback, result)
        }

        return example
    }
}

class FluentCheckAssert extends FluentCheck {
    preliminaries: FluentCheck[] = undefined

    constructor(protected readonly parent: FluentCheck, public readonly assertion: (args: TestCase) => boolean) {
        super(parent)
    }

    and(assertion: (args: TestCase) => boolean): FluentCheckAssert {
        return new FluentCheckAssert(this, assertion)
    }

    private runPreliminaries(parentArbitrary: TestCase) {
        if (this.preliminaries == undefined) 
            this.preliminaries = this.pathFromRoot().filter(node => 
                (node instanceof FluentCheckGivenMutable) || 
                (node instanceof FluentCheckWhen) ||
                (node instanceof FluentCheckChain))

        const data = { }

        this.preliminaries.forEach(node => {
            if (node instanceof FluentCheckGivenMutable) data[node.name] = node.factory()
            else if (node instanceof FluentCheckWhen) node.f({...parentArbitrary, ...data})
            else if (node instanceof FluentCheckChain) data[node.name] = node.f({...parentArbitrary, ...data})
        })

        return data
    }

    protected run(parentArbitrary: TestCase, callback: (arg: TestCase) => FluentResult): FluentResult {
        return (this.assertion({...parentArbitrary, ...this.runPreliminaries(parentArbitrary)})) ? callback(parentArbitrary) : new FluentResult(false)
    }
}