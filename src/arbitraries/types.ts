export type FluentPick<V> = {
  value: V
  original?: any
}

export type ExactSize = {
  type: 'exact'
  value: number
}

export type EstimatedSize = {
  type: 'estimated'
  value: number
  credibleInterval: [number, number]
}

export type ArbitrarySize = ExactSize | EstimatedSize

// Forward declaration to avoid circular dependency
type ArbitraryBase<A> = import('./internal.js').Arbitrary<A>

/**
 * An arbitrary that returns an exact size when `size()` is called.
 *
 * This type is compatible with `Arbitrary<A>` but provides more specific
 * return types for `size()`, `map()`, `filter()`, and `suchThat()`.
 * This allows TypeScript to know that the size is exact without requiring type narrowing.
 */
export type ExactSizeArbitrary<A> = ArbitraryBase<A> & {
  size(): ExactSize
  map<B>(
    f: (a: A) => B,
    shrinkHelper?: XOR<
      {inverseMap: (b: NoInfer<B>) => A[]},
      {canGenerate: (pick: FluentPick<NoInfer<B>>) => boolean}
    >
  ): ExactSizeArbitrary<B>
  filter(f: (a: A) => boolean): EstimatedSizeArbitrary<A>
  suchThat(f: (a: A) => boolean): EstimatedSizeArbitrary<A>
}

/**
 * An arbitrary that returns an estimated size when `size()` is called.
 *
 * This type is compatible with `Arbitrary<A>` but provides more specific
 * return types for `size()`, `map()`, `filter()`, and `suchThat()`.
 * This indicates that the size is an estimate with a credible interval.
 */
export type EstimatedSizeArbitrary<A> = ArbitraryBase<A> & {
  size(): EstimatedSize
  map<B>(
    f: (a: A) => B,
    shrinkHelper?: XOR<
      {inverseMap: (b: NoInfer<B>) => A[]},
      {canGenerate: (pick: FluentPick<NoInfer<B>>) => boolean}
    >
  ): EstimatedSizeArbitrary<B>
  filter(f: (a: A) => boolean): EstimatedSizeArbitrary<A>
  suchThat(f: (a: A) => boolean): EstimatedSizeArbitrary<A>
}

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }
export type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U

export class FluentRandomGenerator {
  generator!: () => number

  constructor(
    public readonly builder: (seed: number) => () => number = (_: number) => Math.random,
    public readonly seed: number = Math.floor(Math.random() * 0x100000000)) {

    this.initialize()
  }

  initialize() { this.generator = this.builder(this.seed) }
}

// Template literal types for pattern validation

/** Escape sequences: \d, \w, \s, \D, \W, \S */
export type EscapeSequence = `\\${'d' | 'w' | 's' | 'D' | 'W' | 'S'}`

/** Character class brackets like [a-z], [0-9] */
export type CharClassBracket = `[${string}]`

/** Valid character class map keys */
export type CharClassKey = EscapeSequence | CharClassBracket | '.'

/** Hex digit characters for UUID and hex generation */
export type HexChar = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'a' | 'b' | 'c' | 'd' | 'e' | 'f'

/** IPv4 address pattern */
export type IPv4Address = `${number}.${number}.${number}.${number}`

/** HTTP protocol variants */
export type HttpProtocol = 'http' | 'https'

/** HTTP URL pattern */
export type HttpUrl = `${HttpProtocol}://${string}`
