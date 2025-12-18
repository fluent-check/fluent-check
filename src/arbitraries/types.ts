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

// ============================================================================
// Graph Types
// ============================================================================

/**
 * Represents an edge in a graph.
 *
 * @typeParam N - The node type
 * @typeParam E - The edge weight type (void for unweighted graphs)
 */
export type Edge<N, E = void> = E extends void
  ? { source: N; target: N }
  : { source: N; target: N; weight: E }

/**
 * Adjacency list entry for a node's outgoing edges.
 *
 * @typeParam N - The node type
 * @typeParam E - The edge weight type (void for unweighted graphs)
 */
export type AdjacencyEntry<N, E = void> = E extends void
  ? { target: N }
  : { target: N; weight: E }

/**
 * Represents a graph with nodes and edges.
 *
 * Uses adjacency list representation for efficient traversal.
 *
 * @typeParam N - The node type (default: number)
 * @typeParam E - The edge weight type (void for unweighted graphs)
 *
 * @example
 * ```typescript
 * // Unweighted directed graph
 * const graph: Graph<number> = {
 *   nodes: [0, 1, 2],
 *   edges: new Map([
 *     [0, [{ target: 1 }, { target: 2 }]],
 *     [1, [{ target: 2 }]]
 *   ]),
 *   directed: true
 * }
 *
 * // Weighted undirected graph
 * const weighted: Graph<string, number> = {
 *   nodes: ['A', 'B', 'C'],
 *   edges: new Map([
 *     ['A', [{ target: 'B', weight: 5 }]],
 *     ['B', [{ target: 'A', weight: 5 }, { target: 'C', weight: 3 }]],
 *     ['C', [{ target: 'B', weight: 3 }]]
 *   ]),
 *   directed: false
 * }
 * ```
 */
export interface Graph<N = number, E = void> {
  /** Array of all nodes in the graph */
  nodes: N[]
  /** Adjacency list mapping each node to its outgoing edges */
  edges: Map<N, AdjacencyEntry<N, E>[]>
  /** Whether the graph is directed */
  directed: boolean
}

/**
 * Configuration for graph generation.
 *
 * @typeParam N - The node type
 * @typeParam E - The edge weight type
 */
export interface GraphConfig<N = number, E = void> {
  /**
   * Number of nodes or an arbitrary generating the node array.
   * If a number, nodes are integers 0 to n-1.
   */
  nodes: number | N[]
  /**
   * Number of edges or an arbitrary generating the edge count.
   * Defaults to [0, maxPossibleEdges].
   */
  edges?: number | { min: number; max: number }
  /** Whether to generate directed graphs (default: true) */
  directed?: boolean
  /** Arbitrary for generating edge weights (makes this a weighted graph) */
  weights?: E extends void ? never : unknown
  /** Ensure the graph is connected (default: false) */
  connected?: boolean
  /** Ensure the graph is acyclic - only valid for directed graphs (default: false) */
  acyclic?: boolean
}

/**
 * Configuration for path generation within a graph.
 */
export interface PathConfig<N> {
  /** The graph to generate paths in */
  graph: Graph<N, unknown>
  /** Source node to start from */
  source: N
  /** Optional target node to reach */
  target?: N
  /** Maximum path length (number of nodes) */
  maxLength?: number
}
