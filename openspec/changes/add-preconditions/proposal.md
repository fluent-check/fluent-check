# Change: Add `fc.pre()` Preconditions

## Why

Currently, preconditions in property tests must be expressed via `filter()` on arbitraries or manual conditional logic that returns `true` to skip. This obscures intent and makes it difficult to track which test cases were skipped vs. actually tested.

Other property testing frameworks (fast-check, Hypothesis) provide explicit precondition syntax that clearly separates "this case doesn't apply" from "this case passed". This is the standard pattern in property-based testing.

## What Changes

- Add `fc.pre()` function for asserting preconditions within test bodies
- When precondition fails, skip the test case (count as neither pass nor fail)
- Optionally track skip statistics in results
- Support optional message parameter for debugging

### API

```typescript
fc.scenario()
  .forall('a', fc.integer())
  .forall('b', fc.integer())
  .then(({ a, b }) => {
    fc.pre(b !== 0);  // Skip if b is zero
    return a / b * b + a % b === a;
  })
  .check();

// With message
fc.pre(arr.length > 0, 'array must be non-empty');
```

## Impact

- Affected specs: `fluent-api`
- Affected code: `src/index.ts`, `src/FluentCheck.ts`
- Breaking: None - additive change
- Clarity: Explicit preconditions vs hidden conditionals
