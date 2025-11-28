# Tooling

## ADDED Requirements

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
