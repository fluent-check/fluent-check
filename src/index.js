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

    run(parentArbitrary, callback) {
        const tps = [... new Set(fc.sample(this.a))]
        const newArbitrary = { ...parentArbitrary }
        const example = tps.map(tp => {
            try {
                newArbitrary[this.name] = tp
                return callback(newArbitrary).addExample(this.name, tp)
            } catch {
                return new FluentResult(false).addExample(this.name, tp)
            }
        }).find(a => !a.satisfiable)

        return example || new FluentResult(true)
    }
}

class FluentCheckExistential extends FluentCheck {
    constructor(parent, name, a) {
        super(parent)

        this.name = name
        this.a = a
    }

    run(parentArbitrary, callback) {
        const tps = [... new Set(fc.sample(this.a, 1000))]
        const newArbitrary = { ...parentArbitrary }

        const example = tps.map(tp => {
            try {
                newArbitrary[this.name] = tp
                return callback(newArbitrary).addExample(this.name, tp)
            } catch {
                return new FluentResult(false)
            }
        }).find(a => a.satisfiable)

        return example || new FluentResult(false)
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