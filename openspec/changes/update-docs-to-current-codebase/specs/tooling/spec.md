## ADDED Requirements

### Requirement: Documentation Consistency

Project documentation (including `README.md` and `docs/`) SHALL reflect the current public API, runtime support, and CI/workflow configuration.

#### Scenario: Public API docs match implementation
- **WHEN** a developer reads public API documentation (`README.md`, `docs/fluent-api.md`)
- **THEN** all referenced APIs SHALL exist in the current package exports
- **AND** signatures and key behavioral notes SHALL match the current implementation

#### Scenario: Runtime support claims are consistent
- **WHEN** Node.js version support is stated in documentation
- **THEN** it SHALL be consistent with `package.json` `engines.node` and the Node.js versions used in CI workflows

### Requirement: Architecture Diagrams for Complex Interactions

Documentation SHALL include Mermaid diagrams that explain the highest-complexity runtime interactions (execution orchestration, shrinking, and strategy configuration).

#### Scenario: Check orchestration diagram
- **WHEN** a developer reads the documentation for executing scenarios
- **THEN** they SHALL find a Mermaid diagram describing the `check()` pipeline (Scenario → exploration → shrinking → statistics aggregation → reporting)

#### Scenario: Shrinking diagram
- **WHEN** a developer reads shrinking documentation
- **THEN** they SHALL find a Mermaid diagram describing counterexample shrinking and existential witness shrinking, including where the `Shrinker` is invoked
