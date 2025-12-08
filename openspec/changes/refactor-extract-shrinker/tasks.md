# Tasks: Extract Shrinker Interface

## 1. Define Shrinker Types

- [ ] 1.1 Create `src/strategies/Shrinker.ts`
- [ ] 1.2 Define `Shrinker<Rec>` interface with `shrink()` method
- [ ] 1.3 Define `ShrinkBudget` type (maxAttempts, maxRounds)
- [ ] 1.4 Define `ShrinkResult<Rec>` type (shrunk value, attempts, rounds)

## 2. Implement PerArbitraryShrinker

- [ ] 2.1 Extract shrinking logic from `Shrinkable` mixin
- [ ] 2.2 Implement per-quantifier shrinking (current behavior)
- [ ] 2.3 Use arbitrary's `shrink()` method for candidates
- [ ] 2.4 Re-run property to verify shrunk value still fails
- [ ] 2.5 Respect budget limits

## 3. Implement NoOpShrinker

- [ ] 3.1 Create shrinker that returns counterexample unchanged
- [ ] 3.2 Use when shrinking is disabled

## 4. Integrate with PropertyChecker

- [ ] 4.1 Add shrinker configuration to checker
- [ ] 4.2 Call shrinker after explorer finds counterexample
- [ ] 4.3 Return shrunk result in FluentResult

## 5. Update FluentStrategyFactory

- [ ] 5.1 Modify `withShrinking(size?)` to configure PerArbitraryShrinker
- [ ] 5.2 Add `withoutShrinking()` to configure NoOpShrinker
- [ ] 5.3 Add `withPerArbitraryShrinking()` explicit method

## 6. Maintain Backward Compatibility

- [ ] 6.1 Keep `Shrinkable` mixin functional (delegate to Shrinker)
- [ ] 6.2 Preserve `shrinkSize` configuration behavior

## 7. Testing

- [ ] 7.1 Add unit tests for PerArbitraryShrinker
- [ ] 7.2 Test shrink budget is respected
- [ ] 7.3 Test NoOpShrinker returns unchanged
- [ ] 7.4 Verify existing shrinking tests pass

## 8. Documentation

- [ ] 8.1 Add JSDoc to Shrinker interface
- [ ] 8.2 Document ShrinkResult fields
