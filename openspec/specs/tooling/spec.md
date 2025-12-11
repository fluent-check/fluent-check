# tooling Specification

## Purpose
TBD - created by archiving change migrate-eslint-flat-config. Update Purpose after archive.
## Requirements
### Requirement: ESLint Flat Config

The project SHALL use ESLint flat config format with typescript-eslint for type-aware linting.

#### Scenario: Lint all source and test files
- **WHEN** `npm run lint` is executed
- **THEN** ESLint SHALL successfully parse and lint all files in `src/` and `test/`
- **AND** exit with code 0 when no violations are present

#### Scenario: Type-aware linting for test files
- **WHEN** ESLint lints files in the `test/` directory
- **THEN** type-aware rules SHALL function correctly using `tsconfig.eslint.json`
- **AND** no "default project" errors SHALL occur regardless of test file count

#### Scenario: Chai assertion support
- **WHEN** test files contain Chai assertion expressions like `expect(x).to.be.true`
- **THEN** ESLint SHALL NOT report `no-unused-expressions` errors
- **AND** the `no-unused-expressions` rule SHALL be disabled for files in the `test/` directory

### Requirement: Type-Only Import Syntax

The codebase SHALL use explicit `import type` syntax for imports that are only used for type annotations.

#### Scenario: Type-only imports marked explicitly
- **WHEN** a module imports symbols used only as types
- **THEN** the import SHALL use `import type { ... }` syntax

#### Scenario: Mixed imports use inline type modifier
- **WHEN** a module imports both runtime values and type-only symbols
- **THEN** the import SHALL use inline `type` modifier: `import { value, type TypeOnly } from '...'`

#### Scenario: Bundler tree-shaking optimization
- **WHEN** the codebase is bundled
- **THEN** type-only imports SHALL be completely elided from the output
- **AND** no runtime dependencies on type-only modules SHALL exist

### Requirement: Explicit Override Keyword

All methods that override parent class methods SHALL use the explicit `override` keyword.

#### Scenario: Override keyword on subclass methods
- **WHEN** a class method overrides a parent method
- **THEN** the method SHALL be marked with the `override` keyword

#### Scenario: Compiler enforcement enabled
- **WHEN** `noImplicitOverride: true` is set in tsconfig
- **THEN** TypeScript SHALL error if `override` keyword is missing on overriding methods
- **AND** TypeScript SHALL error if `override` is used on non-overriding methods

#### Scenario: Safe refactoring of parent classes
- **WHEN** a parent method is renamed or removed
- **THEN** the compiler SHALL error on child classes with stale `override` declarations
- **AND** accidental method shadowing SHALL be prevented

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

### Requirement: Type-Level Testing Framework

The project SHALL provide a framework for compile-time type-level testing using TypeScript's type system.

#### Scenario: Run type tests via npm script
- **WHEN** `npm run test:types` is executed
- **THEN** TypeScript SHALL compile all `test/types/*.types.ts` files with `--noEmit`
- **AND** exit with code 0 when all type assertions pass
- **AND** exit with non-zero code when any type assertion fails

#### Scenario: Shared type assertion utilities
- **WHEN** a type-level test file needs type assertions
- **THEN** it SHALL import utilities from `test/types/test-utils.types.ts`
- **AND** the utilities SHALL include at minimum: `Expect`, `Equal`, `Extends`

#### Scenario: Type tests included in tsconfig
- **WHEN** type tests are compiled
- **THEN** they SHALL use `tsconfig.types.json` which extends the main `tsconfig.json`
- **AND** include all files matching `test/types/*.types.ts`

### Requirement: CPU Profiling

The system SHALL provide a script to profile CPU usage of the test suite using Node.js V8 profiler.

#### Scenario: Generate CPU profile

- **GIVEN** the test suite is configured and passing
- **WHEN** the developer runs `npm run profile:cpu`
- **THEN** a V8 CPU profile is generated in the `profiles/` directory
- **AND** the profile can be processed to identify top functions by execution time

### Requirement: Memory Profiling

The system SHALL provide a script to profile heap allocations during test suite execution.

#### Scenario: Generate heap profile

- **GIVEN** the test suite is configured and passing
- **WHEN** the developer runs `npm run profile:heap`
- **THEN** a heap profile is generated in the `profiles/` directory
- **AND** the profile can be analyzed to identify allocation hotspots

### Requirement: Flame Graph Generation

The system SHALL support generating flame graph visualizations from CPU profiles.

#### Scenario: Generate flame graph from CPU profile

- **GIVEN** a CPU profile has been generated
- **WHEN** the developer processes the profile with the provided tooling
- **THEN** an interactive HTML flame graph is produced
- **AND** the flame graph visually displays function call stacks and their relative execution times

### Requirement: Performance Baseline Documentation

The system SHALL maintain documentation of performance baselines and identified hotspots.

#### Scenario: Access performance baseline report

- **GIVEN** profiling has been executed against the test suite
- **WHEN** the developer reads `docs/performance/baseline-report.md`
- **THEN** they find documented CPU and memory hotspots with quantified metrics
- **AND** they find ranked optimization opportunities with potential impact

### Requirement: Profile Artifact Isolation

The system SHALL exclude generated profile artifacts from version control.

#### Scenario: Profile files are git-ignored

- **GIVEN** profiling scripts generate artifacts in the `profiles/` directory
- **WHEN** the developer runs `git status`
- **THEN** profile files (`.cpuprofile`, `.heapprofile`, `isolate-*.log`) are not listed as untracked

### Requirement: Native Private Fields

Class fields requiring true runtime privacy SHALL use ES2022 native private fields (`#field`) instead of TypeScript's `private` keyword.

#### Scenario: Private field syntax
- **WHEN** a class field requires encapsulation
- **THEN** the field SHALL use `#` prefix syntax
- **AND** internal references SHALL use `this.#field` syntax

#### Scenario: Runtime privacy enforcement
- **WHEN** external code attempts to access private fields
- **THEN** access SHALL be blocked at runtime (not just compile-time)
- **AND** type assertions SHALL not bypass privacy

#### Scenario: TypeScript private for protected-like access
- **WHEN** subclass access to a parent field is required
- **THEN** the TypeScript `private` keyword MAY be retained
- **AND** the design decision SHALL be documented in code comments

### Requirement: Full TypeScript Strict Mode

The project SHALL enable full TypeScript strict mode for maximum type safety.

#### Scenario: Strict mode enabled
- **WHEN** TypeScript compiles the project
- **THEN** `strict: true` SHALL be set in tsconfig.json
- **AND** all individual strict flags SHALL be implicitly enabled

#### Scenario: Unchecked index access protection
- **WHEN** `noUncheckedIndexedAccess: true` is enabled
- **THEN** array/object index access SHALL return `T | undefined`
- **AND** code SHALL handle potential undefined values explicitly

#### Scenario: Exact optional property types
- **WHEN** `exactOptionalPropertyTypes: true` is enabled
- **THEN** TypeScript SHALL distinguish between `undefined` values and missing properties
- **AND** explicit `undefined` assignment to optional properties SHALL require the type to include `undefined`

#### Scenario: Property access from index signatures
- **WHEN** `noPropertyAccessFromIndexSignature: true` is enabled
- **THEN** bracket notation SHALL be required for index signature access
- **AND** dot notation SHALL only work for explicitly declared properties

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

