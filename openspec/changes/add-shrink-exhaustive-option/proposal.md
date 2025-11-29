# Change: Add Configurable Shrink Search Strategy

> **GitHub Issue:** [#455](https://github.com/fluent-check/fluent-check/issues/455)

## Why

Currently, FluentCheck's shrinking uses a fixed sampling-based approach. For some use cases, users need different search strategies:

1. **Best-effort (default)**: Sample shrink candidates, may miss optimal minimum
2. **Bounded exhaustive**: Try all candidates up to a limit, guaranteed optimal within bound
3. **Heuristic-driven**: Use arbitrary's `size()` estimate to choose strategy automatically

Issue [#18](https://github.com/fluent-check/fluent-check/issues/18) documents a case where the default strategy cannot find the expected minimal counterexample due to the improbability of hitting the exact value.

## What Changes

- **Add `withShrinkStrategy()` configuration** to strategy builder
- **Implement multiple shrink strategies**: `'best-effort'`, `'exhaustive'`, `'auto'`
- **Add `withExhaustiveShrinkThreshold()` for heuristic switching**
- **Use `size()` estimates** to make intelligent strategy decisions

### API Design

```typescript
// Best-effort (current default behavior)
fc.scenario()
  .config(fc.strategy()
    .withShrinkStrategy('best-effort'))
  .forall('x', fc.integer())
  .then(({x}) => x > 0)
  .check()

// Exhaustive within small domains
fc.scenario()
  .config(fc.strategy()
    .withShrinkStrategy('exhaustive')
    .withShrinking(1000))  // Max 1000 candidates
  .forall('x', fc.integer(0, 100))
  .then(({x}) => x !== 42)
  .check()

// Auto-select based on size estimate
fc.scenario()
  .config(fc.strategy()
    .withShrinkStrategy('auto')
    .withExhaustiveShrinkThreshold(100))  // Use exhaustive if size() < 100
  .forall('x', fc.integer(0, 50))
  .then(({x}) => x !== 25)
  .check()
```

### Strategy Behaviors

| Strategy | Behavior |
|----------|----------|
| `'best-effort'` | Sample candidates randomly/heuristically, may miss optimal |
| `'exhaustive'` | Enumerate all candidates up to `shrinkSize` limit |
| `'auto'` | Choose exhaustive if `size() < threshold`, else best-effort |

## Impact

- **Affected specs**: `specs/strategies/spec.md`, `specs/shrinking/spec.md`
- **Affected code**:
  - `src/strategies/FluentStrategyFactory.ts` - New configuration methods
  - `src/strategies/FluentStrategyMixins.ts` - Strategy dispatch logic
- **Breaking change**: No - default behavior unchanged
- **Correlation**: Independent of #452 but complements it

## Complexity Estimate

**Medium Complexity** (1 day)

| Component | Effort | Notes |
|-----------|--------|-------|
| Strategy configuration API | Low | Builder methods |
| Exhaustive shrink implementation | Medium | Enumerate all candidates |
| Auto-strategy heuristic | Low | Check size() estimate |
| Test updates | Medium | Test all strategy modes |

## Success Criteria

1. `'best-effort'` behaves exactly as current implementation
2. `'exhaustive'` finds guaranteed-optimal minimum within configured limit
3. `'auto'` correctly switches based on size estimate
4. Issue #18 use case is solvable with exhaustive strategy

## Related Issues

- [#18](https://github.com/fluent-check/fluent-check/issues/18) - Original question: exhaustive search by default?
- [#452](https://github.com/fluent-check/fluent-check/issues/452) - Parent: Shrinking performance improvements
- [#10](https://github.com/fluent-check/fluent-check/issues/10) - Exhaustive generation for small arbitraries (related concept)

## Independence

This proposal is **independent** of other shrinking proposals:
- Works with current or generator-based shrink implementation
- Orthogonal to binary search or interleaving optimizations
- Provides user control over shrinking behavior
