## MODIFIED Requirements

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
