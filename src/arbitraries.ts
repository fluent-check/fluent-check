export abstract class Arbitrary<A> { 
    size(): number { return Number.POSITIVE_INFINITY }
    pick(): A | undefined { return undefined }

    sample(size: number = 10): A[] {
        const result = []
        for (let i = 0; i < size; i += 1)
            result.push(this.pick())

        return result
    }

    cornerCases(): A[] { return [] }

    sampleWithBias(size: number = 10): A[] {
        const cornerCases = this.cornerCases()

        if (size <= cornerCases.length)
            return this.sample(size)

        const sample = this.sample(size - cornerCases.length)
        sample.unshift(...cornerCases)

        return sample
    }

    shrink(initialValue: A): Arbitrary<A> | NoArbitrary {
        return new NoArbitrary()
    }

    map<B>(f: (a: A) => B) { return new MappedArbitrary(this, f) }
    filter(f: (a: A) => boolean) { return new FilteredArbitrary(this, f) }

}

export class ArbitraryCollection<A> extends Arbitrary<A[]> {
    constructor(public arbitrary : Arbitrary<A>, public min = 0, public max = 10) {        
        super()     
    }
    
    size() { return this.arbitrary.size() ** (this.max - this.min) }

    pick(): A[] {
        const size = Math.floor(Math.random() * (this.max - this.min + 1)) + this.min
        return this.arbitrary.sampleWithBias(size)
    }

    shrink(initialValue: A[]): Arbitrary<A[]> {
//        if (this.min == initialValue.length)        
//            return new ArbitraryCollection(this.arbitrary.shrink(
//                initialValue.reduce((x,y) => (x > y) ? x : y)), this.min, initialValue.length)

        if (this.min == initialValue.length) return new NoArbitrary()
        if (this.min > (this.min + initialValue.length) / 2) return new NoArbitrary()
        return new ArbitraryCollection(this.arbitrary, this.min, (this.min + initialValue.length) / 2)
    }
}

export class ArbitraryComposite<A> extends Arbitrary<A> {
    constructor(public arbitraries: Arbitrary<A>[] = []) {
        super()
    }    

    size() { return this.arbitraries.reduce((acc, e) => acc + e.size(), 0) }

    pick(): A {
        const picked = Math.floor(Math.random() * this.arbitraries.length)
        return this.arbitraries[picked].pick()
    }

    cornerCases(): A[] {
        const cornerCases = []
        for (const a of this.arbitraries)
            cornerCases.push(...a.cornerCases())
    
        return cornerCases
    }

    shrink(initialValue: A): Arbitrary<A> | NoArbitrary {
        if (this.arbitraries.length == 1) return new NoArbitrary()
        if (this.arbitraries.length == 2) return this.arbitraries[0]
        return new ArbitraryComposite(this.arbitraries.slice(0, -1))
    }
}

export class ArbitraryString extends Arbitrary<string> {
    constructor(public min = 2, public max = 10, public chars = 'abcdefghijklmnopqrstuvwxyz') {
        super()
        this.min = min
        this.max = max
        this.chars = chars
    }

    size() { return this.chars.length ** (this.max - this.min) } 

    pick(size = Math.floor(Math.random() * (Math.max(0, this.max - this.min) + 1)) + this.min) {
        let string = ''
        for (let i = 0; i < size; i++) string += this.chars.charAt(Math.floor(Math.random() * this.chars.length))
        return string
    }

    cornerCases() {
        return [this.pick(this.min), this.pick(this.max)]
    }

    shrink(initialValue: string): Arbitrary<string> | NoArbitrary {
        if (this.min > initialValue.length - 1) return new NoArbitrary()
        return new ArbitraryString(this.min, initialValue.length - 1, initialValue)
    }
}

export class ArbitraryBoolean extends Arbitrary<Boolean> {
    size() { return 2 } 
    cornerCases() { return [true, false] }
    pick() { return Math.random() > 0.5 }
}

export class ArbitraryInteger extends Arbitrary<number> {
    constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
        super()
        this.min = min
        this.max = max
    }

    size() { return this.max - this.min + 1 }

    pick() {
        return Math.floor(Math.random() * (this.max - this.min + 1)) + this.min
    }

    cornerCases() {
        return (this.min < 0 && this.max > 0) ? [0, this.min, this.max] : [this.min, this.max]
    }

    shrink(initialValue: number): Arbitrary<number> | NoArbitrary {
        if (initialValue > 0) {            
            const lower = Math.max(0, this.min)
            const upper = Math.max(lower, initialValue - 1)
            const midpoint = Math.floor((upper + lower) / 2)

            if (lower == upper) return new NoArbitrary()

            return new ArbitraryComposite([new ArbitraryInteger(lower, midpoint), new ArbitraryInteger(midpoint, upper)])
        } else if(initialValue < 0) {
            const upper = Math.max(0, this.max)
            const lower = Math.max(upper, initialValue + 1)
            const midpoint = Math.ceil((upper + lower) / 2)

            if (lower == upper) return new NoArbitrary()

            return new ArbitraryComposite([new ArbitraryInteger(lower, midpoint), new ArbitraryInteger(midpoint, upper)])
        }
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
}

class MappedArbitrary<A, B> extends Arbitrary<B> {
    constructor(public readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => B) { 
        super() 
    }

    size() { return this.baseArbitrary.size() }

    pick(): B { return this.f(this.baseArbitrary.pick()) }

    // TODO: Make some magic to allow shrinking of mapped arbitraries
    shrink(initialValue: B): NoArbitrary {
        return new NoArbitrary()
    }
}

class FilteredArbitrary<A> extends Arbitrary<A> {
    constructor(public readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => boolean) {
        super()
    }

    // TODO: Very good question... most probably it needs to be estimated by sampling
    // For now, it return the baseArbitrary size.
    size() { return this.baseArbitrary.size() }

    pick(): A { 
        do {       
            const pick = this.baseArbitrary.pick()
            if (this.f(pick)) return pick
        } while (true)
    }
}

class NoArbitrary extends Arbitrary<undefined> {
    size(): number { return 0 }
    sampleWithBias(size: number = 0) { return [] }
    sample(size: number = 0) { return [] }
}