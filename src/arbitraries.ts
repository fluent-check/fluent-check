import { BetaDistribution } from './statistics'

export type FluentPick<V> = {
    original?: any
    value?: V
}

export type ArbitrarySize = {
    value: number
    type: 'exact' | 'estimated'
    credibleInterval?: [number, number]
}

const NilArbitrarySize: ArbitrarySize = { value: 0, type: 'exact' }
const significance = 0.90
const lowerCredibleInterval = (1 - significance) / 2
const upperCredibleInterval = 1 - lowerCredibleInterval

// -----------------------------
// ------ Base Arbitraries -----
// -----------------------------

export abstract class Arbitrary<A> {
    abstract size(): ArbitrarySize

    mapArbitrarySize(f: (v: number) => ArbitrarySize): ArbitrarySize {
      const baseSize = this.size()
      const result = f(baseSize.value)
      return { value : result.value,
        type : baseSize.type === 'exact' && result.type === 'exact' ? 'exact' : 'estimated',
        credibleInterval : result.credibleInterval }
    }

    pick(): FluentPick<A> { return { value: undefined } }

    sample(sampleSize = 10): FluentPick<A>[] {
      const result = []
      for (let i = 0; i < sampleSize; i += 1) {
        if (this.size().value >= 1) result.push(this.pick())
      }

      return result
    }

    cornerCases(): FluentPick<A>[] { return [] }

    sampleWithBias(sampleSize = 10): FluentPick<A>[] {
      const cornerCases = this.cornerCases()

      if (sampleSize <= cornerCases.length)
        return this.sample(sampleSize)

      const sample = this.sample(sampleSize - cornerCases.length)
      sample.unshift(...cornerCases)

      return sample
    }

    shrink(_initial: FluentPick<A>): Arbitrary<A> | NoArbitrary {
      return new NoArbitrary()
    }

    map<B>(f: (a: A) => B) { return new MappedArbitrary(this, f) }
    filter(f: (a: A) => boolean) { return new FilteredArbitrary<A>(this, f) }
    unique() { return new UniqueArbitrary(this) }
}

// -----------------------------
// ---- Special Arbitraries ----
// -----------------------------

class NoArbitrary extends Arbitrary<undefined> {
  size(): ArbitrarySize { return { value: 0, type: 'exact' } }
  sampleWithBias(_ = 0) { return [] }
  sample(_ = 0) { return [] }
}

class ArbitraryCollection<A> extends Arbitrary<A[]> {
  constructor(public arbitrary: Arbitrary<A>, public min = 0, public max = 10) {
    super()
  }

  size() {
    return this.arbitrary.mapArbitrarySize(v => ({ value: v ** (this.max - this.min), type: 'exact' }))
  }

  pick() {
    const size = Math.floor(Math.random() * (this.max - this.min + 1)) + this.min
    return ({ value : this.arbitrary.sampleWithBias(size).map(v => v.value) })
  }

  shrink(initial: FluentPick<A[]>) {
    //        if (this.min === initial.length)
    //            return new ArbitraryCollection(this.arbitrary.shrink(
    //                initial.reduce((x,y) => (x > y) ? x : y)), this.min, initial.length)

    if (this.min === initial.value.length) return new NoArbitrary()
    if (this.min > (this.min + initial.value.length) / 2) return new NoArbitrary()
    return new ArbitraryCollection(this.arbitrary, this.min, (this.min + initial.value.length) / 2)
  }
}

class ArbitraryComposite<A> extends Arbitrary<A> {
  constructor(public arbitraries: Arbitrary<A>[] = []) {
    super()
  }

  size() {
    return this.arbitraries.reduce((acc, e) =>
      e.mapArbitrarySize(v => ({ value: acc.value + v, type: acc.type })),
    NilArbitrarySize)
  }

  pick() {
    const picked = Math.floor(Math.random() * this.arbitraries.length)
    return this.arbitraries[picked].pick()
  }

  cornerCases() {
    const cornerCases = []
    for (const a of this.arbitraries)
      cornerCases.push(...a.cornerCases())

    return cornerCases
  }

  shrink(_initial: FluentPick<A>) {
    if (this.arbitraries.length === 1) return new NoArbitrary()
    if (this.arbitraries.length === 2) return this.arbitraries[0]
    return new ArbitraryComposite(this.arbitraries.slice(0, -1))
  }
}

// -----------------------------
// --- Primitive Arbitraries ---
// -----------------------------

class ArbitraryString extends Arbitrary<string> {
  constructor(public readonly min = 2, public readonly max = 10, public readonly chars = 'abcdefghijklmnopqrstuvwxyz') {
    super()
    this.min = min
    this.max = max
  }

  size(): ArbitrarySize {
    const chars = this.chars.length
    const max = this.max
    const min = this.min
    const value = (chars === 1) ? (max - min + 1) : ((chars ** (max + 1)) / (chars - 1)) - chars ** min / (chars - 1)

    return { value, type: 'exact' }
  }

  pick(size = Math.floor(Math.random() * (Math.max(0, this.max - this.min) + 1)) + this.min) {
    let string = ''
    for (let i = 0; i < size; i++) string += this.chars[Math.floor(Math.random() * this.chars.length)]
    return { value : string }
  }

  cornerCases() {
    return [{ value: this.pick(this.min).value }, { value: this.pick(this.max).value }]
  }

  shrink(initial: FluentPick<string>) {
    if (this.min > initial.value.length - 1) return new NoArbitrary()
    return new ArbitraryString(this.min, initial.value.length - 1, this.chars)
  }
}

class ArbitraryInteger extends Arbitrary<number> {
  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super()
    this.min = min
    this.max = max
  }

  size(): ArbitrarySize { return { value: this.max - this.min + 1, type: 'exact' } }

  pick() { return { value: Math.floor(Math.random() * (this.max - this.min + 1)) + this.min } }

  cornerCases() {
    return (this.min < 0 && this.max > 0) ?
      [{ value: 0 }, { value: this.min }, { value: this.max }] :
      [{ value: this.min }, { value: this.max }]
  }

  shrink(initial: FluentPick<number>): Arbitrary<number> | NoArbitrary {
    if (initial.value > 0) {
      const lower = Math.max(0, this.min)
      const upper = Math.max(lower, initial.value - 1)
      const midpoint = Math.floor((upper + lower) / 2)

      if (lower === upper) return new NoArbitrary()

      return new ArbitraryComposite([new ArbitraryInteger(lower, midpoint - 1), new ArbitraryInteger(midpoint, upper)])
    } else if (initial.value < 0) {
      const upper = Math.max(0, this.max)
      const lower = Math.max(upper, initial.value + 1)
      const midpoint = Math.ceil((upper + lower) / 2)

      if (lower === upper) return new NoArbitrary()

      return new ArbitraryComposite([new ArbitraryInteger(lower, midpoint - 1), new ArbitraryInteger(midpoint, upper)])
    }
    return new NoArbitrary()
  }
}

class ArbitraryReal extends ArbitraryInteger {
  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super(min, max)
  }

  pick() { return { value: Math.random() * (this.max - this.min) + this.min } }
}

// -----------------------------
// -- Transformed Arbitraries --
// -----------------------------

class WrappedArbitrary<A> extends Arbitrary<A> {
  constructor(public readonly baseArbitrary: NonNullable<Arbitrary<A>>) {
    super()
  }

  pick() { return this.baseArbitrary.pick() }
  size() { return this.baseArbitrary.size() }
  cornerCases() { return this.baseArbitrary.cornerCases() }
}

class _ChainedArbitrary<A, B> extends Arbitrary<B> {
  constructor(public readonly baseArbitrary: NonNullable<Arbitrary<A>>, public readonly f: (a: A) => Arbitrary<B>) {
    super()
  }

  pick() { return this.f(this.baseArbitrary.pick().value).pick() }
  size() { return this.baseArbitrary.size() }
}

class UniqueArbitrary<A> extends WrappedArbitrary<A> {
  constructor(readonly baseArbitrary: NonNullable<Arbitrary<A>>) {
    super(baseArbitrary)
  }

  sample(sampleSize = 10): FluentPick<A>[] {
    const result = new Array<FluentPick<A>>()
    const bagSize = Math.min(sampleSize, this.size().value)

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

  mapFluentPick(p: FluentPick<A>): FluentPick<B> {
    const original = ('original' in p) ? p.original : p.value
    return ({ original, value: this.f(p.value) })
  }

  pick(): FluentPick<B> { return this.mapFluentPick(this.baseArbitrary.pick()) }

  // TODO: This is not strictly true when the mapping function is not bijective. I suppose this is
  // a count-distinct problem, so we should probably either count the cardinality with a Set (for
  // small arbitraries), or use a cardinality estimator such as HyperLogLog for big ones. One
  // interesting information we could leverage here is that the new arbitrary size will never
  // be *above* the baseArbitrary.
  size() { return this.baseArbitrary.size() }

  cornerCases() { return this.baseArbitrary.cornerCases().map(p => this.mapFluentPick(p)) }

  shrink(initial: FluentPick<B>): MappedArbitrary<A, B> | NoArbitrary {
    return new MappedArbitrary(this.baseArbitrary.shrink({ original: initial.original, value: initial.original }), this.f)
  }
}

class FilteredArbitrary<A> extends WrappedArbitrary<A> {
    sizeEstimation: BetaDistribution

    constructor(readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => boolean) {
      super(baseArbitrary)
      this.sizeEstimation = new BetaDistribution(2, 1) // use 1,1 for .mean instead of .mode in point estimation
    }

    size() {
      // TODO: Still not sure if we should use mode or mean for estimating the size (depends on which error we are trying to minimize, L1 or L2)
      // Also, this assumes we estimate a continuous interval between 0 and 1;
      // We could try to change this to a beta-binomial distribution, which would provide us a discrete approach
      // for when we know the exact base population size.
      return this.baseArbitrary.mapArbitrarySize(v =>
        ({ type: 'estimated',
          value: Math.round(v * this.sizeEstimation.mode()),
          credibleInterval: [v * this.sizeEstimation.inv(lowerCredibleInterval), v * this.sizeEstimation.inv(upperCredibleInterval)] }))
    }

    pick(): FluentPick<A> {
      do {
        const pick = this.baseArbitrary.pick()
        if (this.f(pick.value)) { this.sizeEstimation.update(1, 0); return pick }
        this.sizeEstimation.update(0, 1)
      } while (this.baseArbitrary.size().value * this.sizeEstimation.inv(upperCredibleInterval) >= 1) // If we have a pretty good confidence that the size < 1, we stop trying

      return ({ value: undefined })
    }

    cornerCases() { return this.baseArbitrary.cornerCases().filter(this.f) }
}

// -----------------------------
// ---- Derived Arbitraries ----
// -----------------------------

class ArbitraryBoolean extends MappedArbitrary<number, boolean> {
  constructor() { super(new ArbitraryInteger(0, 1), x => x === 0) }
  shrink(_: FluentPick<boolean>) { return new NoArbitrary() }
}

// -----------------------------
// ----- Arbitrary Builders ----
// -----------------------------

export const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => new ArbitraryInteger(min, max)
export const real    = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => new ArbitraryReal(min, max)
export const nat     = (min = 0, max = Number.MAX_SAFE_INTEGER) => new ArbitraryInteger(min, max)
export const string  = (min = 2, max = 10, chars = 'abcdefghijklmnopqrstuvwxyz') => new ArbitraryString(min, max, chars)
export const array   = <A>(arbitrary: Arbitrary<A>, min = 0, max = 10) => new ArbitraryCollection(arbitrary, min, max)
export const union   = <A>(...arbitraries: Arbitrary<A>[]) => new ArbitraryComposite(arbitraries)
export const boolean = () => new ArbitraryBoolean()