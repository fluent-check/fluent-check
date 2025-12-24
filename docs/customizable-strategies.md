# Customizable Testing Strategies

Strategies control how scenarios explore inputs, shrink failures, and collect statistics. FluentCheck separates strategy configuration from property definitions so you can reuse the same execution plan across tests.

## What You Can Configure

`FluentStrategyFactory` (returned by `fc.strategy()` or the presets under `fc.strategies`) exposes:

- `withSampleSize(n)` – number of test cases (default 1000)
- `withoutReplacement()` – dedupe generated values
- `withBias()` – prioritize corner cases
- `usingCache()` – reuse generated samples for efficiency
- `withShrinking(shrinkSize?)` – enable per-arbitrary shrinking (default 500)
- `withoutShrinking()` – disable shrinking (faster, less-informative counterexamples)
- `withDetailedStatistics()` – collect per-arbitrary distributions, histograms, and corner-case coverage
- `withVerbosity(level)` – control reporting detail (`Quiet`, `Normal`, `Verbose`, `Debug`)
- `withRandomGenerator(builder, seed?)` – plug in a custom RNG (seed stored on the result)
- Confidence-based termination:
  - `withConfidence(level)` – stop early once confidence is reached (bounded by `sampleSize`)
  - `withMinConfidence(level)` – if confidence is still low at `sampleSize`, continue (requires `withMaxIterations(...)`)
  - `withPassRateThreshold(threshold)` – “pass rate > threshold” target for confidence calculation (default 0.999)
  - `withMaxIterations(count)` – safety cap when continuing past `sampleSize`
  - `withConfidenceCheckInterval(interval)` – how often confidence is evaluated (default 100 tests)

Attach a strategy to any scenario or property with `.config(...)`. The last strategy in the chain wins.

```typescript
import * as fc from 'fluent-check'

const strategy = fc.strategy()
  .withSampleSize(2_000)
  .withBias()
  .withoutReplacement()
  .withShrinking()
  .withDetailedStatistics()
  .withVerbosity(fc.Verbosity.Verbose)

fc.scenario()
  .config(strategy)
  .forall('x', fc.integer())
  .then(({x}) => x + 0 === x)
  .check({ logStatistics: true })
```

## Preset Strategies

`fc.strategies` provides ready-made factories:

| Preset | Sample Size | Random | Dedup | Bias | Cache | Shrink | Use Case |
|--------|-------------|--------|-------|------|-------|--------|----------|
| `default` | 1000 | ✅ | ✅ | ✅ | ✅ | ✅ | General-purpose testing, CI pipelines |
| `fast` | 1000 | ✅ | ❌ | ❌ | ❌ | ❌ | Quick iteration during development |
| `thorough` | 1000 | ✅ | ✅ | ❌ | ✅ | ✅ | Critical code paths, pre-release testing |
| `minimal` | 10 | ✅ | ❌ | ❌ | ❌ | ❌ | Debugging, test setup verification |

Presets return new factories each time, so you can customize them without mutating shared state:

```typescript
// Start from the thorough preset, but collect detailed stats
const strategy = fc.strategies.thorough.withDetailedStatistics().withSampleSize(2000)
```

## Deterministic Runs

Provide your own PRNG for repeatable sequences:

```typescript
const lcg = (seed: number) => {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
}

fc.scenario()
  .withGenerator(lcg, 1234) // overrides the RNG used by the strategy
  .forall('x', fc.integer())
  .then(({x}) => x + 0 === x)
  .check()
```

The used seed is always included on `FluentResult` for easy reproduction.

## Reporting Controls

- Use `withDetailedStatistics()` to enable per-arbitrary distributions, histograms, and corner-case tracking.
- Use `withVerbosity(...)` plus `check({ logStatistics: true })` to control how much reporting you see.
- You can also supply custom loggers or reporter factories via `CheckOptions` when calling `check()`.
