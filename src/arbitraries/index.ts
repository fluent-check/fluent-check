import {
  type Arbitrary,
  ArbitraryArray,
  ArbitrarySet,
  ArbitraryBoolean,
  ArbitraryConstant,
  ArbitraryComposite,
  ArbitraryTuple,
  ArbitraryInteger,
  ArbitraryReal,
  ArbitraryRecord,
  NoArbitrary
} from './internal.js'

export * from './types.js'
import type {NonEmptyArray, ExactSizeArbitrary, Graph, GraphConfig} from './types.js'
export {Arbitrary, type HashFunction, type EqualsFunction} from './internal.js'
export type {ArbitrarySize, Graph, Edge, AdjacencyEntry, GraphConfig, PathConfig} from './types.js'
export {NoArbitrary} from './NoArbitrary.js'
import {ArbitraryGraph} from './ArbitraryGraph.js'
import {ArbitraryPath} from './ArbitraryPath.js'
export {ArbitraryGraph} from './ArbitraryGraph.js'
export {ArbitraryPath} from './ArbitraryPath.js'

// Helper to assert that an Arbitrary is ExactSizeArbitrary at factory boundaries
const asExact = <A>(arb: Arbitrary<A>): ExactSizeArbitrary<A> => arb as ExactSizeArbitrary<A>
export {exactSize, estimatedSize, mix, stringToHash, doubleToHash, FNV_OFFSET_BASIS} from './util.js'
export {char, hex, base64, ascii, unicode, string} from './string.js'
export {date, time, datetime, duration, timeToMilliseconds} from './datetime.js'
export {regex, patterns, shrinkRegexString} from './regex.js'
export {
  type LawResult,
  type LawCheckOptions,
  samplingLaws,
  shrinkingLaws,
  compositionLaws,
  arbitraryLaws
} from './laws.js'
export {
  positiveInt,
  negativeInt,
  nonZeroInt,
  byte,
  nonEmptyString,
  nonEmptyArray,
  pair,
  nullable,
  optional
} from './presets.js'

export const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): ExactSizeArbitrary<number> => {
  if (min > max) return NoArbitrary
  if (min === max) return asExact(new ArbitraryConstant(min))
  return asExact(new ArbitraryInteger(min, max))
}

export const real = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): ExactSizeArbitrary<number> => {
  if (min > max) return NoArbitrary
  if (min === max) return asExact(new ArbitraryConstant(min))
  return asExact(new ArbitraryReal(min, max))
}

export const nat = (min = 0, max = Number.MAX_SAFE_INTEGER): ExactSizeArbitrary<number> =>
  max < 0 ? NoArbitrary : integer(Math.max(0, min), max)

export function array<A>(arbitrary: ExactSizeArbitrary<A>, min?: number, max?: number): ExactSizeArbitrary<A[]>
export function array<A>(arbitrary: Arbitrary<A>, min?: number, max?: number): Arbitrary<A[]>
export function array<A>(arbitrary: Arbitrary<A>, min = 0, max = 10): Arbitrary<A[]> {
  if (min > max) return NoArbitrary
  return new ArbitraryArray(arbitrary, min, max)
}

export const set = <const A extends readonly unknown[]>(
  elements: A, min = 0, max = 10
): ExactSizeArbitrary<A[number][]> => {
  if (min > max || min > elements.length) return NoArbitrary
  return asExact(new ArbitrarySet(Array.from(new Set(elements)), min, max))
}

export const oneof = <const A extends readonly unknown[]>(elements: A): ExactSizeArbitrary<A[number]> => {
  if (elements.length === 0) return NoArbitrary
  return asExact(integer(0, elements.length - 1).map((i): A[number] => {
    const element = elements[i]
    if (element === undefined) {
      throw new Error(`Index ${i} out of bounds for oneof elements array`)
    }
    return element
  }))
}

export const union = <A>(...arbitraries: Arbitrary<A>[]): Arbitrary<A> => {
  const filtered = arbitraries.filter(a => a !== NoArbitrary)
  if (filtered.length === 0) return NoArbitrary
  if (filtered.length === 1) {
    const first = filtered[0]
    if (first === undefined) return NoArbitrary
    return first
  }
  // Safe: filtered.length >= 2, so it's a NonEmptyArray
  return new ArbitraryComposite(filtered as NonEmptyArray<Arbitrary<A>>)
}

export const boolean = (): ExactSizeArbitrary<boolean> => asExact(new ArbitraryBoolean())

export const empty = () => NoArbitrary

export const constant = <A>(constant: A): ExactSizeArbitrary<A> => asExact(new ArbitraryConstant(constant))

type UnwrapFluentPick<T> = { -readonly [P in keyof T]: T[P] extends Arbitrary<infer E> ? E : T[P] }

export const tuple = <const U extends readonly Arbitrary<any>[]>(...arbitraries: U): Arbitrary<UnwrapFluentPick<U>> => {
  if (arbitraries.some(a => a === NoArbitrary)) return NoArbitrary
  return new ArbitraryTuple([...arbitraries]) as Arbitrary<UnwrapFluentPick<U>>
}

type RecordSchema = Record<string, Arbitrary<unknown> | undefined>
type ValidatedSchema<S extends RecordSchema> = { [K in keyof S]-?: NonNullable<S[K]> }
type UnwrapSchema<S extends RecordSchema> =
  { [K in keyof S]: ValidatedSchema<S>[K] extends Arbitrary<infer T> ? T : never }

export const record = <S extends RecordSchema>(schema: S): Arbitrary<UnwrapSchema<S>> => {
  if (Object.values(schema).some(a => a === NoArbitrary)) return NoArbitrary
  return new ArbitraryRecord(schema)
}

// ============================================================================
// Graph Arbitraries
// ============================================================================

/**
 * Creates an arbitrary that generates graphs with configurable topology.
 *
 * @param config - Configuration for graph generation
 * @returns An arbitrary generating graphs
 *
 * @example
 * ```typescript
 * // Generate directed graphs with 5 nodes and 3-10 edges
 * const g = fc.graph({nodes: 5, edges: {min: 3, max: 10}, directed: true})
 *
 * // Generate graphs with custom node labels
 * const labeled = fc.graph({nodes: ['A', 'B', 'C', 'D']})
 * ```
 */
export const graph = <N = number>(
  config: GraphConfig<N>
): Arbitrary<Graph<N>> => {
  if (typeof config.nodes === 'number' && config.nodes < 0) return NoArbitrary
  if (Array.isArray(config.nodes) && config.nodes.length === 0 && config.edges !== undefined) {
    const edges = config.edges
    const minEdges = typeof edges === 'number' ? edges : edges.min
    if (minEdges > 0) return NoArbitrary
  }
  return new ArbitraryGraph(config)
}

/**
 * Creates an arbitrary that generates directed graphs.
 *
 * @param nodes - Number of nodes or array of node values
 * @param edges - Optional edge configuration
 * @returns An arbitrary generating directed graphs
 *
 * @example
 * ```typescript
 * // Generate directed graphs with 5 nodes
 * const g = fc.directedGraph(5)
 *
 * // Generate directed graphs with 5 nodes and 3-10 edges
 * const g2 = fc.directedGraph(5, {min: 3, max: 10})
 * ```
 */
export const directedGraph = <N = number>(
  nodes: number | N[],
  edges?: number | {min: number; max: number}
): Arbitrary<Graph<N>> => {
  return graph({nodes, edges, directed: true} as GraphConfig<N>)
}

/**
 * Creates an arbitrary that generates undirected graphs.
 *
 * @param nodes - Number of nodes or array of node values
 * @param edges - Optional edge configuration
 * @returns An arbitrary generating undirected graphs
 *
 * @example
 * ```typescript
 * // Generate undirected graphs with 5 nodes
 * const g = fc.undirectedGraph(5)
 * ```
 */
export const undirectedGraph = <N = number>(
  nodes: number | N[],
  edges?: number | {min: number; max: number}
): Arbitrary<Graph<N>> => {
  return graph({nodes, edges, directed: false} as GraphConfig<N>)
}

/**
 * Creates an arbitrary that generates weighted graphs.
 *
 * @param config - Configuration for graph generation
 * @param weightArbitrary - Arbitrary for generating edge weights
 * @returns An arbitrary generating weighted graphs
 *
 * @example
 * ```typescript
 * // Generate weighted graphs with integer edge weights
 * const g = fc.weightedGraph({nodes: 5}, fc.integer(1, 100))
 * ```
 */
export const weightedGraph = <N = number, E = number>(
  config: Omit<GraphConfig<N, E>, 'weights'>,
  weightArbitrary: Arbitrary<E>
): Arbitrary<Graph<N, E>> => {
  if (typeof config.nodes === 'number' && config.nodes < 0) return NoArbitrary
  return new ArbitraryGraph(config as GraphConfig<N, E>, weightArbitrary)
}

/**
 * Creates an arbitrary that generates connected graphs.
 *
 * All nodes in generated graphs are reachable from any other node.
 *
 * @param nodes - Number of nodes or array of node values
 * @param edges - Optional edge configuration (minimum will be adjusted for connectivity)
 * @returns An arbitrary generating connected graphs
 *
 * @example
 * ```typescript
 * // Generate connected graphs with 5 nodes
 * const g = fc.connectedGraph(5)
 * ```
 */
export const connectedGraph = <N = number>(
  nodes: number | N[],
  edges?: number | {min: number; max: number}
): Arbitrary<Graph<N>> => {
  return graph({nodes, edges, directed: false, connected: true} as GraphConfig<N>)
}

/**
 * Creates an arbitrary that generates directed acyclic graphs (DAGs).
 *
 * @param nodes - Number of nodes or array of node values
 * @param edges - Optional edge configuration
 * @returns An arbitrary generating DAGs
 *
 * @example
 * ```typescript
 * // Generate DAGs with 5 nodes
 * const g = fc.dag(5)
 * ```
 */
export const dag = <N = number>(
  nodes: number | N[],
  edges?: number | {min: number; max: number}
): Arbitrary<Graph<N>> => {
  return graph({nodes, edges, directed: true, acyclic: true} as GraphConfig<N>)
}

/**
 * Creates an arbitrary that generates valid paths within a graph.
 *
 * @param graphValue - The graph to generate paths in
 * @param source - Source node to start from
 * @param target - Optional target node to reach
 * @param maxLength - Maximum path length (default: 10)
 * @returns An arbitrary generating valid paths, or NoArbitrary if no path is possible
 *
 * @example
 * ```typescript
 * // Generate paths starting from node 0
 * const p = fc.path(myGraph, 0)
 *
 * // Generate paths from node 0 to node 5
 * const p2 = fc.path(myGraph, 0, 5)
 *
 * // With exists quantifier for reachability testing
 * fc.scenario()
 *   .given('graph', () => buildGraph())
 *   .exists('path', ({graph}) => fc.path(graph, 0, 9))
 *   .then(({path}) => path.length > 0)
 *   .check()
 * ```
 */
export const path = <N>(
  graphValue: Graph<N, unknown>,
  source: N,
  target?: N,
  maxLength = 10
): Arbitrary<N[]> => {
  // Check if source exists in graph
  if (!graphValue.nodes.includes(source)) return NoArbitrary

  // Check if target exists in graph (if specified)
  if (target !== undefined && !graphValue.nodes.includes(target)) return NoArbitrary

  return new ArbitraryPath(graphValue, source, target, maxLength)
}
