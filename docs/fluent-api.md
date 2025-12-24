# Fluent, Type-Safe API

FluentCheck models property tests as readable chains that stay fully type-safe from start to finish. Every step extends the scenario context, so your assertions always see the right names and types.

```typescript
import * as fc from 'fluent-check'

fc.scenario()
  .forall('user', fc.record({ id: fc.integer(), name: fc.string(1, 20) }))
  .given('normalized', ({user}) => ({ ...user, name: user.name.trim().toLowerCase() }))
  .when(({normalized}) => save(normalized)) // side effects allowed
  .classify(({normalized}) => normalized.name === '', 'empty name')
  .cover(5, ({normalized}) => normalized.name.length < 3, 'short names')
  .then(({normalized}) => fetch(normalized.id).name === normalized.name)
  .checkCoverage()
  .assertSatisfiable()
```

## How Type Flow Works

The generic parameters on `FluentCheck` accumulate the scenario context:

1. `forall` / `exists` add named arbitraries (e.g., `user: { id: number; name: string }`)
2. `given` augments the context with derived values (factory or constant)
3. `when` executes side effects but does not change the context type
4. `then` receives the full record and must return a boolean
5. There is no scenario-level `.map(...)`. To “transform the context”, add derived values with `given(...)`.

TypeScript infers the combined record, so the `then` callback above is typed as:
```ts
({ user: { id: number; name: string }, normalized: { id: number; name: string } }) => boolean
```

Freshness is enforced: reusing an existing name (e.g., a second `forall('user', ...)`) produces a type error.

## Core Operations

- `fc.scenario()` – create a fluent scenario builder
- `fc.prop()` – shorthand for simple universal properties (one or more arbitraries)
- `config(strategyFactory)` – attach a `FluentStrategyFactory` (sample size, shrinking, verbosity, RNG, detailed stats)
- `withGenerator(builder, seed?)` – override the RNG used for sampling
- `check(options?)` – run the scenario and return `FluentResult`
- `checkWithConfidence(level, options?)` – run with confidence-based early termination and return `FluentResult`
- `checkCoverage({ confidence? })` – run, verify all `cover`/`coverTable` targets, and throw on failure

## Classification and Coverage

Classification is built into the fluent chain:

- `classify(predicate, label)` – count a label when the predicate is true
- `label(fn)` – derive one label string per test
- `collect(fn)` – bucket numeric/string values as labels
- `cover(percentage, predicate, label)` – enforce a minimum percentage at a chosen confidence level
- `coverTable(name, categories, getCategory)` – enforce multiple category targets at once

Label counts and coverage verification results are part of `FluentResult.statistics`.

## Results and Assertions

`FluentResult` offers fluent assertions:

- `assertSatisfiable(message?)`
- `assertNotSatisfiable(message?)`
- `assertExample(expected, message?)` for partial matches

Every result includes the seed used, classification/coverage stats, and optional detailed statistics when `withDetailedStatistics()` is enabled on the strategy.

## Building Scenarios Explicitly

Call `.buildScenario()` to inspect the immutable AST that will be executed. This is useful for tooling and debugging:

```typescript
const scenario = fc.scenario()
  .forall('x', fc.integer())
  .exists('y', fc.integer())
  .then(({x, y}) => x + y === y + x)
  .buildScenario()

console.log(scenario.quantifiers.length) // 2
console.log(scenario.hasExistential)     // true
```

The scenario AST powers both `check()` and `checkCoverage()`, ensuring the same structure is used for execution and reporting.
