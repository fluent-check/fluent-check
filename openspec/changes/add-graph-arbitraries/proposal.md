# Change: Add Graph Arbitraries and Shrinking Strategies

## Why

Property-based testing of graph algorithms (reachability, shortest paths, cycle detection, topological sort) currently requires manual graph construction and path generation. FluentCheck's `.exists()` quantifier enables powerful graph property testing, but users must build graphs by hand and cannot benefit from automatic shrinking to find minimal failing cases.

Example use case from evidence documentation:

```typescript
// FluentCheck: Is there a valid path from start to goal?
fc.scenario()
  .given('graph', () => buildGraph())
  .exists('path', fc.array(fc.integer(0, 10), 1, 5))
  .then(({graph, path}) => isValidPath(graph, path, 0, 10))
  .check()
```

With proper graph arbitraries, this becomes:

```typescript
fc.scenario()
  .given('graph', fc.graph({nodes: 10, edges: fc.integer(5, 20), directed: true}))
  .exists('path', ({graph}) => fc.path(graph, 0, 9))
  .then(({graph, path}) => isValidPath(graph, path))
  .check()
```

## What Changes

- **ADDED**: `fc.graph()` arbitrary for generating graphs with configurable topology
- **ADDED**: `fc.directedGraph()` shorthand for directed graph generation
- **ADDED**: `fc.undirectedGraph()` shorthand for undirected graph generation
- **ADDED**: `fc.weightedGraph()` for graphs with edge weights
- **ADDED**: `fc.path()` arbitrary for generating valid paths in a given graph
- **ADDED**: `fc.connectedGraph()` for generating connected graphs
- **ADDED**: `fc.dag()` for generating directed acyclic graphs
- **ADDED**: Graph-specific shrinking strategies (edge removal, node removal, weight simplification)
- **ADDED**: Graph representations (adjacency list, edge list) with TypeScript types

## Impact

- Affected specs: `arbitraries`, `shrinking`
- Affected code: 
  - New `src/arbitraries/ArbitraryGraph.ts`
  - New `src/arbitraries/ArbitraryPath.ts`
  - Updates to `src/arbitraries/index.ts`
  - Updates to `src/FluentCheck.ts` for factory functions

## Design Considerations

### Graph Representation

The primary representation uses adjacency lists for efficiency:

```typescript
interface Graph<N, E = void> {
  nodes: N[]
  edges: Map<N, Array<{target: N, weight?: E}>>
  directed: boolean
}
```

### Shrinking Strategy

Graph shrinking prioritizes:
1. Remove edges while maintaining property requirements
2. Remove isolated nodes
3. Simplify edge weights toward zero/identity
4. Reduce graph to minimal failing subgraph

### Path Generation

The `fc.path()` arbitrary generates valid paths by:
1. Starting from source node
2. Following existing edges
3. Early-terminating at target or when no more edges
4. Shrinking removes intermediate nodes while maintaining validity
