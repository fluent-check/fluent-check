# Tooling

## MODIFIED Requirements

### Requirement: Strict Mode Code Patterns

The codebase SHALL use clean, readable patterns for handling `noUncheckedIndexedAccess` strict mode requirements while maintaining type safety. These patterns SHALL be applied consistently across all code that accesses arrays, objects, or optional values.

**Core Principle:** The codebase SHALL ALWAYS prefer type-level solutions over runtime validation when possible. Type-level mechanisms (utility types, mapped types, assertion functions) have zero runtime overhead and provide compile-time guarantees. Runtime checks SHALL only be used when type-level solutions are not feasible.

**Priority Order:**
1. Type-level solutions first (utility types, mapped types, conditional types)
2. Assertion functions for runtime validation that must happen
3. Runtime checks last (only when type-level solutions are not possible)

#### Scenario: Type-level utility types for non-nullable types (PREFERRED)
- **WHEN** function return types or variable types can exclude undefined/null at the type level
- **THEN** code SHALL use `NonNullable<T>` to express non-nullable types
- **AND** code SHALL use `Required<T>` or `Required<Pick<T, K>>` for validated object structures
- **AND** code SHALL use `Exclude<T, undefined>` for array element types after filtering undefined values
- **AND** code SHALL use `Extract<T, U>` for discriminated union narrowing
- **AND** code SHALL prefer type-level constraints over runtime checks when types can express the constraint
- **AND** code SHALL eliminate runtime undefined checks entirely when using type-level solutions
- **AND** these solutions SHALL have zero runtime overhead

#### Scenario: Array filtering with type-level narrowing (TypeScript 5.5+)
- **WHEN** filtering arrays to remove undefined values
- **THEN** code SHALL use TypeScript 5.5 inferred type predicates - `filter(item => item !== undefined)` automatically infers `NonNullable<T>[]` without explicit type guard
- **AND** code SHALL prefer inferred type predicates over explicit type guards when TypeScript can infer them
- **AND** return types SHALL automatically be `NonNullable<T>[]` when using inferred type predicates
- **AND** code SHALL avoid manual undefined checks after filtering when types are narrowed
- **AND** explicit type guards SHALL only be used when TypeScript cannot infer the predicate: `(item): item is NonNullable<typeof items[number]> => item !== undefined`

#### Scenario: Validated object structures with Required type
- **WHEN** object structures are validated at construction or function start
- **THEN** validation functions SHALL return `Required<T>` types after validation
- **AND** validated objects SHALL be stored with `Required<T>` type to eliminate subsequent runtime checks
- **AND** code SHALL use `Required<Pick<T, K>>` for partial required transformations
- **AND** validated structures SHALL not require runtime undefined checks for validated properties

#### Scenario: Custom utility types for project patterns
- **WHEN** common type transformations are needed across the codebase
- **THEN** code SHALL define custom utility types (e.g., `Defined<T>`, `Validated<T>`, `NonEmptyArray<T>`)
- **AND** custom utility types SHALL be documented with usage examples
- **AND** custom utility types SHALL be exported from appropriate type definition files
- **AND** custom utility types SHALL follow naming conventions that clearly express their purpose
