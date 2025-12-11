# Change: Extract Scenario AST from FluentCheck

> **GitHub Issue:** [#504](https://github.com/fluent-check/fluent-check/issues/504)

## Why

The current `FluentCheck` class conflates two concerns: building test scenarios (the fluent API) and executing them. This makes it difficult to implement alternative execution strategies. By extracting the scenario as a pure data structure (AST), we enable:

1. Clean separation of scenario definition from execution
2. Multiple execution strategies that interpret the same scenario differently
3. Better testability - scenarios can be inspected and validated independently
4. Foundation for holistic strategies that analyze the full scenario before execution

## What Changes

- **NEW**: `Scenario<Rec>` interface representing an immutable AST of quantifiers, predicates, and filters
- **NEW**: `ScenarioNode` discriminated union type for different node types (forall, exists, given, then)
- **NEW**: `buildScenario()` method on FluentCheck that extracts scenario data
- **MODIFIED**: `FluentCheck.check()` delegates to a checker with the scenario, rather than executing directly
- Existing behavior preserved - this is a pure refactoring

## Impact

- Affected specs: `strategies`, `fluent-api`
- Affected code: `src/FluentCheck.ts`, new `src/Scenario.ts`
- No breaking changes to public API
- Foundation for subsequent Explorer/Sampler/Shrinker extraction
