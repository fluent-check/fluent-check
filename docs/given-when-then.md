# Given-When-Then Pattern Support

FluentCheck bakes the BDD-style Given-When-Then flow into its fluent API. Each phase feeds the next with a strongly-typed context, so complex scenarios stay readable and safe.

```typescript
import * as fc from 'fluent-check'

fc.scenario()
  .forall('username', fc.string(3, 20))
  .forall('password', fc.string(8, 30))
  .given('user', ({username, password}) => ({ username, password }))
  .when(({user}) => createUser(user)) // side effects welcome
  .then(({user}) => canLogin(user))
  .and(({user}) => profileFor(user.username).owner === user.username)
  .check()
  .assertSatisfiable()
```

## Phases

- **Given** (`given(name, factoryOrValue)`) adds derived values or constants to the context. Use `.and(...)` to chain more givens.
- **When** (`when(fn)`) runs setup or side effects before assertions. `.and(...)` chains additional actions.
- **Then** (`then(fn)`) performs the property check. `.and(...)` allows multiple assertions.

All callbacks receive the accumulated record of quantifiers and givens with precise types.

## Practical Patterns

- Compute reusable helpers with `given` instead of recalculating inside `then`.
- Keep assertions pure inside `then`; push setup into `given`/`when`.
- Combine with `classify`, `label`, `collect`, or `cover` to understand and enforce what each scenario hits.
- To “transform the context”, bind derived values with `given(...)` (there is no scenario-level `.map(...)`). To transform generated values, use `Arbitrary.map()` (e.g. `fc.integer().map(...)`).

## Preconditions

Skip invalid cases inside `then` using `fc.pre(...)`:

```typescript
fc.scenario()
  .forall('divisor', fc.integer(-5, 5))
  .forall('dividend', fc.integer())
  .then(({dividend, divisor}) => {
    fc.pre(divisor !== 0, 'division by zero');
    return Math.trunc(dividend / divisor) * divisor + (dividend % divisor) === dividend;
  })
  .check();
```

Preconditions increment the `skipped` count on `FluentResult`, and classified labels still include discarded cases.
