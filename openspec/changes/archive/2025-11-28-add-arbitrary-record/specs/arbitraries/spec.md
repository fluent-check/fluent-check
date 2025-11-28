## ADDED Requirements

### Requirement: Record Arbitrary

The system SHALL provide a `record(schema)` function that creates an arbitrary generating objects from a schema where keys map to arbitraries.

#### Scenario: Generate typed objects

- **WHEN** `fc.record({ name: fc.string(), age: fc.integer(0, 120) })` is called
- **THEN** objects of type `{ name: string, age: number }` are generated
- **AND** each property value SHALL be generated from its corresponding arbitrary

#### Scenario: Type inference from schema

- **WHEN** a record schema is provided with typed arbitraries
- **THEN** TypeScript SHALL infer the exact object type from the schema
- **AND** accessing non-existent properties SHALL be a compile-time error

#### Scenario: Nested records

- **WHEN** `fc.record({ user: fc.record({ name: fc.string() }), active: fc.boolean() })` is called
- **THEN** nested objects are generated with the correct structure

#### Scenario: Empty schema

- **WHEN** `fc.record({})` is called
- **THEN** empty objects `{}` SHALL be generated

#### Scenario: NoArbitrary in schema

- **WHEN** any property arbitrary is `NoArbitrary`
- **THEN** `NoArbitrary` SHALL be returned

#### Scenario: Corner cases

- **WHEN** sampling from a record arbitrary
- **THEN** corner cases SHALL be combinations of property corner cases
- **AND** corner cases SHALL be generated for each property independently

#### Scenario: Shrinking

- **WHEN** shrinking a record value
- **THEN** each property SHALL be shrunk independently
- **AND** shrinking SHALL produce records with one property shrunk at a time
