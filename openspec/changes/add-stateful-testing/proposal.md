# Change: Add Stateful Model-Based Testing API

> **GitHub Issue:** [#527](https://github.com/fluent-check/fluent-check/issues/527)

## Why

Property-based testing excels at testing pure functions, but many real-world systems are stateful - databases, queues, caches, UI components. Currently, users must manually orchestrate command sequences to test stateful systems, which is error-prone and doesn't benefit from automatic shrinking.

Model-based testing (also called stateful testing) addresses this by:
1. Defining a simplified model of the system under test
2. Generating random sequences of commands
3. Verifying the real system matches the model after each command
4. Shrinking failing sequences to minimal reproductions

## What Changes

- **New API**: `fc.stateful()` fluent builder for defining model-based tests
- **Command abstraction**: Type-safe commands with preconditions, arguments, and postconditions
- **Invariant checking**: System-wide invariants verified after each command
- **Sequence generation**: Random command sequences respecting preconditions
- **Smart shrinking**: Automatic shrinking of failing command sequences
- **FSM refactor**: Refactor `ArbitraryFSM` to delegate to `ArbitraryGraph` (reduces ~600 lines of duplication)

## Impact

- Affected specs: New `stateful` capability
- Affected code:
  - `src/stateful/` - New module for stateful testing
  - `src/arbitraries/ArbitraryFSM.ts` - Refactor as Graph wrapper
  - `src/arbitraries/types.ts` - Simplify FSM type
  - `src/index.ts` - Export `fc.stateful()`

## Example

```typescript
fc.stateful<{ elements: number[] }, Stack<number>>()
  .model(() => ({ elements: [] }))
  .sut(() => new Stack<number>())
  
  .command('push')
    .forall('value', fc.integer())
    .run(({ value }, model, sut) => {
      model.elements.push(value)
      sut.push(value)
    })
  
  .command('pop')
    .pre(model => model.elements.length > 0)
    .run(({}, model, sut) => {
      const expected = model.elements.pop()
      const actual = sut.pop()
      if (expected !== actual) throw new Error('Mismatch')
    })
  
  .invariant((model, sut) => sut.size() === model.elements.length)
  .check({ maxCommands: 100 })
```
