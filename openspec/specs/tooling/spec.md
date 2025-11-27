# tooling Specification

## Purpose
TBD - created by archiving change migrate-eslint-flat-config. Update Purpose after archive.
## Requirements
### Requirement: ESLint Flat Config

The project SHALL use ESLint's flat config format (`eslint.config.js`) for code linting configuration.

#### Scenario: Lint command executes successfully

- **GIVEN** the project has an `eslint.config.js` file
- **WHEN** the developer runs `npm run lint`
- **THEN** ESLint executes and reports any code style violations
- **AND** the command exits with code 0 if no errors are found

#### Scenario: TypeScript files are linted with type-aware rules

- **GIVEN** the ESLint configuration includes `typescript-eslint` parser and plugin
- **WHEN** the developer runs `npm run lint`
- **THEN** TypeScript files in `src/` and `test/` directories are analyzed
- **AND** type-aware rules (e.g., `strict-boolean-expressions`) are enforced

#### Scenario: Code style rules are enforced

- **GIVEN** the ESLint configuration defines code style rules
- **WHEN** the developer runs `npm run lint`
- **THEN** code style violations are reported (indentation, quotes, semicolons, spacing)
- **AND** the rules match the project conventions documented in `openspec/project.md`

