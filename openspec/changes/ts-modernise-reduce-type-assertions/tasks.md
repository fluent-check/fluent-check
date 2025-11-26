## 1. Investigation

- [ ] 1.1 Catalog all `as unknown as` assertions in `src/arbitraries/index.ts`
- [ ] 1.2 Analyze why assertions are needed (variance issues? missing constraints?)
- [ ] 1.3 Review `Arbitrary` class hierarchy for generic constraints
- [ ] 1.4 Analyze how `NoArbitrary` singleton fits into the type system
- [ ] 1.5 Evaluate branded types or phantom types as potential solutions

## 2. Implementation (Incremental)

- [ ] 2.1 Fix `integer()` function type assertions
- [ ] 2.2 Fix `real()` function type assertions
- [ ] 2.3 Fix `nat()` function type assertions
- [ ] 2.4 Fix `array()` function type assertions
- [ ] 2.5 Fix `set()` function type assertions
- [ ] 2.6 Fix `boolean()` function type assertions
- [ ] 2.7 Fix `constant()` function type assertions
- [ ] 2.8 Fix `tuple()` function type assertions
- [ ] 2.9 Fix `union()` function type assertions

## 3. Verification

- [ ] 3.1 Run full test suite to ensure no regressions
- [ ] 3.2 Verify no hidden type bugs surfaced by changes
- [ ] 3.3 Document any necessary architectural changes
