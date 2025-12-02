# Tooling

## ADDED Requirements

### Requirement: Strict Mode Code Patterns

The codebase SHALL use clean, readable patterns for handling `noUncheckedIndexedAccess` strict mode requirements while maintaining type safety. These patterns SHALL be applied consistently across all code that accesses arrays, objects, or optional values.

**Core Principle:** The codebase SHALL ALWAYS prefer type-level solutions over runtime validation when possible. Type-level mechanisms (utility types, mapped types, assertion functions) have zero runtime overhead and provide compile-time guarantees. Runtime checks SHALL only be used when type-level solutions are not feasible.

**Priority Order:**
1. Type-level solutions first (utility types, mapped types, conditional types)
2. Assertion functions for runtime validation that must happen
3. Runtime checks last (only when type-level solutions are not possible)

#### Scenario: Array iteration with undefined handling
- **WHEN** iterating over arrays with potential undefined values
- **THEN** code SHALL use array methods (`every()`, `some()`, `filter()`, `slice()`) that handle undefined naturally
- **AND** code SHALL avoid verbose `for...in` loops with explicit undefined checks
- **AND** code SHALL prefer declarative array methods over imperative loops

#### Scenario: Array index access with validated bounds
- **WHEN** accessing array elements where bounds can be validated
- **THEN** code SHALL validate bounds upfront at function start or construction
- **AND** code SHALL use non-null assertions (`!`) after validation
- **AND** code SHALL avoid redundant undefined checks after validation
- **AND** code SHALL use `at()` method with nullish coalescing for safe access when bounds are unknown

#### Scenario: Optional values with defaults
- **WHEN** handling optional values that need default values
- **THEN** code SHALL use nullish coalescing (`??`) operator
- **AND** code SHALL avoid explicit `if (x === undefined)` checks for defaults
- **AND** code SHALL use `??=` for assignment defaults when appropriate

#### Scenario: Known data structure validation
- **WHEN** working with data structures where keys/indices are known at construction or initialization
- **THEN** code SHALL validate structure at construction or function entry
- **AND** code SHALL use safe non-null assertions after validation
- **AND** code SHALL avoid repeated validation checks throughout the code
- **AND** validation errors SHALL provide clear, actionable error messages

#### Scenario: Early validation and fail-fast
- **WHEN** functions have preconditions that must be met
- **THEN** code SHALL validate preconditions at function start
- **AND** code SHALL fail fast with clear error messages
- **AND** code SHALL avoid nested validation checks throughout the function body
- **AND** validation SHALL occur before any computation or side effects

#### Scenario: Type guard helpers for repeated patterns
- **WHEN** the same validation pattern appears multiple times across the codebase
- **THEN** code SHALL extract validation into reusable type guard helper functions
- **AND** helpers SHALL use TypeScript assertion functions for proper type narrowing
- **AND** helpers SHALL provide clear error messages

#### Scenario: Optional chaining for nested access
- **WHEN** accessing nested optional properties or array elements
- **THEN** code SHALL use optional chaining (`?.`) and nullish coalescing (`??`) operators
- **AND** code SHALL avoid nested `if` statements for optional access
- **AND** code SHALL combine `?.` with `??` for default values

#### Scenario: Direct iteration over indexed access
- **WHEN** iterating over arrays or objects with indices
- **THEN** code SHALL use `for...of` with indices or `entries()` method
- **AND** code SHALL avoid `for...in` loops with `Number()` conversion
- **AND** code SHALL prefer array methods (`map()`, `forEach()`, etc.) when appropriate

#### Scenario: Type-level utility types for non-nullable types (PREFERRED)
- **WHEN** function return types or variable types can exclude undefined/null at the type level
- **THEN** code SHALL use `NonNullable<T>` to express non-nullable types
- **AND** code SHALL use `Required<T>` or `Required<Pick<T, K>>` for validated object structures
- **AND** code SHALL use `Exclude<T, undefined>` for array element types after filtering undefined values
- **AND** code SHALL use `Extract<T, U>` for discriminated union narrowing
- **AND** code SHALL prefer type-level constraints over runtime checks when types can express the constraint
- **AND** code SHALL eliminate runtime undefined checks entirely when using type-level solutions
- **AND** these solutions SHALL have zero runtime overhead

#### Scenario: Mapped types for validated structures (PREFERRED)
- **WHEN** data structures are validated at construction or initialization
- **THEN** code SHALL use mapped types to transform optional types to required types
- **AND** code SHALL create type-level representations of validated structures
- **AND** code SHALL use conditional types to express validation state in types
- **AND** type transformations SHALL reflect the validation state accurately
- **AND** validated structures SHALL be stored with transformed types to eliminate runtime checks
- **AND** these solutions SHALL have zero runtime overhead after initial validation

#### Scenario: Assertion functions for type narrowing (PREFERRED)
- **WHEN** validation functions narrow types from `T | undefined` to `T` and validation must happen at runtime
- **THEN** code SHALL use TypeScript assertion functions (`asserts x is T`) for automatic type narrowing
- **AND** assertion functions SHALL provide clear error messages on validation failure
- **AND** assertion functions SHALL be used in constructors and initialization code where appropriate
- **AND** type narrowing SHALL eliminate the need for subsequent undefined checks
- **AND** assertion functions SHALL be preferred over manual type guards when runtime validation is required
