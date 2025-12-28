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
 * IMPORTANT: This is an interface (not a type alias with intersection) because
 * TypeScript's interface inheritance properly overrides method return types,
 * while intersection types do not. This ensures that calling `.size()` on an
 * ExactSizeArbitrary returns `ExactSize`, not `ArbitrarySize`.
 *
 * @see https://github.com/microsoft/TypeScript/issues/16936 for related discussion
 */
export interface ExactSizeArbitrary<A> extends ArbitraryBase<A> {
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
 * IMPORTANT: This is an interface (not a type alias with intersection) because
 * TypeScript's interface inheritance properly overrides method return types.
 * This ensures that calling `.size()` on an EstimatedSizeArbitrary returns
 * `EstimatedSize`, not `ArbitrarySize`.
 */
export interface EstimatedSizeArbitrary<A> extends ArbitraryBase<A> {
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

import {mulberry32} from './util.js'

export class FluentRandomGenerator {
  generator!: () => number

  constructor(
    public readonly builder: (seed: number) => () => number = mulberry32,
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

/**
 * A lazy iterator for generating shrink candidates with feedback support.
 *
 * Unlike eager shrinking which pre-samples candidates, ShrinkIterator generates
 * candidates on-demand and uses feedback to guide the search (e.g., binary search).
 *
 * @typeParam A - The type of values being shrunk
 */
export interface ShrinkIterator<A> extends Iterator<FluentPick<A>> {
  /**
   * Signal that the last yielded candidate was accepted (property still failed).
   * The iterator should focus on finding even smaller values.
   */
  acceptSmaller(): void

  /**
   * Signal that the last yielded candidate was rejected (property passed).
   * The iterator should try larger values within the remaining search space.
   */
  rejectSmaller(): void

  /**
   * Get the current search bounds for diagnostics.
   * Returns undefined if bounds are not applicable (e.g., for non-numeric types).
   */
  getBounds?(): { lower: A; upper: A }

  /**
   * Makes the iterator iterable (for use in for...of loops).
   */
  [Symbol.iterator](): ShrinkIterator<A>
}

/**
 * Result type for ShrinkIterator.next() that includes the iterator result.
 */
export type ShrinkIteratorResult<A> = IteratorResult<FluentPick<A>>

/**
 * Options for creating a ShrinkIterator.
 */
export interface ShrinkIteratorOptions {
  /**
   * Random number generator to use for sampling candidates.
   * If not provided, defaults to Math.random.
   */
  generator?: () => number
}
