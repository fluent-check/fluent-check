# Tasks: Add Graph Arbitraries and Shrinking Strategies

## 1. Core Types and Interfaces

- [x] 1.1 Define `Graph<N, E>` interface with adjacency list representation
- [x] 1.2 Define `Edge<N, E>` type for edge representation
- [x] 1.3 Define `GraphConfig` type for generation parameters
- [x] 1.4 Define `PathConfig` type for path generation parameters
- [x] 1.5 Export types from `src/arbitraries/types.ts`

## 2. Graph Arbitrary Implementation

- [x] 2.1 Create `ArbitraryGraph<N, E>` class extending `Arbitrary<Graph<N, E>>`
- [x] 2.2 Implement `size()` method (estimated based on node/edge counts)
- [x] 2.3 Implement `pick()` method for graph generation
- [x] 2.4 Implement `canGenerate()` validation
- [x] 2.5 Implement `cornerCases()` (empty graph, single node, fully connected)
- [x] 2.6 Implement `hashCode()` and `equals()` for graph identity
- [x] 2.7 Implement `toString()` for debugging

## 3. Graph Shrinking

- [x] 3.1 Implement `shrink()` method for edge removal strategy
- [x] 3.2 Implement node removal shrinking (preserve connectivity if required)
- [x] 3.3 Implement weight simplification for weighted graphs
- [x] 3.4 Add shrink option to preserve graph properties (connected, acyclic)

## 4. Path Arbitrary Implementation

- [x] 4.1 Create `ArbitraryPath<N>` class extending `Arbitrary<N[]>`
- [x] 4.2 Implement `pick()` using random walk from source
- [x] 4.3 Implement `shrink()` for path length reduction
- [x] 4.4 Implement `canGenerate()` for path validity
- [x] 4.5 Implement `cornerCases()` (shortest path, single node path)

## 5. Factory Functions

- [x] 5.1 Implement `fc.graph()` with full configuration
- [x] 5.2 Implement `fc.directedGraph()` shorthand
- [x] 5.3 Implement `fc.undirectedGraph()` shorthand
- [x] 5.4 Implement `fc.weightedGraph()` with weight arbitrary
- [x] 5.5 Implement `fc.connectedGraph()` with connectivity guarantee
- [x] 5.6 Implement `fc.dag()` for directed acyclic graphs
- [x] 5.7 Implement `fc.path()` for path generation within a graph

## 6. Integration

- [x] 6.1 Export from `src/arbitraries/index.ts`
- [x] 6.2 Add factory functions to `FluentCheck.ts`
- [x] 6.3 Update type exports

## 7. Testing

- [x] 7.1 Unit tests for graph generation (various configurations)
- [x] 7.2 Unit tests for path generation
- [x] 7.3 Unit tests for shrinking strategies
- [x] 7.4 Property tests for graph invariants
- [x] 7.5 Integration tests with `.exists()` quantifier
- [x] 7.6 Test edge cases (empty graph, single node, disconnected)

## 8. Documentation

- [x] 8.1 Add JSDoc comments to all public APIs
- [x] 8.2 Add usage examples to documentation
- [x] 8.3 Update exists-expressiveness.md with working example
