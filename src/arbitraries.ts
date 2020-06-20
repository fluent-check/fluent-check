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

  shrink(_initial: FluentPick<A>): Arbitrary<A> {
    return NoArbitrary
  }

  canGenerate(_: FluentPick<A>): boolean {
    return false
  }

  map<B>(f: (a: A) => B) { return new MappedArbitrary(this, f) }
  filter(f: (a: A) => boolean) { return new FilteredArbitrary<A>(this, f) }
  unique() { return new UniqueArbitrary(this) }
}

// -----------------------------
// ---- Special Arbitraries ----
// -----------------------------

const NoArbitrary: Arbitrary<never> = new class extends Arbitrary<never> {
  size(): ArbitrarySize { return { value: 0, type: 'exact' } }
  sampleWithBias(_ = 0) { return [] }
  sample(_ = 0) { return [] }
}()

class ArbitraryArray<A> extends Arbitrary<A[]> {
  constructor(public arbitrary: Arbitrary<A>, public min = 0, public max = 10) {
    super()
  }

  size() {
    return this.arbitrary.mapArbitrarySize(v => ({ value: v ** (this.max - this.min), type: 'exact' }))
  }

  pick(): FluentPick<A[]> {
    const size = Math.floor(Math.random() * (this.max - this.min + 1)) + this.min
    const fpa = this.arbitrary.sampleWithBias(size)
    if (fpa.every(f => f.original === undefined)) return { value: fpa.map(v => v.value) }
    return { value: fpa.map(v => v.value) , original: fpa.map(v => v.original) }
  }

  shrink(initial: FluentPick<A[]>) {
    if (this.min === initial.value.length) return NoArbitrary

    return new ArbitraryComposite([
      new ArbitraryArray(this.arbitrary, this.min, Math.floor((this.min + initial.value.length) / 2)),
      new ArbitraryArray(this.arbitrary, Math.floor((this.min + initial.value.length) / 2) + 1, initial.value.length - 1)
    ])
  }

  canGenerate(pick: FluentPick<A[]>) {
    return pick.value.length >= this.min && pick.value.length <= this.max &&
           pick.value.every((v, i) => this.arbitrary.canGenerate({ value: v, original: pick.original[i] }))
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

  shrink(initial: FluentPick<A>) {
    const arbitraries = this.arbitraries.filter(a => a.canGenerate(initial))

    if (arbitraries.length === 0) return NoArbitrary

    return new ArbitraryComposite(arbitraries.map(a => a.shrink(initial)))
  }

  canGenerate(pick: FluentPick<A>) {
    return this.arbitraries.some(a => a.canGenerate(pick))
  }
}

// -----------------------------
// --- Primitive Arbitraries ---
// -----------------------------

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

  shrink(initial: FluentPick<number>): Arbitrary<number> {
    if (initial.value > 0) {
      const lower = Math.max(0, this.min)
      const upper = Math.max(lower, initial.value! - 1)
      const midpoint = Math.floor((upper + lower) / 2)

      if (lower === upper) return NoArbitrary

      return new ArbitraryComposite([new ArbitraryInteger(lower, midpoint - 1), new ArbitraryInteger(midpoint, upper)])
    } else if (initial.value! < 0) {
      const upper = Math.min(0, this.max)
      const lower = Math.min(upper, initial.value! + 1)
      const midpoint = Math.ceil((upper + lower) / 2)

      if (lower === upper) return NoArbitrary

      return new ArbitraryComposite([new ArbitraryInteger(midpoint, upper), new ArbitraryInteger(lower, midpoint - 1)])
    }

    return NoArbitrary
  }

  canGenerate(pick: FluentPick<number>) {
    return pick.value >= this.min && pick.value <= this.max
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

  canGenerate(pick: FluentPick<A>) {
    return this.baseArbitrary.canGenerate(pick)
  }
}

class UniqueArbitrary<A> extends WrappedArbitrary<A> {
  constructor(readonly baseArbitrary: NonNullable<Arbitrary<A>>) {
    super(baseArbitrary)
  }

  sample(sampleSize = 10): FluentPick<A>[] {
    // TODO: Here lies dragons! If you see start seeing things in double when
    // using this arbitrary, consider the culprit might lie in the way Map
    // deals with keys and equality
    const result = new Map<A, FluentPick<A>>()

    let bagSize = sampleSize
    while (result.size < bagSize) {
      const r = this.pick()
      if (!result.has(r.value)) result.set(r.value, r)
      bagSize = Math.min(sampleSize, this.size().value)
    }

    return Array.from(result.values())
  }

  shrink(initial: FluentPick<A>) {
    const shrunk = this.baseArbitrary.shrink(initial)
    return (shrunk === NoArbitrary) ? shrunk : new UniqueArbitrary(shrunk)
  }
}

class MappedArbitrary<A, B> extends Arbitrary<B> {
  constructor(public readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => B) {
    super()
  }

  mapFluentPick(p: FluentPick<A>): FluentPick<B> {
    const original = ('original' in p) ? p.original : p.value
    return ({ original, value: this.f(p.value!) })
  }

  pick(): FluentPick<B> { return this.mapFluentPick(this.baseArbitrary.pick()) }

  // TODO: This is not strictly true when the mapping function is not bijective. I suppose this is
  // a count-distinct problem, so we should probably either count the cardinality with a Set (for
  // small arbitraries), or use a cardinality estimator such as HyperLogLog for big ones. One
  // interesting information we could leverage here is that the new arbitrary size will never
  // be *above* the baseArbitrary.
  size() { return this.baseArbitrary.size() }

  cornerCases() { return this.baseArbitrary.cornerCases().map(p => this.mapFluentPick(p)) }

  shrink(initial: FluentPick<B>): Arbitrary<B> {
    return new MappedArbitrary(this.baseArbitrary.shrink({ original: initial.original, value: initial.original }), this.f)
  }

  canGenerate(pick: FluentPick<B>) {
    return this.baseArbitrary.canGenerate({ value: pick.original, original: pick.original }) /* && pick.value === this.f(pick.original) */
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

  cornerCases() { return this.baseArbitrary.cornerCases().filter(a => this.f(a.value)) }

  shrink(initialValue: FluentPick<A>) {
    if (!this.f(initialValue.value)) return NoArbitrary
    return new FilteredArbitrary(this.baseArbitrary.shrink(initialValue), this.f)
  }

  canGenerate(pick: FluentPick<A>) {
    return this.baseArbitrary.canGenerate(pick) /* && this.f(pick.value) */
  }
}

// -----------------------------
// ---- Derived Arbitraries ----
// -----------------------------

class ArbitraryBoolean extends MappedArbitrary<number, boolean> {
  constructor() { super(new ArbitraryInteger(0, 1), x => x === 0) }
  shrink(_: FluentPick<boolean>) { return NoArbitrary }
  canGenerate(pick: FluentPick<boolean>) { return pick.value !== undefined}
}

class ArbitraryString extends MappedArbitrary<number[], string> {
  constructor(public readonly min = 2, public readonly max = 10, public readonly chars = 'abcdefghijklmnopqrstuvwxyz') { 
    super(new ArbitraryArray(new ArbitraryInteger(0, chars.length - 1), min, max), a => a.map(n => this.chars[n]).join(''))
  }

  canGenerate(pick: FluentPick<string>) {
    return this.baseArbitrary.canGenerate({
      original: pick.value.split('').map(c => this.chars.indexOf(c)),
      value:    pick.value.split('').map(c => this.chars.indexOf(c)) })
  }
}

// -----------------------------
// ----- Arbitrary Builders ----
// -----------------------------

export const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => new ArbitraryInteger(min, max)
export const real    = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => new ArbitraryReal(min, max)
export const nat     = (min = 0, max = Number.MAX_SAFE_INTEGER) => new ArbitraryInteger(min, max)
export const string  = (min = 2, max = 10, chars = 'abcdefghijklmnopqrstuvwxyz') => new ArbitraryString(min, max, chars)
export const array   = <A>(arbitrary: Arbitrary<A>, min = 0, max = 10) => new ArbitraryArray(arbitrary, min, max)
export const union   = <A>(...arbitraries: Arbitrary<A>[]) => new ArbitraryComposite(arbitraries)
export const boolean = () => new ArbitraryBoolean()