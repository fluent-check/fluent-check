# Tasks: Add InvalidArbitrary

## 1. Core Type Implementation

- [ ] 1.1 Create `src/arbitraries/InvalidArbitrary.ts` with `InvalidArbitrary<R>` type and factory
- [ ] 1.2 Add `isInvalidArbitrary()` type guard function
- [ ] 1.3 Export from `src/arbitraries/index.ts`
- [ ] 1.4 Add `_tag` discriminant to `NoArbitrary` for type narrowing (optional)

## 2. Factory Function Updates

- [ ] 2.1 Update `fc.integer()` to return `InvalidArbitrary` when `min > max`
- [ ] 2.2 Update `fc.real()` to return `InvalidArbitrary` when `min > max`
- [ ] 2.3 Update `fc.nat()` to return `InvalidArbitrary` when `max < 0`
- [ ] 2.4 Update `fc.array()` to return `InvalidArbitrary` when `min > max` or `min < 0`
- [ ] 2.5 Update `fc.set()` to return `InvalidArbitrary` when bounds invalid or `min > elements.length`
- [ ] 2.6 Update `fc.oneof()` to return `InvalidArbitrary` when `elements` is empty
- [ ] 2.7 Audit other factory functions for similar validation opportunities

## 3. FluentCheck Runner Updates

- [ ] 3.1 Add `'invalid'` status to `PropertyResult` type
- [ ] 3.2 Update `FluentCheck` to detect `InvalidArbitrary` in arbitrary chain
- [ ] 3.3 Return `invalid` result with reason when `InvalidArbitrary` detected
- [ ] 3.4 Ensure `InvalidArbitrary` in composed arbitraries (tuple, chain, etc.) is detected

## 4. Reporter Updates

- [ ] 4.1 Add formatting for `invalid` status in `FluentReporter`
- [ ] 4.2 Display reason and suggestion in output
- [ ] 4.3 Ensure clear distinction from regular failures

## 5. Tests

- [ ] 5.1 Add tests for `InvalidArbitrary` type and factory
- [ ] 5.2 Add tests for `isInvalidArbitrary()` type guard
- [ ] 5.3 Add tests for `fc.integer()` returning `InvalidArbitrary` on invalid range
- [ ] 5.4 Add tests for `fc.real()` returning `InvalidArbitrary` on invalid range
- [ ] 5.5 Add tests for `fc.nat()` returning `InvalidArbitrary` on negative max
- [ ] 5.6 Add tests for `fc.array()` returning `InvalidArbitrary` on invalid bounds
- [ ] 5.7 Add tests for `fc.set()` returning `InvalidArbitrary` on invalid bounds
- [ ] 5.8 Add tests for `fc.oneof()` returning `InvalidArbitrary` on empty array
- [ ] 5.9 Add tests verifying shrinking still returns `NoArbitrary` (not `InvalidArbitrary`)
- [ ] 5.10 Add tests for FluentCheck detecting and reporting `InvalidArbitrary`
- [ ] 5.11 Add tests for composed arbitraries containing `InvalidArbitrary`

## 6. Documentation

- [ ] 6.1 Update README with explanation of `InvalidArbitrary` vs `NoArbitrary`
- [ ] 6.2 Add CHANGELOG entry for new validation behavior
- [ ] 6.3 Document common error messages and fixes

## 7. Type-Level Enhancements (Optional/Future)

- [ ] 7.1 Investigate type-level guards for literal number comparisons
- [ ] 7.2 Add branded types or conditional return types where feasible
