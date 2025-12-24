# Given-When-Then Pattern

The Given-When-Then pattern keeps scenarios readable and intention-revealing. FluentCheck models each phase explicitly while preserving type information across the chain.

```typescript
fc.scenario()
  .forall('input', fc.array(fc.integer()))
  .given('sorted', ({input}) => [...input].sort((a, b) => a - b))
  .when(({sorted}) => logCase(sorted)) // optional side effects
  .then(({input, sorted}) =>
    sorted.length === input.length &&
    sorted.every((value, i) => value >= (sorted[i - 1] ?? value))
  )
  .check()
  .assertSatisfiable()
```

## Why It Works Well Here

- **Readable chain**: Each step declares intent: generate data, derive helpers, perform actions, assert properties.
- **Strong typing**: Quantifiers and givens extend the context, so `then` and `when` callbacks see the exact shape.
- **Composability**: Use `.and(...)` on `given`, `when`, and `then` to add more steps without losing clarity.
- **Insights and guarantees**: Layer on `.classify()`, `.collect()`, or `.cover()` to understand which cases ran and to enforce coverage targets.

For a deeper walkthrough of the API, see `docs/fluent-api.md`. For usage tips and preconditions, see `docs/given-when-then.md`.
