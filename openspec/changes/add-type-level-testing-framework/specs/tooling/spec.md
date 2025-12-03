## ADDED Requirements

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
