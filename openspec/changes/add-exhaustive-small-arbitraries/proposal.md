# Change: Add Exhaustive Generation for Small Arbitraries

> **GitHub Issue:** [#457](https://github.com/fluent-check/fluent-check/issues/457)

## Why

For arbitraries with small domains (e.g., `fc.integer(-10, 10)` with 21 possible values), exhaustive enumeration provides:

1. **Consistent results**: Same test outcome every run, no flaky tests
2. **Higher confidence**: 100% coverage of the domain, not statistical sampling
3. **Better performance**: No wasted duplicate samples
4. **Simpler reasoning**: Deterministic behavior easier to debug

Issue [#10](https://github.com/fluent-check/fluent-check/issues/10) proposed this optimization when `size()` estimates indicate a small domain.

## What Changes

- **Add `enumerate()` method** to arbitraries that can exhaustively list values
- **Auto-detect small domains** using `size()` estimate
- **Configure threshold** for when to switch from sampling to enumeration
- **Support mapped/filtered** arbitraries (enumeration still valid)

### API Design

```typescript
// Explicit enumeration request
fc.scenario()
  .config(fc.strategy().withExhaustive(true))
  .forall('x', fc.integer(-5, 5))
  .then(({x}) => x * x >= 0)
  .check()

// Auto-enumeration based on size
fc.scenario()
  .config(fc.strategy()
    .withExhaustiveThreshold(100))  // Enumerate if size() <= 100
  .forall('x', fc.boolean())
  .then(({x}) => typeof x === 'boolean')
  .check()

// Manual enumeration via arbitrary
const allValues = fc.integer(0, 10).enumerate()  // [0, 1, 2, ..., 10]
```

### Affected Arbitraries

| Arbitrary | Enumerable | Notes |
|-----------|------------|-------|
| `integer(a, b)` | Yes | When `b - a + 1 <= threshold` |
| `boolean()` | Yes | Always (size = 2) |
| `constant(v)` | Yes | Always (size = 1) |
| `oneOf(...)` | Yes | When all options enumerable |
| `tuple(...)` | Conditional | Product of component sizes |
| `array(...)` | Conditional | Complex, may exceed threshold |
| `string()` | No | Unbounded domain |

### Behavior Changes

```typescript
// Current: samples randomly, may miss edge cases
fc.forall('x', fc.integer(0, 3))
  .then(({x}) => x !== 2)
  .check()
// Result: May pass (didn't sample 2) or fail (did sample 2)

// With exhaustive: deterministic failure
fc.scenario()
  .config(fc.strategy().withExhaustive(true))
  .forall('x', fc.integer(0, 3))
  .then(({x}) => x !== 2)
  .check()
// Result: Always fails with counterexample { x: 2 }
```

## Impact

- **Affected specs**: `specs/strategies/spec.md`, `specs/arbitraries/spec.md`
- **Affected code**:
  - `src/arbitraries/Arbitrary.ts` - Add `enumerate()` method
  - `src/arbitraries/ArbitraryInteger.ts` - Implement enumeration
  - `src/arbitraries/ArbitraryBoolean.ts` - Implement enumeration
  - `src/strategies/FluentStrategyFactory.ts` - Add configuration
  - `src/strategies/FluentStrategy.ts` - Use enumeration when appropriate
- **Breaking change**: No - opt-in feature, default behavior unchanged

## Complexity Estimate

**Medium Complexity** (1-2 days)

| Component | Effort | Notes |
|-----------|--------|-------|
| Base `enumerate()` method | Low | Abstract method on Arbitrary |
| Primitive implementations | Low | Integer, boolean, constant |
| Composite implementations | Medium | Tuple, oneOf (cross product) |
| Strategy integration | Medium | Auto-detection and switching |
| Test updates | Medium | Test exhaustive vs sampling |

## Success Criteria

1. Small arbitraries are enumerated instead of sampled (when configured)
2. Results are deterministic for enumerable arbitraries
3. Performance improves for small domains (no duplicate samples)
4. Non-enumerable arbitraries gracefully fall back to sampling

## Related Issues

- [#10](https://github.com/fluent-check/fluent-check/issues/10) - Original proposal: exhaustive generation
- [#452](https://github.com/fluent-check/fluent-check/issues/452) - Parent: Performance improvements
- [#375](https://github.com/fluent-check/fluent-check/issues/375) - Performance baseline

## Independence

This proposal is **independent**:
- No dependency on shrinking changes
- Orthogonal to lazy generators (#452)
- Self-contained feature addition

## Considerations

From #10 discussion:
- `mapped` arbitraries: Codomain size ≤ domain size, enumeration valid
- `filtered` arbitraries: May reduce enumerable set, need to filter post-enumeration
- `chained` arbitraries: Cross product may exceed threshold, need careful handling
