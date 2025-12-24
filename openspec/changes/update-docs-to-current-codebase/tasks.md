# Tasks: Update Documentation to Match Current Codebase

## 1. Public API Documentation

- [x] 1.1 Update `docs/fluent-api.md` to remove scenario-level `.map(...)` and document `checkWithConfidence(...)`
- [x] 1.2 Update `docs/given-when-then.md` to remove scenario-level `.map(...)` guidance
- [x] 1.3 Update `docs/statistical-confidence.md` to document `checkWithConfidence(level, options?: CheckOptions)`
- [x] 1.4 Update `docs/customizable-strategies.md` to include missing strategy APIs (confidence controls, `withoutShrinking()`, etc.)
- [ ] 1.5 Update `README.md` to reflect `fc.prop(...arbitraries, predicate)` as variadic (remove “up to 5”)
- [ ] 1.6 Review `docs/fluent-api.md` for `fc.prop` arity wording and align with implementation

## 2. Internals/Architecture Docs

- [x] 2.1 Update `docs/quantifiers.md` to remove stale test references and reflect Scenario/Explorer/Shrinker model
- [ ] 2.2 Rewrite `docs/chained-type-inference.md` to remove obsolete “strategy-on-nodes” model and outdated `FluentResult` shape
- [ ] 2.3 Rewrite `docs/smart-shrinking.md` to replace “Shrinkable mixin” with current `Shrinker`/`PerArbitraryShrinker` model
- [ ] 2.4 Remove or mark `docs/pr-415-specs-summary.md` as historical, and add pointers to OpenSpec specs

## 3. Examples and Correctness (Arbitraries)

- [ ] 3.1 Update `docs/corner-case-prioritization.md` integer corner-case examples to match `ArbitraryInteger.cornerCases()`

## 4. CI/Workflows + Node Support Alignment

- [ ] 4.1 Update `docs/actions.md` to include Gemini workflows and reflect `.github/workflows/*`
- [ ] 4.2 Decide supported Node versions (docs/CI/`package.json`) and align:
  - [ ] Update `README.md` Node requirements
  - [ ] Update `package.json` `engines.node` (if needed)
  - [ ] Update CI matrices and publish workflows (if needed)
  - [ ] Update any docs that mention Node versions (e.g. `docs/performance/baseline-report.md`)

## 5. Evidence + Research/Patterns Hygiene

- [ ] 5.1 Update `docs/evidence/README.md` to reflect all studies and artifacts present (including composition)
- [ ] 5.2 Audit research docs for stale file/line references; refresh or mark historical:
  - [ ] `docs/research/combinatorial-explosion-analysis.md`
  - [ ] `docs/research/fluent-api-ergonomics/api-catalog.md`
  - [ ] `docs/research/fluent-api-ergonomics/lazy-strategy-execution.md`
- [ ] 5.3 Update `docs/patterns/strict-mode-refactoring-examples.md` to remove brittle file/line references (or mark historical)

## 6. Diagrams

- [ ] 6.1 Add Mermaid diagram for `check()` orchestration and component interactions
- [ ] 6.2 Add Mermaid diagram for shrinking (counterexample vs witness) and where `Shrinker` fits
- [ ] 6.3 Add Mermaid diagram for strategy configuration resolution (factory/presets/RNG → engine components)
