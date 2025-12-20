import type {FluentPick} from './types.js'
import type {Graph} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {estimatedSize, FNV_OFFSET_BASIS, mix, stringToHash} from './util.js'
import {Arbitrary} from './internal.js'
import * as fc from './index.js'

/**
 * Arbitrary that generates valid paths within a graph.
 *
 * @typeParam N - The node type
 */
export class ArbitraryPath<N> extends Arbitrary<N[]> {
  private readonly graph: Graph<N, unknown>
  private readonly source: N
  private readonly target: N | undefined
  private readonly maxLength: number
  private readonly reachableFromSource: Set<N>
  private readonly canReachTarget: Set<N>

  constructor(
    graph: Graph<N, unknown>,
    source: N,
    target: N | undefined = undefined,
    maxLength = 10
  ) {
    super()
    this.graph = graph
    this.source = source
    this.target = target
    this.maxLength = maxLength

    // Precompute reachability for efficient generation
    this.reachableFromSource = this.computeReachable(source, 'forward')
    this.canReachTarget = target !== undefined
      ? this.computeReachable(target, 'backward')
      : new Set(graph.nodes)
  }

  private computeReachable(start: N, direction: 'forward' | 'backward'): Set<N> {
    const visited = new Set<N>()
    const queue: N[] = [start]
    visited.add(start)

    while (queue.length > 0) {
      const node = queue.shift()
      if (node === undefined) break

      if (direction === 'forward') {
        // Forward: follow outgoing edges
        const neighbors = this.graph.edges.get(node) ?? []
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.target)) {
            visited.add(neighbor.target)
            queue.push(neighbor.target)
          }
        }
      } else {
        // Backward: find nodes that have edges to current node
        for (const [source, adj] of this.graph.edges) {
          if (adj.some(e => e.target === node) && !visited.has(source)) {
            visited.add(source)
            queue.push(source)
          }
        }
      }

      // For undirected graphs, also traverse in opposite direction.
      // This defensive check handles user-provided graphs that may not maintain
      // symmetric adjacency (A->B does not guarantee B->A in the adjacency map).
      // ArbitraryGraph maintains symmetry, but ArbitraryPath accepts any graph.
      if (!this.graph.directed) {
        if (direction === 'forward') {
          for (const [source, adj] of this.graph.edges) {
            if (adj.some(e => e.target === node) && !visited.has(source)) {
              visited.add(source)
              queue.push(source)
            }
          }
        } else {
          const neighbors = this.graph.edges.get(node) ?? []
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor.target)) {
              visited.add(neighbor.target)
              queue.push(neighbor.target)
            }
          }
        }
      }
    }

    return visited
  }

  override size() {
    // Path count is hard to estimate - use heuristic
    const reachableCount = this.reachableFromSource.size
    const avgDegree = this.computeAvgDegree()
    const estimatedPaths = Math.pow(avgDegree, Math.min(this.maxLength, reachableCount))

    return estimatedSize(Math.max(1, estimatedPaths), [1, estimatedPaths * 10])
  }

  private computeAvgDegree(): number {
    if (this.graph.nodes.length === 0) return 0

    let totalDegree = 0
    for (const [, adj] of this.graph.edges) {
      totalDegree += adj.length
    }

    return totalDegree / this.graph.nodes.length
  }

  override pick(generator: () => number): FluentPick<N[]> | undefined {
    // Check if path is possible
    if (this.target !== undefined && !this.reachableFromSource.has(this.target)) {
      return undefined
    }

    const path: N[] = [this.source]
    const visited = new Set<N>([this.source])
    let current = this.source

    while (path.length < this.maxLength) {
      // Get neighbors that haven't been visited yet
      const neighbors = (this.graph.edges.get(current) ?? [])
        .map(e => e.target)
        .filter(n => !visited.has(n))

      // For undirected graphs, also consider reverse edges (defensive for
      // user-provided graphs that may not maintain symmetric adjacency)
      if (!this.graph.directed) {
        for (const [source, adj] of this.graph.edges) {
          if (adj.some(e => e.target === current) && !visited.has(source)) {
            neighbors.push(source)
          }
        }
      }

      // If target specified, prefer neighbors that can reach target
      const validNeighbors = this.target !== undefined
        ? neighbors.filter(n => n === this.target || this.canReachTarget.has(n))
        : neighbors

      // Check if we've reached the target
      if (this.target !== undefined && current === this.target) {
        break
      }

      // No more valid moves
      if (validNeighbors.length === 0) {
        if (this.target !== undefined) {
          // Can't reach target - try again with different choices or return undefined
          return undefined
        }
        break
      }

      // Pick random next node
      const nextIndex = Math.floor(generator() * validNeighbors.length)
      const next = validNeighbors[nextIndex] as N

      path.push(next)
      visited.add(next)
      current = next
    }

    // Verify we reached target if specified
    if (this.target !== undefined && path[path.length - 1] !== this.target) {
      return undefined
    }

    return {value: path}
  }

  override shrink(initial: FluentPick<N[]>): Arbitrary<N[]> {
    const path = initial.value

    if (path.length <= 1) {
      return fc.empty()
    }

    // If target specified and path length is 1, can't shrink further
    if (this.target !== undefined && path.length === 2 && path[0] === this.source && path[1] === this.target) {
      // This is the minimal path from source to target (direct edge)
      return fc.empty()
    }

    const shrunkPaths: N[][] = []

    // Try removing intermediate nodes (keeping source and target if specified)
    for (let i = 1; i < path.length - (this.target !== undefined ? 1 : 0); i++) {
      // Try skipping node at position i
      const before = path[i - 1]
      const after = path[i + 1]

      if (before === undefined || after === undefined) continue

      // Check if there's a direct edge from before to after
      const hasEdge = this.hasDirectEdge(before, after)

      if (hasEdge) {
        const newPath = [...path.slice(0, i), ...path.slice(i + 1)]
        shrunkPaths.push(newPath)
      }
    }

    // Also try removing the last node (if no target specified)
    if (this.target === undefined && path.length > 1) {
      shrunkPaths.push(path.slice(0, -1))
    }

    if (shrunkPaths.length === 0) {
      return fc.empty()
    }

    return fc.oneof(shrunkPaths as [N[], ...N[][]])
  }

  private hasDirectEdge(from: N, to: N): boolean {
    const neighbors = this.graph.edges.get(from) ?? []
    if (neighbors.some(e => e.target === to)) return true

    // For undirected graphs, check reverse
    if (!this.graph.directed) {
      const reverseNeighbors = this.graph.edges.get(to) ?? []
      if (reverseNeighbors.some(e => e.target === from)) return true
    }

    return false
  }

  override canGenerate(pick: FluentPick<N[]>): boolean {
    const path = pick.value

    // Path must start with source
    if (path.length === 0 || path[0] !== this.source) return false

    // Path must end with target if specified
    if (this.target !== undefined && path[path.length - 1] !== this.target) return false

    // Path must not exceed max length
    if (path.length > this.maxLength) return false

    // All consecutive pairs must be connected by edges
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i] as N
      const to = path[i + 1] as N

      if (!this.hasDirectEdge(from, to)) return false
    }

    // No repeated nodes (simple path)
    const seen = new Set<N>()
    for (const node of path) {
      if (seen.has(node)) return false
      seen.add(node)
    }

    return true
  }

  override cornerCases(): FluentPick<N[]>[] {
    const cases: FluentPick<N[]>[] = []

    // Single node path (just source)
    if (this.target === undefined || this.source === this.target) {
      cases.push({value: [this.source]})
    }

    // Direct path from source to target if edge exists
    if (this.target !== undefined && this.hasDirectEdge(this.source, this.target)) {
      cases.push({value: [this.source, this.target]})
    }

    return cases
  }

  override hashCode(): HashFunction {
    return (p: unknown): number => {
      const path = p as N[]
      let hash = FNV_OFFSET_BASIS

      hash = mix(hash, path.length)

      for (const node of path) {
        hash = mix(hash, stringToHash(String(node)))
      }

      return hash
    }
  }

  override equals(): EqualsFunction {
    return (a: unknown, b: unknown): boolean => {
      const pathA = a as N[]
      const pathB = b as N[]

      if (pathA.length !== pathB.length) return false

      for (let i = 0; i < pathA.length; i++) {
        if (pathA[i] !== pathB[i]) return false
      }

      return true
    }
  }

  override toString(depth = 0): string {
    const indent = ' '.repeat(depth * 2)
    const targetStr = this.target !== undefined ? `, target=${String(this.target)}` : ''
    return `${indent}Path Arbitrary: source=${String(this.source)}${targetStr}, maxLength=${this.maxLength}`
  }
}
