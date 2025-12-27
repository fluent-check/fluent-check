# Spec Change: Add Shrinking Strategy Configuration

## Affected Spec

`openspec/specs/strategies/spec.md` - Strategy Factory requirements

## Motivation

**Problem**: Study 14 (Shrinking Fairness) revealed that FluentCheck's current shrinking algorithm exhibits significant bias toward the first quantifier. For symmetric properties like `forall(a, b, c: int(0,100)).then(a + b + c <= 150)`, the shrunken counterexample depends arbitrarily on quantifier order rather than mathematical structure:
- `forall(a,b,c)` → shrinks to `(0, 52, 98)`
- `forall(c,b,a)` → shrinks to `(98, 52, 0)`

This violates user expectations and makes debugging harder. The root cause is the Sequential Exhaustive algorithm that restarts from the first quantifier after any successful shrink.

**Solution**: Implement configurable shrinking strategies using the Strategy Pattern, allowing users to choose between:
1. **Round-Robin** (recommended) — Fair shrinking that tries all quantifiers per round
2. **Sequential Exhaustive** (legacy) — Current behavior for backwards compatibility
3. **Delta Debugging** (future) — Maximum quality via subset testing

See `docs/research/fair-shrinking-strategies.md` for detailed analysis.

## Changes to Spec

### New Requirement: Shrinking Strategy Configuration

Add the following requirement to `openspec/specs/strategies/spec.md`:

---

### Requirement: Shrinking Strategy Configuration

The system SHALL provide `withShrinkingStrategy(strategy)` to configure the shrinking algorithm.

#### Scenario: Configure round-robin shrinking
- **WHEN** `.withShrinkingStrategy('round-robin')` is called
- **THEN** the shrinker SHALL try all quantifiers once per round
- **AND** no quantifier is prioritized over others
- **AND** symmetric properties produce balanced counterexamples

#### Scenario: Configure sequential exhaustive shrinking (legacy)
- **WHEN** `.withShrinkingStrategy('sequential-exhaustive')` is called
- **THEN** the shrinker SHALL minimize the first quantifier to its extreme before shrinking subsequent quantifiers
- **AND** behavior matches the legacy shrinking algorithm

#### Scenario: Default shrinking strategy
- **WHEN** no shrinking strategy is configured
- **THEN** round-robin strategy SHALL be used by default
- **AND** legacy behavior is available via explicit configuration

#### Scenario: Shrinking strategy affects fairness
- **GIVEN** a symmetric property `forall(a, b, c: int(0,100)).then(a + b + c <= 150)`
- **WHEN** tested with round-robin strategy
- **THEN** quantifier order SHOULD NOT significantly affect the shrunken counterexample
- **AND** variance of final values SHOULD be reduced by >50% compared to sequential exhaustive

#### Scenario: Strategy pattern architecture
- **WHEN** implementing shrinking strategies
- **THEN** strategies SHALL be implemented as separate classes implementing `ShrinkRoundStrategy` interface
- **AND** `PerArbitraryShrinker` SHALL accept a strategy via constructor injection
- **AND** strategies SHALL be independently testable

---

## Implementation Requirements

### New Files

1. **`src/strategies/shrinking/ShrinkRoundStrategy.ts`** — Strategy interface
   ```typescript
   export interface ShrinkRoundStrategy {
     shrinkRound(
       quantifiers: readonly ExecutableQuantifier[],
       shrinkQuantifier: (q: ExecutableQuantifier) => boolean,
       budget: ShrinkBudget,
       attempts: number
     ): boolean
   }
   ```

2. **`src/strategies/shrinking/RoundRobinStrategy.ts`** — Fair shrinking implementation
   ```typescript
   export class RoundRobinStrategy implements ShrinkRoundStrategy {
     shrinkRound(/* ... */): boolean {
       let foundSmaller = false
       for (const quantifier of quantifiers) {
         if (attempts >= budget.maxAttempts) break
         if (shrinkQuantifier(quantifier)) {
           foundSmaller = true
           // Continue to next quantifier (no early exit)
         }
       }
       return foundSmaller
     }
   }
   ```

3. **`src/strategies/shrinking/SequentialExhaustiveStrategy.ts`** — Legacy implementation
   ```typescript
   export class SequentialExhaustiveStrategy implements ShrinkRoundStrategy {
     shrinkRound(/* ... */): boolean {
       for (const quantifier of quantifiers) {
         if (attempts >= budget.maxAttempts) break
         if (shrinkQuantifier(quantifier)) {
           return true  // Early exit after first success
         }
       }
       return false
     }
   }
   ```

### Modified Files

4. **`src/strategies/types.ts`** — Add type definition
   ```typescript
   export type ShrinkingStrategy =
     | 'round-robin'           // Fair shrinking (recommended)
     | 'sequential-exhaustive' // Legacy behavior
   ```

5. **`src/strategies/Shrinker.ts`** — Extract template method
   - Modify `PerArbitraryShrinker` to accept `ShrinkRoundStrategy` via constructor
   - Extract shrinking round logic into template method that delegates to strategy
   - Keep all existing logic intact except the for-loop in `#shrinkWithMode`

6. **`src/strategies/FluentStrategyFactory.ts`** — Add configuration method
   ```typescript
   private shrinkingStrategy: ShrinkingStrategy = 'round-robin'

   withShrinkingStrategy(strategy: ShrinkingStrategy) {
     this.shrinkingStrategy = strategy
     return this
   }
   ```

7. **`src/index.ts`** — Export new types
   ```typescript
   export type { ShrinkingStrategy } from './strategies/types.js'
   export type { ShrinkRoundStrategy } from './strategies/shrinking/ShrinkRoundStrategy.js'
   ```

## Testing Requirements

### Unit Tests

1. **`test/shrinking-fairness.test.ts`** — Strategy behavior tests
   - Test round-robin tries all quantifiers per round
   - Test sequential exhaustive exits early after first success
   - Test symmetric property produces balanced results with round-robin
   - Test quantifier order independence with round-robin
   - Test variance reduction compared to sequential exhaustive

2. **`test/shrinking-strategies.test.ts`** — Strategy pattern tests
   - Test `RoundRobinStrategy` in isolation
   - Test `SequentialExhaustiveStrategy` in isolation
   - Test `PerArbitraryShrinker` with different strategies
   - Test factory method `withShrinkingStrategy()`

### Integration Tests

3. Update `test/strategies.test.ts`
   - Test default strategy uses round-robin
   - Test explicit sequential exhaustive configuration
   - Test strategy affects shrinking behavior

### Evidence Tests

4. **Re-run Study 14** with round-robin enabled
   - Verify variance reduction >50%
   - Verify quantifier order independence
   - Update `docs/evidence/README.md` with new results

## Migration Path

### Phase 1: Implementation (Backwards Compatible)
- Default: `'round-robin'` (new fair behavior)
- Legacy: `'sequential-exhaustive'` (opt-in via configuration)
- All existing tests should pass with round-robin (may need shrunk value updates)

### Phase 2: Validation
- Run evidence studies comparing strategies
- Document performance characteristics
- Gather user feedback

### Phase 3: Future Extensions
- Add `'delta-debugging'` strategy for maximum quality
- Deprecate `'sequential-exhaustive'` if round-robin proves superior
- Consider adaptive strategies based on property structure

## Breaking Changes

**Potential breaking change**: Tests that assert exact shrunk counterexample values may fail if they relied on sequential exhaustive behavior.

**Mitigation**:
1. Most tests check property satisfaction, not exact values
2. Tests that depend on exact values can explicitly configure `'sequential-exhaustive'`
3. Document the change in CHANGELOG.md with migration guidance

## Acceptance Criteria

- [ ] `ShrinkingStrategy` type exported from `src/index.ts`
- [ ] `ShrinkRoundStrategy` interface defined
- [ ] `RoundRobinStrategy` and `SequentialExhaustiveStrategy` implemented
- [ ] `FluentStrategyFactory.withShrinkingStrategy()` method added
- [ ] Property `forall(a,b,c: int(0,100)).then(a+b+c <= 150)` produces balanced results with round-robin
- [ ] Variance of final values reduced by >50% compared to sequential exhaustive
- [ ] Quantifier order does not significantly affect shrunk counterexample (round-robin)
- [ ] Performance overhead <10% on average
- [ ] All existing tests pass (with shrunk value updates where needed)
- [ ] Documentation explains fairness and when to use each strategy
- [ ] Study 14 re-run shows improved metrics

## References

- Study 14 (Shrinking Fairness): `docs/evidence/README.md:912-935`
- Detailed strategy analysis: `docs/research/fair-shrinking-strategies.md`
- Implementation tasks: `openspec/changes/improve-shrinking-fairness/tasks.md`
- Current shrinker: `src/strategies/Shrinker.ts:208-279`
