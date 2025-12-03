## ADDED Requirements

### Requirement: Type-Safe Strategy Bindings

The strategy layer SHALL preserve the mapping between arbitrary names and their value types at the type level, consistent with the fluent intersection-of-records used by `FluentCheck`.

#### Scenario: Bindings reflect quantifier types
- **WHEN** `scenario().forall('x', fc.integer())` is used
- **AND** the quantifier registers the arbitrary with the strategy
- **THEN** the strategy bindings type SHALL reflect that `'x'` is associated with `number`
- **AND** calls to `hasInput('x')` and `getInput('x')` SHALL be type-safe with respect to `number`

#### Scenario: Strategy bindings track multiple arbitraries
- **WHEN** `scenario().forall('x', fc.integer()).forall('user', fc.record({ id: fc.integer() }))` is used
- **THEN** the strategy bindings type SHALL include both `x: number` and `user: { id: number }`
- **AND** `getInput('user')` SHALL return `FluentPick<{ id: number }>`

#### Scenario: No runtime dependency on bindings
- **WHEN** the strategy bindings type is refined by additional quantifiers
- **THEN** no additional runtime checks SHALL be required for accessing arbitraries by name
- **AND** the change SHALL be purely type-level, preserving existing runtime behavior

