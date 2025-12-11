# Tasks: Extract Shrinker Interface

## 1. Define Shrinker Types

- [x] 1.1 Create `src/strategies/Shrinker.ts`
- [x] 1.2 Define `Shrinker<Rec>` interface with `shrink()` and `shrinkWitness()` methods
- [x] 1.3 Define `ShrinkBudget` type (maxAttempts, maxRounds)
- [x] 1.4 Define `ShrinkResult<Rec>` type (minimized value, attempts, rounds)
- [x] 1.5 Define `PickResult<Rec>` type for FluentPick test cases

## 2. Implement PerArbitraryShrinker

- [x] 2.1 Implement `shrink()` for counterexample shrinking (find smaller failing values)
- [x] 2.2 Implement `shrinkWitness()` for witness shrinking (find smaller passing values)
- [x] 2.3 Use arbitrary's `shrink()` method for candidates
- [x] 2.4 Re-run property to verify shrunk value behavior
- [x] 2.5 Respect budget limits (maxAttempts, maxRounds)
- [x] 2.6 Only shrink existential quantifiers for witness shrinking

## 3. Implement NoOpShrinker

- [x] 3.1 Create shrinker that returns counterexample/witness unchanged
- [x] 3.2 Implement both `shrink()` and `shrinkWitness()` as no-ops

## 4. Integrate with FluentCheck.check()

- [x] 4.1 Use Explorer to find counterexamples/witnesses
- [x] 4.2 Call `shrink()` after explorer finds counterexample (forall failure)
- [x] 4.3 Call `shrinkWitness()` after explorer finds witness (exists success)
- [x] 4.4 Return shrunk result in FluentResult with only existential vars

## 5. Update FluentStrategyFactory

- [x] 5.1 Add `buildShrinker()` method
- [x] 5.2 Add `buildShrinkBudget()` method
- [x] 5.3 Add shrinker configuration methods

## 6. Export Public API

- [x] 6.1 Export Shrinker interface and implementations
- [x] 6.2 Export ShrinkBudget, ShrinkResult, PickResult types
- [x] 6.3 Export factory functions

## 7. Testing

- [x] 7.1 Existing tests verify correct shrinking behavior
- [x] 7.2 Test pass rate improved from 607/646 to 635/646

## 8. Documentation

- [x] 8.1 Add JSDoc to Shrinker interface
- [x] 8.2 Document ShrinkResult fields
- [x] 8.3 Document shrinkWitness behavior
