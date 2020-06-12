export abstract class Arbitrary { 
    pick() { return undefined }

    sample(size: number = 10) {
        const result = []
        for (let i = 0; i < size; i += 1)
            result.push(this.pick())

        return result
    }

    sampleWithBias(size: number = 10) {
        return this.sample(size)
    }

    shrink(initialValue): Arbitrary {
        return new NoArbitrary()
    }
}

export class ArbitraryComposite extends Arbitrary {
    constructor(public arbitraries = []) {
        super()
    }    

    // This should calculate a number of elements to pick from each arbitrary so it doesn't affect bias 
    pick() {
        const picked = Math.floor(Math.random() * this.arbitraries.length)
        return this.arbitraries[picked].pick()
    }

    sampleWithBias(size: number = 10) {
        const picks = new Array(this.arbitraries.length, 0)
        for (let i = 0; i < size; i++)
            picks[Math.floor(Math.random() * picks.length)]++

        const result = []
            for (let i = 0; i < picks.length; i += 1)
                result.push(...this.arbitraries[i].sampleWithBias(picks[i]))
    
        return result
    }

    shrink() {
        if (this.arbitraries.length == 1) return new NoArbitrary()
        if (this.arbitraries.length == 2) return this.arbitraries[0]
        return new ArbitraryComposite(this.arbitraries.slice(0, -1))
    }
}

export class ArbitraryString extends Arbitrary {
    constructor(public min = 2, public max = 10, public chars = 'abcdefghijklmnopqrstuvwxyz') {
        super()
        this.min = min
        this.max = max
        this.chars = chars
    }

    pick(size = Math.floor(Math.random() * (Math.max(0, this.max - this.min) + 1)) + this.min) {
        let string = ''
        for (let i = 0; i < size; i++) string += this.chars.charAt(Math.floor(Math.random() * this.chars.length))
        return string
    }

    sampleWithBias(size = 10) {
        const ret = this.sample(size - 2)
        ret.unshift(this.pick(this.min))
        ret.unshift(this.pick(this.max))
        return ret
    }

    shrink(initialValue) {
        if (this.min > initialValue.length - 1) return new NoArbitrary()
        return new ArbitraryString(this.min, initialValue.length - 1, initialValue)
    }
}

export class ArbitraryBoolean extends Arbitrary {
    constructor() {
        super()
    }

    pick() {
        return Math.random() > 0.5
    }
}

export class ArbitraryInteger extends Arbitrary {
    constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
        super()
        this.min = min
        this.max = max
    }

    pick() {
        return Math.floor(Math.random() * (this.max - this.min + 1)) + this.min
    }

    sampleWithBias(size: number = 10) {
        if (this.min < 0 && this.max > 0) {
            const ret = this.sample(size - 3)
            ret.unshift(0, this.min, this.max)
            return ret
        } else {
            const ret = this.sample(size - 2)
            ret.unshift(this.min, this.max)
            return ret
        }
    }

    shrink(initialValue) {
        if (initialValue > 0) return new ArbitraryComposite([
            new ArbitraryInteger(0, Math.max(0, Math.floor(initialValue / 2))),
            new ArbitraryInteger(0, Math.max(Math.floor(initialValue / 2), initialValue - 1))
        ])            
        else if(initialValue < 0) return new ArbitraryComposite([
            new ArbitraryInteger(0, Math.max(initialValue + 1, Math.floor(initialValue / 2))),
            new ArbitraryInteger(0, Math.max(Math.floor(initialValue / 2), 0))
        ])
        return new NoArbitrary()
    }
}

export class ArbitraryReal extends ArbitraryInteger {
    constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
        super(min, max)
    }

    pick() {
        return Math.random() * (this.max - this.min) + this.min
    }

    shrink(initialValue) {
        if (initialValue > 0) return new ArbitraryComposite([
            new ArbitraryReal(0, Math.max(0, Math.floor(initialValue / 2))),
            new ArbitraryReal(0, Math.max(Math.floor(initialValue / 2), initialValue - 1))
        ])            
        else if(initialValue < 0) return new ArbitraryComposite([
            new ArbitraryReal(0, Math.max(initialValue + 1, Math.floor(initialValue / 2))),
            new ArbitraryReal(0, Math.max(Math.floor(initialValue / 2), 0))
        ])
        return new NoArbitrary()
    }
}

class NoArbitrary extends Arbitrary {
    sampleWithBias(size) { return [] }
    sample(size) { return [] }
}