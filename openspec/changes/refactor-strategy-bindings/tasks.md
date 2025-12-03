## 1. Design and Type Definitions

- [ ] 1.1 Define `StrategyBindings = Record<string, unknown>` in `FluentStrategyTypes`
- [ ] 1.2 Make `StrategyArbitraries` generic: `{ [K in keyof B]: FluentStrategyArbitrary<B[K]> }`
- [ ] 1.3 Make `FluentStrategy` generic over `B extends StrategyBindings`
- [ ] 1.4 Define/update `FluentStrategyInterface<B>` to reflect typed `hasInput`/`getInput`

## 2. Wire Bindings Through Strategy Implementation

- [ ] 2.1 Update `FluentStrategy` to hold `StrategyArbitraries<B>` instead of `Record<string, …>`
- [ ] 2.2 Implement `getArbitraryState<K extends keyof B>(name)` returning `FluentStrategyArbitrary<B[K]>`
- [ ] 2.3 Update `hasInput`/`getInput` to use `K extends keyof B` and `FluentPick<B[K]>`
- [ ] 2.4 Ensure public API shape and runtime behavior remain unchanged

## 3. Update Strategy Mixins

- [ ] 3.1 Update `Random` mixin to use `getArbitraryState<K extends keyof B>` and `FluentPick<B[K]>`
- [ ] 3.2 Update `Shrinkable` mixin to shrink with `FluentPick<B[K]>` for each name
- [ ] 3.3 Update `Cached` mixin to cache using typed `B[K]`
- [ ] 3.4 Update `Biased` mixin signatures to align with generic `FluentStrategy<B>`
- [ ] 3.5 Run type tests to ensure mixins compose correctly

## 4. Thread Bindings Through FluentCheck

- [ ] 4.1 Add `Binds extends StrategyBindings` type parameter to `FluentCheck`
- [ ] 4.2 Update `fc.scenario()` to construct `FluentCheck<{}, {}, {}>` with empty bindings
- [ ] 4.3 Update `forall`/`exists` to refine both `Rec` and `Binds` (`Rec & Record<K, A>`, `Binds & Record<K, A>`)
- [ ] 4.4 Ensure `Rec` and `Binds` remain consistent with existing tests and types
- [ ] 4.5 Run `npm run test:types` to validate no regressions in type-level tests

## 5. Update FluentStrategyFactory and Presets

- [ ] 5.1 Make `FluentStrategyFactory` generic over `B extends StrategyBindings`
- [ ] 5.2 Ensure `.build()` returns `FluentStrategy<B>`
- [ ] 5.3 Update presets (`strategies.default`, `fast`, `thorough`, `minimal`) to propagate bindings generics
- [ ] 5.4 Verify `scenario().config(preset)` continues to compile and behave as before

## 6. Documentation

- [ ] 6.1 Update `docs/customizable-strategies.md` to describe typed strategy bindings
- [ ] 6.2 Add examples showing how quantifiers extend both `Rec` and strategy bindings
- [ ] 6.3 Update `specs/strategies/spec.md` via delta spec to include a requirement for type-safe bindings

## 7. Verification

- [ ] 7.1 Run `npm run test:types` to ensure TypeScript types compile cleanly
- [ ] 7.2 Run `npm test` to verify runtime behavior is unchanged
- [ ] 7.3 Run `npm run lint` to ensure no new lint issues are introduced
- [ ] 7.4 Confirm no public API changes are required for existing user code

