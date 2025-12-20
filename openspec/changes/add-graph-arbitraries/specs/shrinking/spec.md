# Shrinking Delta: Graph Shrinking Strategies

## ADDED Requirements

### Requirement: Graph Shrinking Strategy

The system SHALL provide specialized shrinking strategies for graph structures.

#### Scenario: Edge removal shrinking
- **WHEN** a graph arbitrary's `shrink()` method is called
- **THEN** it SHALL produce graphs with progressively fewer edges
- **AND** edge removal SHALL use binary search to find minimal edge set

#### Scenario: Node removal shrinking
- **WHEN** shrinking a graph after edges have been minimized
- **THEN** isolated nodes (nodes with no edges) MAY be removed
- **AND** node removal SHALL not disconnect required nodes

#### Scenario: Connectivity preservation option
- **WHEN** `shrink({preserveConnectivity: true})` is used on a connected graph
- **THEN** all shrunk variants SHALL remain connected
- **AND** only edges whose removal maintains connectivity SHALL be candidates

### Requirement: Path Shrinking Strategy

The system SHALL provide specialized shrinking for path values.

#### Scenario: Path length reduction
- **WHEN** a path `[A, B, C, D, E]` is shrunk
- **THEN** shorter valid paths SHALL be produced
- **AND** shortcuts like `[A, D, E]` SHALL only be produced if edge (A, D) exists

#### Scenario: Path endpoint preservation
- **WHEN** shrinking a path with specified source and target
- **THEN** shrunk paths SHALL maintain the same source and target nodes
- **AND** only intermediate nodes MAY be removed

### Requirement: Weighted Edge Shrinking

The system SHALL shrink edge weights in weighted graphs.

#### Scenario: Weight simplification
- **WHEN** shrinking a weighted graph
- **THEN** edge weights SHALL be shrunk toward their arbitrary's corner cases
- **AND** weight shrinking SHALL occur after structural shrinking

#### Scenario: Weight-only shrinking
- **WHEN** structural shrinking exhausts (cannot remove more edges)
- **THEN** weight values SHALL continue to be simplified
- **AND** graph topology SHALL remain unchanged during weight shrinking

### Requirement: DAG Shrinking

The system SHALL preserve acyclicity when shrinking DAGs.

#### Scenario: Acyclicity preservation
- **WHEN** shrinking a DAG
- **THEN** all shrunk variants SHALL remain acyclic
- **AND** topological ordering SHALL be preserved
