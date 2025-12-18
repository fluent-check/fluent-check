# Arbitraries Delta: Graph Arbitraries

## ADDED Requirements

### Requirement: Graph Types

The system SHALL provide TypeScript types for graph representation.

#### Scenario: Graph interface
- **WHEN** `Graph<N, E>` type is used
- **THEN** it SHALL contain `nodes: N[]` for the node set
- **AND** it SHALL contain `edges: Map<N, Array<{target: N, weight?: E}>>` for adjacency list
- **AND** it SHALL contain `directed: boolean` indicating edge directionality

#### Scenario: Edge type
- **WHEN** `Edge<N, E>` type is used
- **THEN** it SHALL contain `source: N`, `target: N`, and optional `weight?: E`

### Requirement: Graph Arbitrary

The system SHALL provide a `graph(config)` function that creates an arbitrary generating graphs with configurable topology.

#### Scenario: Generate graph with node count
- **WHEN** `fc.graph({nodes: 5})` is called
- **THEN** graphs with exactly 5 nodes SHALL be generated
- **AND** node values SHALL be integers 0 to 4 by default

#### Scenario: Generate graph with custom nodes
- **WHEN** `fc.graph({nodes: fc.array(fc.string(), 3, 5)})` is called
- **THEN** graphs with 3-5 string-labeled nodes SHALL be generated

#### Scenario: Generate graph with edge count range
- **WHEN** `fc.graph({nodes: 5, edges: fc.integer(3, 10)})` is called
- **THEN** graphs with 5 nodes and 3-10 edges SHALL be generated

#### Scenario: Generate directed graph
- **WHEN** `fc.graph({nodes: 5, directed: true})` is called
- **THEN** directed graphs SHALL be generated
- **AND** edge (A, B) does not imply edge (B, A)

#### Scenario: Generate undirected graph
- **WHEN** `fc.graph({nodes: 5, directed: false})` is called
- **THEN** undirected graphs SHALL be generated
- **AND** edges are bidirectional

#### Scenario: Default edge generation
- **WHEN** `fc.graph({nodes: 5})` is called without edge config
- **THEN** edge count SHALL default to range [0, nodes * (nodes - 1) / 2]
- **AND** no duplicate edges SHALL be generated

### Requirement: Directed Graph Shorthand

The system SHALL provide a `directedGraph(nodes, edges?)` shorthand function.

#### Scenario: Create directed graph
- **WHEN** `fc.directedGraph(5)` is called
- **THEN** it SHALL be equivalent to `fc.graph({nodes: 5, directed: true})`

#### Scenario: Create directed graph with edge range
- **WHEN** `fc.directedGraph(5, fc.integer(3, 10))` is called
- **THEN** directed graphs with 5 nodes and 3-10 edges SHALL be generated

### Requirement: Undirected Graph Shorthand

The system SHALL provide an `undirectedGraph(nodes, edges?)` shorthand function.

#### Scenario: Create undirected graph
- **WHEN** `fc.undirectedGraph(5)` is called
- **THEN** it SHALL be equivalent to `fc.graph({nodes: 5, directed: false})`

### Requirement: Weighted Graph Arbitrary

The system SHALL provide a `weightedGraph(config, weightArbitrary)` function for generating graphs with edge weights.

#### Scenario: Generate weighted graph
- **WHEN** `fc.weightedGraph({nodes: 5}, fc.integer(1, 100))` is called
- **THEN** graphs with integer edge weights between 1-100 SHALL be generated

#### Scenario: Access edge weights
- **WHEN** a weighted graph is generated
- **THEN** each edge SHALL have a `weight` property with the generated value

### Requirement: Connected Graph Arbitrary

The system SHALL provide a `connectedGraph(nodes, edges?)` function that generates graphs where all nodes are reachable.

#### Scenario: Generate connected graph
- **WHEN** `fc.connectedGraph(5)` is called
- **THEN** all generated graphs SHALL be connected
- **AND** there SHALL be a path between any two nodes

#### Scenario: Minimum edges for connectivity
- **WHEN** `fc.connectedGraph(5)` is called
- **THEN** at least `nodes - 1` edges SHALL be generated

### Requirement: DAG Arbitrary

The system SHALL provide a `dag(nodes, edges?)` function that generates directed acyclic graphs.

#### Scenario: Generate DAG
- **WHEN** `fc.dag(5)` is called
- **THEN** all generated graphs SHALL be acyclic
- **AND** no cycles SHALL exist following directed edges

#### Scenario: DAG topological order
- **WHEN** a DAG is generated
- **THEN** nodes SHALL be orderable topologically
- **AND** edges only go from lower to higher topological order

### Requirement: Path Arbitrary

The system SHALL provide a `path(graph, source, target?, maxLength?)` function that generates valid paths in a graph.

#### Scenario: Generate path from source
- **WHEN** `fc.path(graph, 0)` is called
- **THEN** valid paths starting from node 0 SHALL be generated
- **AND** each consecutive pair of nodes SHALL be connected by an edge

#### Scenario: Generate path to target
- **WHEN** `fc.path(graph, 0, 5)` is called
- **THEN** valid paths from node 0 to node 5 SHALL be generated
- **AND** NoArbitrary SHALL be returned if no path exists

#### Scenario: Limit path length
- **WHEN** `fc.path(graph, 0, undefined, 3)` is called
- **THEN** generated paths SHALL have at most 3 nodes

#### Scenario: Path shrinking
- **WHEN** a path is shrunk
- **THEN** shorter valid paths SHALL be produced
- **AND** path validity SHALL be maintained after shrinking

### Requirement: Graph Corner Cases

The system SHALL provide meaningful corner cases for graph arbitraries.

#### Scenario: Empty graph corner case
- **WHEN** sampling from `fc.graph({nodes: fc.integer(0, 5)})`
- **THEN** the empty graph (0 nodes, 0 edges) SHALL be a corner case

#### Scenario: Single node corner case
- **WHEN** sampling from `fc.graph({nodes: fc.integer(1, 5)})`
- **THEN** a single-node graph with no edges SHALL be a corner case

#### Scenario: Fully connected corner case
- **WHEN** sampling from `fc.graph({nodes: 3})`
- **THEN** the fully connected graph SHALL be a corner case

### Requirement: Graph Shrinking

The system SHALL provide effective shrinking strategies for graphs.

#### Scenario: Shrink by removing edges
- **WHEN** a graph is shrunk
- **THEN** graphs with fewer edges SHALL be produced first
- **AND** the node set SHALL remain unchanged initially

#### Scenario: Shrink by removing isolated nodes
- **WHEN** a graph with isolated nodes is shrunk after edge removal
- **THEN** isolated nodes MAY be removed
- **AND** remaining graph structure SHALL be preserved

#### Scenario: Shrink weighted graph
- **WHEN** a weighted graph is shrunk
- **THEN** edge weights SHALL be simplified toward zero or the weight arbitrary's corner cases

#### Scenario: Preserve connectivity during shrinking
- **WHEN** a connected graph is shrunk with `preserveConnectivity: true`
- **THEN** shrunk graphs SHALL remain connected
- **AND** only edges whose removal maintains connectivity SHALL be removed

### Requirement: Graph Identity Functions

The system SHALL provide `hashCode()` and `equals()` methods for graph arbitraries.

#### Scenario: Graph equality
- **WHEN** comparing two graphs with `equals()`
- **THEN** graphs with identical nodes and edges SHALL be equal
- **AND** edge order in adjacency lists SHALL not affect equality

#### Scenario: Graph hashing
- **WHEN** computing `hashCode()` for a graph
- **THEN** identical graphs SHALL produce identical hashes
- **AND** the hash SHALL incorporate both nodes and edges
