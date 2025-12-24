# Change: Update Documentation to Match Current Codebase

> **GitHub Issue:** TBD

## Why

Documentation in `docs/` and `README.md` has drifted from the current implementation:

- Some pages describe APIs or behaviors that no longer exist (or omit newer APIs).
- Several internals/architecture notes still describe the pre-`Scenario`/`runCheck()` architecture (strategy-on-nodes, mixin shrinking).
- CI/workflow documentation is incomplete (Gemini workflows) and runtime support claims are inconsistent across docs/CI/`package.json`.
- Some research/pattern notes contain brittle file/line references that are no longer stable.
- The docs lack diagrams for the most complex interactions (execution orchestration, shrinking, strategy configuration).

This proposal tracks the remaining documentation work to make the docs a reliable guide for the current release.

## What Changes

## Current Status (Already Landed)

The following doc fixes already exist in `docs/` and should be treated as completed unless new mismatches are found:

- `docs/fluent-api.md`: scenario-level `.map(...)` removed; `checkWithConfidence(...)` documented.
- `docs/given-when-then.md`: scenario-level `.map(...)` guidance removed.
- `docs/statistical-confidence.md`: `checkWithConfidence(level, options?: CheckOptions)` documented.
- `docs/customizable-strategies.md`: strategy APIs expanded (including confidence controls and shrinking toggles).
- `docs/quantifiers.md`: updated to match Scenario/Explorer/Shrinker architecture and current test references.

### 1) Public API docs (README + core guides)

- Update `README.md` and `docs/fluent-api.md` to reflect `fc.prop(...arbitraries, predicate)` as variadic (no hard-coded arity limit).
- Ensure `checkWithConfidence(level, options?)` is documented consistently across `docs/` (2nd arg is `CheckOptions`).
- Remove or rewrite any remaining references to a scenario-level `.map(...)` (scenario transformation happens via `given(...)`; value transformation via `Arbitrary.map()`).
- Ensure strategy configuration documentation covers current `FluentStrategyFactory` APIs (shrinking toggles, confidence controls, etc).

### 2) Internals/architecture docs rewrite (current engine model)

- Rewrite `docs/chained-type-inference.md` to match the current architecture:
  - Scenario builder → `Scenario` AST (`buildScenario()`)
  - Execution via `runCheck()` and engine components (Explorer, Sampler, Shrinker, Aggregator)
  - Current `FluentResult` shape (includes `statistics`)
  - Remove the obsolete “strategy-on-nodes” model and stale code excerpts.
- Rewrite `docs/smart-shrinking.md` to reflect the current `Shrinker` model (not mixins), including witness shrinking for `exists`.
- Handle `docs/pr-415-specs-summary.md` (now obsolete): remove or clearly mark historical, and replace with pointers to the authoritative OpenSpec specs.

### 3) CI/workflow docs + runtime support alignment

- Update `docs/actions.md` to reflect the complete `.github/workflows/*` surface, including Gemini workflows and their triggers.
- Resolve the Node support mismatch across:
  - `README.md` requirements
  - `package.json` `engines.node`
  - CI matrices and publish workflows (`.github/workflows/*.yml`)
  - Any docs that mention Node versions (e.g. `docs/performance/*`)

### 4) Evidence + research/pattern docs hygiene

- Update `docs/evidence/README.md` to accurately reflect the studies and artifacts present in `docs/evidence/raw/` and `docs/evidence/figures/` (including composition).
- For research/pattern docs with stale file/line references, either:
  - refresh the references, or
  - label the content as historical and remove brittle line numbers.

### 5) Example correctness (arbitraries, corner cases)

- Update `docs/corner-case-prioritization.md` to match the actual behavior of `ArbitraryInteger.cornerCases()` (ordering and the set of returned corner cases).

### 6) Add missing Mermaid diagrams

Add diagrams where they reduce cognitive load for new contributors:

- `check()` orchestration: Scenario → `runCheck()` → exploration → shrinking → aggregation → reporting.
- Shrinking flow: counterexample shrinking vs existential witness shrinking.
- Strategy configuration resolution: chain config + factory presets + RNG settings → execution components.

Recommended placements:

- Add `check()` orchestration diagram to `docs/fluent-api.md` (or `docs/reporting.md` if it fits better).
- Add shrinking diagram to `docs/smart-shrinking.md`.
- Add strategy configuration diagram to `docs/customizable-strategies.md`.

## Impact

- **Docs only** for most items, but runtime alignment may require updating:
  - `package.json` (`engines.node`)
  - `.github/workflows/*.yml` (if aligning CI/publish Node versions)
- No intended behavioral changes to the library API; this is documentation + metadata alignment.

## Acceptance Criteria

1. `README.md` and `docs/` no longer claim removed APIs/behaviors (e.g., scenario-level `.map(...)`, outdated shrinking internals).
2. All documented public APIs exist in the current exports, and signatures match the implementation (notably `fc.prop` and `checkWithConfidence`).
3. `docs/actions.md` matches the actual workflows in `.github/workflows/` (including Gemini workflows).
4. Node support claims are consistent across docs, CI, and `package.json`.
5. At least two Mermaid diagrams are added to explain core execution/shrinking interactions.
