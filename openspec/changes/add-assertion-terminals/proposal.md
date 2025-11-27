# Change: Add Fluent Assertion Terminal Methods

> **GitHub Issue:** [#410](https://github.com/fluent-check/fluent-check/issues/410)

## Why

The current pattern requires wrapping property test results in Chai assertions like `expect(...).to.have.property('satisfiable', true)`. This obscures the fluent API and adds visual noise to every test. Adding assertion terminal methods directly to `FluentResult` provides a cleaner, more fluent experience.

## What Changes

Add assertion methods to `FluentResult` class:

```typescript
// Current (verbose)
expect(fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => x + 0 === x)
  .check()
).to.have.property('satisfiable', true);

// Proposed (fluent)
fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => x + 0 === x)
  .check()
  .assertSatisfiable();

// Or with example verification
result.assertExample({ a: 0, b: 10 });
```

### API

```typescript
interface FluentResult<Rec> {
  // Existing
  satisfiable: boolean;
  example: Rec;
  seed?: number;

  // New assertion methods
  assertSatisfiable(message?: string): void;
  assertNotSatisfiable(message?: string): void;
  assertExample(expected: Partial<Rec>): void;
}
```

## Impact

- Affected specs: `fluent-api`
- Affected code: `src/FluentCheck.ts`
- Breaking: None - additive change
- Verbosity reduction: Removes Chai wrapper noise from tests
