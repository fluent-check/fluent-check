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

