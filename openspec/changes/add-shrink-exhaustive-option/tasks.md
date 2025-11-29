## 1. Implementation

- [ ] 1.1 Add `ShrinkStrategy` type: `'best-effort' | 'exhaustive' | 'auto'`
- [ ] 1.2 Add `withShrinkStrategy(strategy)` to `FluentStrategyFactory`
- [ ] 1.3 Add `withExhaustiveShrinkThreshold(size)` to `FluentStrategyFactory`
- [ ] 1.4 Implement exhaustive candidate enumeration in Shrinkable mixin
- [ ] 1.5 Implement auto-strategy selection using `size()` estimates

## 2. Testing

- [ ] 2.1 Test best-effort strategy (verify no behavioral change)
- [ ] 2.2 Test exhaustive strategy finds guaranteed minimum
- [ ] 2.3 Test auto strategy switches correctly based on threshold
- [ ] 2.4 Test issue #18 scenario is solvable with exhaustive
- [ ] 2.5 Test configuration inheritance through strategy builder

## 3. Documentation

- [ ] 3.1 Document shrink strategy options in API docs
- [ ] 3.2 Add examples showing when to use each strategy
