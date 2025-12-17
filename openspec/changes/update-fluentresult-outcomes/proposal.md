# Change: Update FluentResult outcomes for budget exhaustion

> **GitHub Issue:** [#513](https://github.com/fluent-check/fluent-check/issues/513)

## Why
- Budget exhaustion currently produces a failing `FluentResult` even when no counterexample exists for universal-only scenarios, misreporting properties as unsatisfiable.
- Lack of completion metadata prevents callers from distinguishing true failures from inconclusive runs or skipped/limited executions.
- Assertion and reporter behavior do not communicate when results are incomplete or witness-less due to exhausted budgets.

## What Changes
- Enrich `FluentResult` with explicit completion/outcome metadata (e.g., complete vs exhausted, reason, tests run, budget context) while keeping `satisfiable` for backward compatibility.
- Define `.check()`/explorer-to-result mapping so universal-only properties with exhausted budgets remain satisfiable but marked incomplete, and existential scenarios with no witness are flagged as exhausted/unsatisfied rather than counterexample failures.
- Update assertion/reporting semantics (`expect`, FluentResult assertions, reporter messages) to honor completion state, differentiating counterexamples from no-witness or incomplete runs.

## Impact
- Affected specs: `reporting`, `fluent-api`
- Affected code: `FluentCheck`, `FluentResult`, `FluentReporter`, explorer budget handling, related tests/docs
- Breaking change: No (adds metadata and clarifies semantics; keeps `satisfiable` behavior consistent for existing counterexample paths)
