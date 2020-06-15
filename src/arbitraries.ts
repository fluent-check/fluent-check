export interface FluentPick<V> { 
    original?: any
    value?: V 
}

export abstract class Arbitrary<A> { 
    size(): number { return Number.POSITIVE_INFINITY }
    pick(): FluentPick<A> { return { value: undefined } }

    sample(sampleSize: number = 10): FluentPick<A>[] {
        const result = []
        for (let i = 0; i < sampleSize; i += 1)
            result.push(this.pick())

        return result
    }

    cornerCases(): A[] { return [] }

    sampleWithBias(sampleSize: number = 10): FluentPick<A>[] {
        const cornerCases = this.cornerCases()

        if (sampleSize <= cornerCases.length)
            return this.sample(sampleSize)

        const sample = this.sample(sampleSize - cornerCases.length)
        sample.unshift(...cornerCases.map(c => ({ value: c })))

        return sample
    }

    shrink(initial: FluentPick<A>): Arbitrary<A> | NoArbitrary {
        return new NoArbitrary()
    }

    map<B>(f: (a: A) => B) { return new MappedArbitrary(this, f) }
    filter(f: (a: A) => boolean) { return new FilteredArbitrary(this, f) }
    unique() { return new UniqueArbitrary(this) }
}

export class ArbitraryCollection<A> extends Arbitrary<A[]> {
    constructor(public arbitrary: Arbitrary<A>, public min = 0, public max = 10) {        
        super()     
    }
    
    size() { return this.arbitrary.size() ** (this.max - this.min) }

    pick(): FluentPick<A[]> {
        const size = Math.floor(Math.random() * (this.max - this.min + 1)) + this.min
        return ({ value : this.arbitrary.sampleWithBias(size).map(v => v.value) })
    }

    shrink(initial: FluentPick<A[]>): Arbitrary<A[]> {
//        if (this.min == initial.length)        
//            return new ArbitraryCollection(this.arbitrary.shrink(
//                initial.reduce((x,y) => (x > y) ? x : y)), this.min, initial.length)

        if (this.min == initial.value.length) return new NoArbitrary()
        if (this.min > (this.min + initial.value.length) / 2) return new NoArbitrary()
        return new ArbitraryCollection(this.arbitrary, this.min, (this.min + initial.value.length) / 2)
    }
}

export class ArbitraryComposite<A> extends Arbitrary<A> {
    constructor(public arbitraries: Arbitrary<A>[] = []) {
        super()
    }    

    size() { return this.arbitraries.reduce((acc, e) => acc + e.size(), 0) }

    pick() {
        const picked = Math.floor(Math.random() * this.arbitraries.length)
        return this.arbitraries[picked].pick()
    }

    cornerCases(): A[] {
        const cornerCases = []
        for (const a of this.arbitraries)
            cornerCases.push(...a.cornerCases())
    
        return cornerCases
    }

    shrink(initial: FluentPick<A>) {
        if (this.arbitraries.length == 1) return new NoArbitrary()
        if (this.arbitraries.length == 2) return this.arbitraries[0]
        return new ArbitraryComposite(this.arbitraries.slice(0, -1))
    }
}

export class ArbitraryString extends Arbitrary<string> {
    constructor(public readonly min = 2, public readonly max = 10, public readonly chars = 'abcdefghijklmnopqrstuvwxyz') {
        super()
        this.min = min
        this.max = max
    }

    size() { 
        const chars = this.chars.length
        const max = this.max
        const min = this.min
        return (chars == 1) ? (max - min + 1) : ((chars ** (max + 1)) / (chars - 1)) - chars ** min / (chars - 1)
    } 

    pick(size = Math.floor(Math.random() * (Math.max(0, this.max - this.min) + 1)) + this.min) {
        let string = ''
        for (let i = 0; i < size; i++) string += this.chars[Math.floor(Math.random() * this.chars.length)]
        return { value : string }
    }

    cornerCases() {
        return [this.pick(this.min).value, this.pick(this.max).value]
    }

    shrink(initial: FluentPick<string>){
        if (this.min > initial.value.length - 1) return new NoArbitrary()
        return new ArbitraryString(this.min, initial.value.length - 1, this.chars)
    }
}

export class ArbitraryBoolean extends Arbitrary<Boolean> {
    size() { return 2 } 
    cornerCases() { return [true, false] }
    pick() { return {value: Math.random() > 0.5 } }
}

export class ArbitraryInteger extends Arbitrary<number> {
    constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
        super()
        this.min = min
        this.max = max
    }

    size() { return this.max - this.min + 1 }

    pick() {
        return {value: Math.floor(Math.random() * (this.max - this.min + 1)) + this.min}
    }

    cornerCases() {
        return (this.min < 0 && this.max > 0) ? [0, this.min, this.max] : [this.min, this.max]
    }

    shrink(initial: FluentPick<number>): Arbitrary<number> | NoArbitrary {
        if (initial.value > 0) {            
            const lower = Math.max(0, this.min)
            const upper = Math.max(lower, initial.value - 1)
            const midpoint = Math.floor((upper + lower) / 2)

            if (lower == upper) return new NoArbitrary()

            return new ArbitraryComposite([new ArbitraryInteger(lower, midpoint - 1), new ArbitraryInteger(midpoint, upper)])
        } else if(initial.value < 0) {
            const upper = Math.max(0, this.max)
            const lower = Math.max(upper, initial.value + 1)
            const midpoint = Math.ceil((upper + lower) / 2)

            if (lower == upper) return new NoArbitrary()

            return new ArbitraryComposite([new ArbitraryInteger(lower, midpoint - 1), new ArbitraryInteger(midpoint, upper)])
        }
        return new NoArbitrary()
    }
}

export class ArbitraryReal extends ArbitraryInteger {
    constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
        super(min, max)
    }

    pick() {
        return { value: Math.random() * (this.max - this.min) + this.min }
    }
}

export class WrappedArbitrary<A> extends Arbitrary<A> {
    constructor(public readonly baseArbitrary: NonNullable<Arbitrary<A>>) {
        super()
    }

    pick() { return this.baseArbitrary.pick() }
    size() { return this.baseArbitrary.size() }
    cornerCases() { return this.baseArbitrary.cornerCases() }
}

export class ChainedArbitrary<A, B> extends Arbitrary<B> {
    constructor(public readonly baseArbitrary: NonNullable<Arbitrary<A>>, public readonly f: (a: A) => Arbitrary<B>) {
        super()
    }

    pick() { 
        const tp = this.baseArbitrary.pick()
        return this.f(tp.value).pick()
    }

    size() { return this.baseArbitrary.size() }
}

export class UniqueArbitrary<A> extends WrappedArbitrary<A> {
    constructor(readonly baseArbitrary: NonNullable<Arbitrary<A>>) {
        super(baseArbitrary)
    }

    sample(sampleSize: number = 10): FluentPick<A>[] {
        const result = new Array<FluentPick<A>>()
        const bagSize = Math.min(sampleSize, this.size())

        // This is needed to halt the sampling process in case the size() is ill-defined, 
        // such as what happens in FilteredArbitraries. This algorithm should be improved,
        // as sometimes it is more efficiently to simply enumerate all possible cases
        let tries = 0     
        while ((result.length < bagSize) && (tries < sampleSize * 10)) {
            const r = this.pick()
            if (!result.some(v => v.value === r.value)) result.push(r)
            tries += 1
        }
        return result
    }

    shrink(initial: FluentPick<A>): UniqueArbitrary<A> {
        return new UniqueArbitrary(this.baseArbitrary.shrink(initial))
    }
}

class MappedArbitrary<A, B> extends Arbitrary<B> {
    constructor(public readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => B) { 
        super() 
    }

    pick(): FluentPick<B> { 
        const basePick = this.baseArbitrary.pick()
        const original = ('original' in basePick) ? basePick.original : basePick.value
        return ({ original, value: this.f(basePick.value) }) 
    }

    size() { return this.baseArbitrary.size() }

    cornerCases() { return this.baseArbitrary.cornerCases().map(this.f) }

    shrink(initial: FluentPick<B>): MappedArbitrary<A, B> {
        return new MappedArbitrary(this.baseArbitrary.shrink({ original: initial.original, value: initial.original }), this.f)
    }
}

class FilteredArbitrary<A> extends WrappedArbitrary<A> {
    constructor(readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => boolean) {
        super(baseArbitrary)
    }

    pick(): FluentPick<A> { 
        do {       
            const pick = this.baseArbitrary.pick()
            if (this.f(pick.value)) return pick
        } while (true)
    }

    cornerCases() { return this.baseArbitrary.cornerCases().filter(this.f) }
}

class NoArbitrary extends Arbitrary<undefined> {
    size(): number { return 0 }
    sampleWithBias(sampleSize: number = 0) { return [] }
    sample(sampleSize: number = 0) { return [] }
}