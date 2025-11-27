# Change: Add `fc.prop()` Shorthand for Simple Properties

## Why

45% of property tests in the codebase are simple universal properties that don't benefit from the full BDD given/when/then structure. The current syntax requires 4+ method calls and wrapping with Chai assertions for basic property verification. This creates unnecessary friction for the most common use case.

Research findings from the fluent API ergonomics study show that a simplified entry point could reduce verbosity by 80% for simple properties, significantly lowering the barrier to entry for new users.

## What Changes

- Add `fc.prop()` function as a simplified entry point for property testing
- Support 1-5 arbitraries with positional parameters
- Return a `FluentProperty` interface with `check()`, `assert()`, and `config()` methods
- `assert()` throws on failure for cleaner test integration

### API

```typescript
// Single arbitrary
fc.prop(fc.integer(), x => x + 0 === x).assert();

// Multiple arbitraries
fc.prop(fc.integer(), fc.integer(), (a, b) => a + b === b + a).assert();

// With configuration
fc.prop(fc.integer(), x => x > 0)
  .config(fc.strategy().withShrinking())
  .assert();

// Check without throwing
const result = fc.prop(fc.integer(), x => x >= 0).check();
```

## Impact

- Affected specs: `fluent-api`
- Affected code: `src/index.ts`, new `src/FluentProperty.ts`
- Breaking: None - additive change
- Verbosity reduction: 80% for simple properties (5 LOC → 1 LOC)
