const fc = require('fast-check')

class FluentResult {
    constructor(satisfiable = false, example = {}) {
        this.satisfiable = satisfiable
        this.example = example
    }

    addExample(name, value) {
        this.example[name] = value
        return this
    }
}

export class FluentCheck {
    constructor(parent) {
        this.parent = parent
    }

    forall(name, a) {
        return new FluentCheckUniversal(this, name, a)
    }

    exists(name, a) {
        return new FluentCheckExistential(this, name, a)
    }

    then(f) {
        return new FluentCheckAssert(this, f)
    }

    run(parentArbitrary, callback) {
        return callback(parentArbitrary)
    }

    check(child = () => { }) {
        if (this.parent !== undefined) return this.parent.check((parentArbitrary) => this.run(parentArbitrary, child))
        else return this.run({}, child)
    }
}

class FluentCheckUniversal extends FluentCheck {
    constructor(parent, name, a) {
        super(parent)

        this.name = name
        this.a = a
    }

    run(parentArbitrary, callback, initialValue = undefined) {
        const newArbitrary = { ...parentArbitrary }

        let example = initialValue || new FluentResult(true)
        const collection = new Set(initialValue === undefined ? fc.sample(this.a, { numRuns: 100 }) : this.a.shrink(initialValue.example[this.name]))
        for (const tp of collection) {
            newArbitrary[this.name] = tp
            const result = callback(newArbitrary).addExample(this.name, tp)
            if (!result.satisfiable) { example = this.run(parentArbitrary, callback, result); break }
        }

        return example
    }
}

class FluentCheckExistential extends FluentCheck {
    tps = undefined

    constructor(parent, name, a) {
        super(parent)

        this.name = name
        this.a = a
    }

    run(parentArbitrary, callback) {
        const newArbitrary = { ...parentArbitrary }
        let example = new FluentResult(false)
        if (this.tps == undefined) this.tps = new Set(fc.sample(this.a, { numRuns: 100 }))
        for (const tp of this.tps) {
            newArbitrary[this.name] = tp
            const result = callback(newArbitrary).addExample(this.name, tp)
            if (result.satisfiable) { example = result; break }
        }

        return example
    }
}

class FluentCheckAssert extends FluentCheck {
    constructor(parent, assertion) {
        super(parent)
        this.assertion = assertion
    }

    run(parentArbitrary, callback) {
        return this.assertion(parentArbitrary) ? new FluentResult(true) : new FluentResult(false)
    }
}