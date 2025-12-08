## 1. Execution Context and Config Resolution

- [x] 1.1 Define an internal `ExecutionConfig` type that captures strategy factory and RNG settings.
- [x] 1.2 Implement an `ExecutionContext<Rec>` (or equivalent helper functions) responsible for:
  - [x] 1.2.1 Building a `FluentStrategy` instance.
  - [x] 1.2.2 Initializing a `FluentRandomGenerator` with optional seed.
  - [x] 1.2.3 Registering quantifier arbitraries in the strategy.

## 2. Decouple FluentCheck Nodes from Live Strategy

- [x] 2.1 Remove the `strategy` field from `FluentCheck` nodes as a constructor-only dependency; move it to execution-time.
- [x] 2.2 Update `FluentCheck` constructor to store only:
  - [x] 2.2.1 Parent pointer.
  - [x] 2.2.2 Node-specific data (e.g. quantifier name/arbitrary, given factory/value, when/then functions).
- [x] 2.3 Refactor `.config(strategyFactory)` to store the factory on the node, not build a strategy immediately.
- [x] 2.4 Refactor `.withGenerator(rngBuilder, seed)` to store RNG configuration on the node.

## 3. Quantifier Node Refactor

- [x] 3.1 Change `FluentCheckQuantifier` constructor to no longer accept a `FluentStrategy` instance.
- [x] 3.2 Add a method (or fields) on quantifier nodes exposing their `(name, arbitrary, kind)` for registration.
- [x] 3.3 Move the quantifier loop (`configArbitrary`, `hasInput`, `getInput`, shrinking) into a method that accepts a `FluentStrategy` and RNG at execution time.
- [x] 3.4 Ensure `forall` and `exists` still refine `Rec` as `Rec & Record<K, A>` and maintain existing type inference.

## 4. Rewrite check() to Drive Execution

- [x] 4.1 Update `FluentCheck.check()` to:
  - [x] 4.1.1 Resolve the final strategy factory and RNG config from `pathFromRoot()`.
  - [x] 4.1.2 Build a concrete `FluentStrategy` and `FluentRandomGenerator`.
  - [x] 4.1.3 Register all quantifiers with the strategy before execution.
- [x] 4.2 Replace the old `run(...)` pattern with an `execute(context, testCase)`-style traversal that passes the strategy/RNG explicitly.
- [x] 4.3 Preserve `FluentResult<Rec>` behaviour (examples, seeds, skipped counter) exactly as before.

## 5. Strategy and Mixins Alignment

- [x] 5.1 Verify that `FluentStrategy` and its mixins (`Random`, `Shrinkable`, `Cached`, `Biased`, `Dedupable`) do not assume a builder-time lifecycle.
- [x] 5.2 Ensure that calling `registerQuantifiers` before execution produces the same internal arbitrary state as the old constructor-based `addArbitrary` path.
- [x] 5.3 Confirm that presets in `src/strategies/presets.ts` still work unchanged with the new lazy execution model.

## 6. Documentation and Specs

- [x] 6.1 Update `docs/customizable-strategies.md` to describe the new “lazy strategy” execution model (strategy built in `check()`).
- [x] 6.2 Add or update a delta in `specs/strategies/spec.md` (or an appropriate strategies spec) clarifying:
  - [x] 6.2.1 Strategies are instantiated at execution time, not during fluent chaining.
  - [x] 6.2.2 Quantifiers register arbitraries before execution starts.
- [x] 6.3 Optionally document the internal execution context in a research note if helpful (`docs/research/...`).

## 7. Verification

- [x] 7.1 Run `npm run test:types` to ensure type-level correctness.
- [x] 7.2 Run `npm test` to validate runtime behaviour and shrinking.
- [x] 7.3 Run `npm run lint` to ensure no new lint issues.
- [x] 7.4 Manually review a few representative scenarios:
  - [x] 7.4.1 `scenario().forall(...).then(...).check()`
  - [x] 7.4.2 Combined `given` + `forall` + `exists`.
  - [x] 7.4.3 `prop().config(fc.strategies.*).assert()`
