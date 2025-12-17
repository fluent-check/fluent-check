export type FluentPick<V> = {
  value: V
  original?: any
  /**
   * Optional pre-map value used to preserve base picks through mapped arbitraries.
   */
  preMapValue?: unknown
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
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
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

// Utility types for strict mode type safety

/**
 * Excludes `undefined` from a type.
 *
 * Alias for `Exclude<T, undefined>` for clarity when only excluding undefined (not null).
 *
 * @example
 * ```typescript
 * type DefinedString = Defined<string | undefined>  // string
 * ```
 */
export type Defined<T> = Exclude<T, undefined>

/**
 * Transforms a record type to have all properties required.
 *
 * Use after validating that all properties in a record structure are present.
 *
 * @example
 * ```typescript
 * interface Schema {
 *   name?: string
 *   age?: number
 * }
 *
 * function validateSchema(schema: Schema): Validated<Schema> {
 *   if (schema.name === undefined || schema.age === undefined) {
 *     throw new Error('Missing required fields')
 *   }
 *   return schema as Validated<Schema>  // { name: string; age: number }
 * }
 * ```
 */
export type Validated<T extends Record<string, unknown>> = Required<T>

/**
 * Represents a non-empty array with at least one element.
 *
 * @example
 * ```typescript
 * function processNonEmpty<T>(arr: NonEmptyArray<T>): T {
 *   return arr[0]  // TypeScript knows arr[0] exists
 * }
 * ```
 */
export type NonEmptyArray<T> = [T, ...T[]]
