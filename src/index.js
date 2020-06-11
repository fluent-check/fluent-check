import { textChangeRangeIsUnchanged } from 'typescript'

const fc = require('fast-check')

class FluentResult {
    constructor(satisfiable = false, example = {}) {
        this.satisfiable = satisfiable
        this.example = example
    }

    addExample(name, value) {
        Object.defineProperty(this.example, name, { value, enumerable: true })
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
        else return this.run(fc.record({}), child)
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
        const example = tps.map(tp => {
            try {
                const newArbitrary = { ...parentArbitrary }
                Object.defineProperty(newArbitrary, this.name, { value: fc.constant(tp), enumerable: true })
                return callback(newArbitrary).addExample(this.name, tp)
            } catch {
                return new FluentResult(false).addExample(this.name, tp)
            }
        }).find(a => !a.satisfiable)

        return (example !== undefined) ? example : new FluentResult(true)
    }
}

class FluentCheckExistential extends FluentCheck {
    constructor(parent, name, a) {
        super(parent)

        this.name = name
        this.a = a
    }

    run(parentArbitrary, callback) {
        const tps = [... new Set(fc.sample(this.a))]
        const example = tps.map(tp => {
            try {
                const newArbitrary = { ...parentArbitrary }
                Object.defineProperty(newArbitrary, this.name, { value: fc.constant(tp), enumerable: true })
                return callback(newArbitrary).addExample(this.name, tp)
            } catch {
                return new FluentResult(false)
            }
        }).find(a => a.satisfiable)

        return (example !== undefined) ? example : new FluentResult(false)
    }
}

class FluentCheckAssert extends FluentCheck {
    constructor(parent, assertion) {
        super(parent)
        this.assertion = assertion
    }

    run(parentArbitrary, callback) {
        try {
            fc.assert(fc.property(fc.record(parentArbitrary), point => this.assertion(point)))
        } catch {
            return new FluentResult(false)
        }
        return new FluentResult(true)
    }
}