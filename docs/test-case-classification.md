# Classification and Coverage

FluentCheck provides first-class tools to understand what your property tests actually exercised. You can classify and label test cases, collect value distributions, and enforce coverage targets with statistical confidence.

## Classification and Labeling

Use `classify`, `label`, or `collect` to tag test cases as they run. Labels are counted in `FluentStatistics.labels` and percentages are available in `labelPercentages`.

```typescript
import * as fc from 'fluent-check'

const result = fc.scenario()
  .config(fc.strategy().withDetailedStatistics())
  .forall('xs', fc.array(fc.integer(), 0, 10))
  .classify(({xs}) => xs.length === 0, 'empty')
  .label(({xs}) => xs.length < 5 ? 'small' : 'large')
  .collect(({xs}) => xs.length) // captures lengths as string keys
  .then(({xs}) => xs.length >= 0)
  .check({ logStatistics: true }) // statistics now include label counts and percentages

console.log(result.statistics.labels)           // { empty: 7, small: 42, large: 51, '0': 7, '1': 8, ... }
console.log(result.statistics.labelPercentages) // percentages (0-100) for every label
```

- `classify(predicate, label)`: increments `label` when the predicate is `true`.
- `label(fn)`: adds one label per test case using the returned string.
- `collect(fn)`: turns a string/number into a label so you can see distributions.

Classification runs before preconditions, so discarded cases are still counted in the label totals. Aggregated statistics are available on `FluentResult.statistics` for assertions or reporting.

## Coverage Requirements with Confidence

`cover` and `coverTable` declare coverage targets (percentages) you expect to hit. `checkCoverage()` verifies them using Wilson score confidence intervals, throwing if any target cannot be supported at the chosen confidence level (default 95%).

```typescript
import * as fc from 'fluent-check'

const result = fc.scenario()
  .forall('x', fc.integer(-100, 100))
  .cover(40, ({x}) => x < 0, 'negative')
  .cover(40, ({x}) => x > 0, 'positive')
.coverTable('parity', { even: 45, odd: 45 }, ({x}) => x % 2 === 0 ? 'even' : 'odd')
  .then(({x}) => x + 0 === x)
  .checkCoverage({ confidence: 0.99 })

// Inspect coverage verification results
for (const entry of result.statistics.coverageResults ?? []) {
  console.log(`${entry.label}: ${entry.observedPercentage.toFixed(1)}% (CI ${entry.confidenceInterval[0].toFixed(1)}-${entry.confidenceInterval[1].toFixed(1)})`)
}
```

Key details:

- `cover(percentage, predicate, label)`: requires at least `percentage`% of test cases to satisfy `predicate`.
- `coverTable(name, categories, getCategory)`: sets multiple labeled targets under `name.*`.
- `checkCoverage({ confidence })`: runs the scenario and validates requirements; it throws if any `coverageResults` entry has `satisfied === false`.
- Coverage verification is based on Wilson score intervals, so you get meaningful bounds even with smaller sample sizes.

Coverage targets are recorded alongside classifications, making it easy to combine distribution insight with enforceable guarantees.
