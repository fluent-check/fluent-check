# Tooling

## ADDED Requirements

### Requirement: Minimal Type Assertions

The codebase SHALL minimize use of `as unknown as T` type assertions by leveraging proper type system patterns.

#### Scenario: No unnecessary assertions in factory functions
- **WHEN** arbitrary factory functions return concrete types
- **THEN** TypeScript SHALL accept the types without `as unknown as` assertions
- **AND** type inference SHALL correctly unify return types

#### Scenario: Strict mode enabled
- **WHEN** `strict: true` is enabled in tsconfig
- **THEN** hidden type errors SHALL be surfaced
- **AND** necessary fixes SHALL be applied to satisfy strict checks

#### Scenario: NoArbitrary type compatibility
- **WHEN** `NoArbitrary` (typed as `Arbitrary<never>`) is returned from factory functions
- **THEN** the return type SHALL unify correctly with concrete arbitrary types
- **AND** no type assertions SHALL be required for ternary expressions

#### Scenario: ESLint assertion warning
- **WHEN** unnecessary type assertions remain in the codebase
- **THEN** `@typescript-eslint/no-unnecessary-type-assertion` MAY flag them
