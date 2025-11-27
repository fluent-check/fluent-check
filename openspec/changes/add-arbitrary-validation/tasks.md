# Tasks: Add Arbitrary Validation

## 1. Core Implementation

- [ ] 1.1 Add `ArbitraryOptions` type with `unsafe?: boolean` to `src/arbitraries/types.ts`
- [ ] 1.2 Update `fc.integer()` to accept options and throw on invalid range (unless unsafe)
- [ ] 1.3 Update `fc.real()` to accept options and throw on invalid range (unless unsafe)
- [ ] 1.4 Update `fc.nat()` to accept options and throw when `max < 0` (unless unsafe)
- [ ] 1.5 Update `fc.array()` to accept options and throw on invalid bounds (unless unsafe)
- [ ] 1.6 Update `fc.set()` to accept options and throw on invalid bounds (unless unsafe)
- [ ] 1.7 Update `fc.oneof()` to accept options and throw on empty array (unless unsafe)

## 2. Shrinking Updates

- [ ] 2.1 Update `ArbitraryInteger.shrink()` to use `fc.integer(..., { unsafe: true })`
- [ ] 2.2 Update `ArbitraryReal.shrink()` to use `fc.real(..., { unsafe: true })` (if applicable)
- [ ] 2.3 Update `ArbitraryArray.shrink()` to use `fc.array(..., { unsafe: true })`
- [ ] 2.4 Update `ArbitrarySet.shrink()` to use `fc.set(..., { unsafe: true })` (if applicable)
- [ ] 2.5 Audit all other `shrink()` methods for unsafe factory calls

## 3. Tests

- [ ] 3.1 Add tests for `fc.integer()` throwing on `min > max`
- [ ] 3.2 Add tests for `fc.real()` throwing on `min > max`
- [ ] 3.3 Add tests for `fc.nat()` throwing on `max < 0`
- [ ] 3.4 Add tests for `fc.array()` throwing on invalid bounds
- [ ] 3.5 Add tests for `fc.set()` throwing on invalid bounds
- [ ] 3.6 Add tests for `fc.oneof()` throwing on empty array
- [ ] 3.7 Add tests verifying shrinking still works with `unsafe: true`
- [ ] 3.8 Add tests verifying existing valid code continues to work

## 4. Documentation

- [ ] 4.1 Update README with migration guide for breaking change
- [ ] 4.2 Add CHANGELOG entry for breaking change
- [ ] 4.3 Document `unsafe` option in API docs (if applicable)

## 5. Optional: Warning Mode

- [ ] 5.1 Add `FluentCheckConfig` type with `warnOnEmpty?: boolean`
- [ ] 5.2 Add `fc.configure()` function
- [ ] 5.3 Emit console warning when `NoArbitrary` used in `forall`/`exists`
- [ ] 5.4 Add tests for warning mode
