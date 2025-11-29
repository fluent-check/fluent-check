## MODIFIED Requirements

### Requirement: Unique Value Generation

The system SHALL provide efficient unique value generation with O(n) amortized performance for JSON-serializable types.

#### Scenario: Generate unique primitive values
- **WHEN** requesting unique values from `fc.integer().unique()`
- **THEN** no duplicate values are returned
- **AND** deduplication uses O(1) hash-based lookup

#### Scenario: Generate unique object values
- **WHEN** requesting unique values from `fc.record({...}).unique()`
- **THEN** no duplicate objects (by deep equality) are returned
- **AND** deduplication uses O(1) hash-based lookup via JSON serialization

#### Scenario: Generate unique non-serializable values
- **WHEN** requesting unique values from an arbitrary producing non-JSON-serializable values
- **THEN** no duplicate values are returned
- **AND** deduplication falls back to O(n) deep equality comparison

#### Scenario: Large sample performance
- **WHEN** requesting 10000 unique integer values
- **THEN** generation completes in O(n) time, not O(n²)
