# Arbitraries

## ADDED Requirements

### Requirement: suchThat Filter Alias

The `Arbitrary` class SHALL provide a `suchThat()` method as an alias for `filter()`.

#### Scenario: suchThat equivalence
- **WHEN** `arbitrary.suchThat(predicate)` is called
- **THEN** it SHALL behave identically to `arbitrary.filter(predicate)`
- **AND** it SHALL return the same type of filtered arbitrary

#### Scenario: suchThat chaining
- **WHEN** `suchThat` is chained with other arbitrary methods
- **THEN** it SHALL work correctly with `map`, `chain`, and other transformations
- **AND** corner cases SHALL be filtered appropriately
