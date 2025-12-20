import type {FluentPick} from './types.js'
import type {Graph, AdjacencyEntry, GraphConfig} from './types.js'
import type {HashFunction, EqualsFunction} from './Arbitrary.js'
import {estimatedSize, FNV_OFFSET_BASIS, mix, stringToHash} from './util.js'
import {Arbitrary} from './internal.js'
import * as fc from './index.js'

/**
 * Arbitrary that generates graphs with configurable topology.
 *
 * @typeParam N - The node type
 * @typeParam E - The edge weight type (void for unweighted)
 */
export class ArbitraryGraph<N = number, E = void> extends Arbitrary<Graph<N, E>> {
  private readonly nodeCount: number
  private readonly nodeValues: N[]
  private readonly minEdges: number
  private readonly maxEdges: number
  private readonly isDirected: boolean
  private readonly isConnected: boolean
  private readonly isAcyclic: boolean
  private readonly weightArbitrary: Arbitrary<E> | undefined

  constructor(config: GraphConfig<N, E>, weightArbitrary?: Arbitrary<E>) {
    super()

    // Resolve directedness first (needed for edge calculation)
    this.isDirected = config.directed ?? true
    this.isConnected = config.connected ?? false
    this.isAcyclic = config.acyclic ?? false
    this.weightArbitrary = weightArbitrary

    // Validate configuration
    if (this.isAcyclic && !this.isDirected) {
      throw new Error('The "acyclic" option is only supported for directed graphs.')
    }

    // Resolve node configuration
    if (typeof config.nodes === 'number') {
      this.nodeCount = config.nodes
      // When nodes is a number, N is constrained to be number at the call site

      this.nodeValues = Array.from({length: config.nodes}, (_, i) => i) as N[]
    } else {
      this.nodeCount = config.nodes.length
      this.nodeValues = config.nodes
    }

    // Resolve edge configuration
    const maxPossibleEdges = this.isDirected
      ? this.nodeCount * (this.nodeCount - 1)
      : (this.nodeCount * (this.nodeCount - 1)) / 2

    let minEdges: number
    let maxEdges: number

    if (config.edges === undefined) {
      minEdges = 0
      maxEdges = Math.min(maxPossibleEdges, this.nodeCount * 2) // Reasonable default
    } else if (typeof config.edges === 'number') {
      minEdges = config.edges
      maxEdges = config.edges
    } else {
      minEdges = config.edges.min
      maxEdges = config.edges.max
    }

    // Ensure minimum edges for connectivity
    if (this.isConnected && this.nodeCount > 0) {
      const minForConnected = this.nodeCount - 1
      if (minEdges < minForConnected) {
        // Silently adjust to ensure connectivity is possible
        minEdges = minForConnected
      }
    }

    this.minEdges = minEdges
    this.maxEdges = maxEdges
  }

  override size() {
    // Graph size is combinatorial - estimate based on edge count range
    if (this.nodeCount === 0) {
      return estimatedSize(1, [1, 1])
    }

    const maxPossible = this.isDirected
      ? this.nodeCount * (this.nodeCount - 1)
      : (this.nodeCount * (this.nodeCount - 1)) / 2

    // Use binomial coefficient estimation
    const avgEdges = (this.minEdges + this.maxEdges) / 2
    const combinations = this.binomialCoeff(maxPossible, avgEdges)

    return estimatedSize(combinations, [1, combinations * 10])
  }

  private binomialCoeff(n: number, k: number): number {
    if (k > n) return 0
    if (k === 0 || k === n) return 1
    k = Math.min(k, n - k) // Take advantage of symmetry
    let result = 1
    for (let i = 0; i < k; i++) {
      result = (result * (n - i)) / (i + 1)
    }
    return Math.floor(result)
  }

  override pick(generator: () => number): FluentPick<Graph<N, E>> | undefined {
    if (this.nodeCount === 0) {
      return {
        value: {
          nodes: [],
          edges: new Map(),
          directed: this.isDirected
        }
      }
    }

    const nodes = [...this.nodeValues]
    const edges: Map<N, AdjacencyEntry<N, E>[]> = new Map()

    // Initialize empty adjacency lists
    for (const node of nodes) {
      edges.set(node, [])
    }

    // Generate edge count
    const edgeCount = Math.floor(generator() * (this.maxEdges - this.minEdges + 1)) + this.minEdges

    // Build spanning tree first if connected
    if (this.isConnected && nodes.length > 1) {
      this.addSpanningTree(nodes, edges, generator)
    }

    // Generate additional random edges
    const existingEdges = this.countEdges(edges)
    const additionalEdges = Math.max(0, edgeCount - existingEdges)

    this.addRandomEdges(nodes, edges, additionalEdges, generator)

    const graph: Graph<N, E> = {
      nodes,
      edges,
      directed: this.isDirected
    }

    return {value: graph}
  }

  private addSpanningTree(
    nodes: N[],
    edges: Map<N, AdjacencyEntry<N, E>[]>,
    generator: () => number
  ): void {
    // Shuffle nodes for random tree structure
    const shuffled = [...nodes]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(generator() * (i + 1))
      const temp = shuffled[i]
      shuffled[i] = shuffled[j] as N
      shuffled[j] = temp as N
    }

    // Connect each node to a random previous node
    for (let i = 1; i < shuffled.length; i++) {
      const source = shuffled[Math.floor(generator() * i)] as N
      const target = shuffled[i] as N

      if (this.isAcyclic) {
        // For DAG, always go from lower index to higher
        this.addEdge(edges, source, target, generator)
      } else {
        this.addEdge(edges, source, target, generator)
        if (!this.isDirected) {
          this.addEdge(edges, target, source, generator)
        }
      }
    }
  }

  private addRandomEdges(
    nodes: N[],
    edges: Map<N, AdjacencyEntry<N, E>[]>,
    count: number,
    generator: () => number
  ): void {
    let attempts = 0
    let added = 0
    const maxAttempts = count * 10 // Prevent infinite loops

    while (added < count && attempts < maxAttempts) {
      attempts++

      const sourceIdx = Math.floor(generator() * nodes.length)
      const targetIdx = Math.floor(generator() * nodes.length)

      // No self-loops
      if (sourceIdx === targetIdx) continue

      const source = nodes[sourceIdx] as N
      const target = nodes[targetIdx] as N

      // For DAG, enforce topological order (source index < target index)
      if (this.isAcyclic && sourceIdx > targetIdx) {
        continue // Skip edges that would violate DAG property
      }

      // Check if edge already exists
      if (this.hasEdge(edges, source, target)) continue

      this.addEdge(edges, source, target, generator)
      added++

      // For undirected, add reverse edge too
      if (!this.isDirected) {
        this.addEdge(edges, target, source, generator)
      }
    }
  }

  private addEdge(
    edges: Map<N, AdjacencyEntry<N, E>[]>,
    source: N,
    target: N,
    generator: () => number
  ): void {
    const sourceEdges = edges.get(source) ?? []

    if (this.weightArbitrary !== undefined) {
      const weightPick = this.weightArbitrary.pick(generator)
      if (weightPick !== undefined) {
        sourceEdges.push({target, weight: weightPick.value} as AdjacencyEntry<N, E>)
      }
    } else {
      sourceEdges.push({target} as AdjacencyEntry<N, E>)
    }

    edges.set(source, sourceEdges)
  }

  private hasEdge(edges: Map<N, AdjacencyEntry<N, E>[]>, source: N, target: N): boolean {
    const sourceEdges = edges.get(source)
    if (sourceEdges === undefined) return false
    return sourceEdges.some(e => e.target === target)
  }

  private countEdges(edges: Map<N, AdjacencyEntry<N, E>[]>): number {
    let count = 0
    for (const [, adj] of edges) {
      count += adj.length
    }
    return this.isDirected ? count : count / 2
  }

  override shrink(initial: FluentPick<Graph<N, E>>): Arbitrary<Graph<N, E>> {
    const graph = initial.value
    const edgeList = this.getEdgeList(graph)

    if (edgeList.length === 0) {
      return fc.empty()
    }

    // Strategy 1: Remove edges (binary search approach)
    const shrunkGraphs: Graph<N, E>[] = []

    // Try removing each edge
    for (let i = 0; i < edgeList.length; i++) {
      const newEdges = new Map<N, AdjacencyEntry<N, E>[]>()

      // Initialize empty adjacency lists
      for (const node of graph.nodes) {
        newEdges.set(node, [])
      }

      // Add all edges except the one being removed
      for (let j = 0; j < edgeList.length; j++) {
        if (i === j) continue
        const edge = edgeList[j]
        if (edge === undefined) continue

        const sourceEdges = newEdges.get(edge.source) ?? []
        if ('weight' in edge) {
          sourceEdges.push({target: edge.target, weight: edge.weight} as AdjacencyEntry<N, E>)
        } else {
          sourceEdges.push({target: edge.target} as AdjacencyEntry<N, E>)
        }
        newEdges.set(edge.source, sourceEdges)

        // For undirected graphs, add the reverse edge to maintain symmetry
        if (!graph.directed) {
          const targetEdges = newEdges.get(edge.target) ?? []
          if ('weight' in edge) {
            targetEdges.push({target: edge.source, weight: edge.weight} as AdjacencyEntry<N, E>)
          } else {
            targetEdges.push({target: edge.source} as AdjacencyEntry<N, E>)
          }
          newEdges.set(edge.target, targetEdges)
        }
      }

      const newGraph: Graph<N, E> = {
        nodes: [...graph.nodes],
        edges: newEdges,
        directed: graph.directed
      }

      // Check connectivity constraint if needed
      if (this.isConnected && !this.checkConnected(newGraph)) {
        continue
      }

      shrunkGraphs.push(newGraph)
    }

    if (shrunkGraphs.length === 0) {
      return fc.empty()
    }

    return fc.oneof(shrunkGraphs as [Graph<N, E>, ...Graph<N, E>[]])
  }

  private getEdgeList(graph: Graph<N, E>): Array<{source: N; target: N; weight?: E}> {
    const edges: Array<{source: N; target: N; weight?: E}> = []
    const seen = new Set<string>()

    for (const [source, adj] of graph.edges) {
      for (const entry of adj) {
        const key = graph.directed
          ? `${String(source)}->${String(entry.target)}`
          : [String(source), String(entry.target)].sort().join('-')

        if (!seen.has(key)) {
          seen.add(key)
          if ('weight' in entry) {
            edges.push({source, target: entry.target, weight: entry.weight})
          } else {
            edges.push({source, target: entry.target})
          }
        }
      }
    }

    return edges
  }

  private checkConnected(graph: Graph<N, E>): boolean {
    if (graph.nodes.length === 0) return true

    const firstNode = graph.nodes[0]
    if (firstNode === undefined) return true

    const visited = new Set<N>()
    const queue: N[] = [firstNode]
    visited.add(firstNode)

    // Standard BFS traversal - no reverse edge check needed because
    // undirected graphs maintain symmetric adjacency (A->B implies B->A)
    while (queue.length > 0) {
      const node = queue.shift()
      if (node === undefined) break
      const neighbors = graph.edges.get(node) ?? []

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.target)) {
          visited.add(neighbor.target)
          queue.push(neighbor.target)
        }
      }
    }

    return visited.size === graph.nodes.length
  }

  override canGenerate(pick: FluentPick<Graph<N, E>>): boolean {
    const graph = pick.value
    if (graph.nodes.length !== this.nodeCount) return false

    const edgeCount = this.countEdges(graph.edges)
    if (edgeCount < this.minEdges || edgeCount > this.maxEdges) return false

    if (this.isConnected && !this.checkConnected(graph)) return false

    if (this.isAcyclic && this.hasCycle(graph)) return false

    return true
  }

  private hasCycle(graph: Graph<N, E>): boolean {
    if (!graph.directed) return false // Only check for directed graphs

    const WHITE = 0, GRAY = 1, BLACK = 2
    const color = new Map<N, number>()

    for (const node of graph.nodes) {
      color.set(node, WHITE)
    }

    const dfs = (node: N): boolean => {
      color.set(node, GRAY)

      for (const neighbor of graph.edges.get(node) ?? []) {
        if (color.get(neighbor.target) === GRAY) return true // Back edge found
        if (color.get(neighbor.target) === WHITE && dfs(neighbor.target)) return true
      }

      color.set(node, BLACK)
      return false
    }

    for (const node of graph.nodes) {
      if (color.get(node) === WHITE && dfs(node)) return true
    }

    return false
  }

  override cornerCases(): FluentPick<Graph<N, E>>[] {
    const cases: FluentPick<Graph<N, E>>[] = []

    // Empty graph (if allowed)
    if (this.nodeCount === 0 || this.minEdges === 0) {
      const emptyEdges = new Map<N, AdjacencyEntry<N, E>[]>()
      for (const node of this.nodeValues) {
        emptyEdges.set(node, [])
      }
      cases.push({
        value: {
          nodes: [...this.nodeValues],
          edges: emptyEdges,
          directed: this.isDirected
        }
      })
    }

    // Single node graph (if nodeCount allows)
    if (this.nodeCount === 1) {
      const singleEdges = new Map<N, AdjacencyEntry<N, E>[]>()
      singleEdges.set(this.nodeValues[0] as N, [])
      cases.push({
        value: {
          nodes: [this.nodeValues[0] as N],
          edges: singleEdges,
          directed: this.isDirected
        }
      })
    }

    return cases
  }

  override hashCode(): HashFunction {
    return (g: unknown): number => {
      const graph = g as Graph<N, E>
      let hash = FNV_OFFSET_BASIS

      // Hash node count
      hash = mix(hash, graph.nodes.length)

      // Hash directed flag
      hash = mix(hash, graph.directed ? 1 : 0)

      // Hash edge count
      hash = mix(hash, this.countEdges(graph.edges))

      // Hash node values (sorted for consistency)
      const sortedNodes = [...graph.nodes].map(n => String(n)).sort()
      for (const node of sortedNodes) {
        hash = mix(hash, stringToHash(node))
      }

      return hash
    }
  }

  override equals(): EqualsFunction {
    return (a: unknown, b: unknown): boolean => {
      const graphA = a as Graph<N, E>
      const graphB = b as Graph<N, E>

      if (graphA.nodes.length !== graphB.nodes.length) return false
      if (graphA.directed !== graphB.directed) return false

      // Compare nodes (as sets)
      const nodesA = new Set(graphA.nodes.map(n => String(n)))
      const nodesB = new Set(graphB.nodes.map(n => String(n)))
      if (nodesA.size !== nodesB.size) return false
      for (const n of nodesA) {
        if (!nodesB.has(n)) return false
      }

      // Compare edges (as sets)
      const edgesA = this.getEdgeList(graphA)
      const edgesB = this.getEdgeList(graphB)
      if (edgesA.length !== edgesB.length) return false

      const edgeSetA = new Set(edgesA.map(e => `${String(e.source)}->${String(e.target)}`))
      const edgeSetB = new Set(edgesB.map(e => `${String(e.source)}->${String(e.target)}`))

      for (const e of edgeSetA) {
        if (!edgeSetB.has(e)) return false
      }

      return true
    }
  }

  override toString(depth = 0): string {
    const indent = ' '.repeat(depth * 2)
    const edgeRange = `[${this.minEdges}, ${this.maxEdges}]`
    return `${indent}Graph Arbitrary: nodes=${this.nodeCount}, edges=${edgeRange}, directed=${this.isDirected}`
  }
}
