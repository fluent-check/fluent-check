# FluentCheck

A type-safe, fluent-based property testing framework for TypeScript.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/fluent-check/fluent-check/blob/main/LICENSE)

## Overview

FluentCheck is a property-based testing framework inspired by [FastCheck](https://github.com/dubzzz/fast-check) but with a focus on:

- Native TypeScript support with full type safety
- Fluent API for expressive and readable test cases
- Smart search strategies for efficient test case generation
- Statistical confidence calculation
- Comprehensive shrinking capabilities for better counterexample discovery

Property-based testing goes beyond traditional example-based testing by automatically generating test cases based on properties that should hold true for your code. This approach helps uncover edge cases and bugs that might not be discovered through manual testing.

## Features

FluentCheck offers a powerful yet intuitive approach to property testing:

- **Fluent API**: Write tests in a natural, readable style
- **Strong Type Safety**: Leverages TypeScript's type system for excellent IDE support
- **Smart Shrinking**: Automatically find the smallest failing examples
- **Statistical Confidence**: Measure the statistical significance of your tests
- **Customizable Strategies**: Tailor testing approach to your specific needs
- **Composable Arbitraries**: Build complex test data from simple components
- **Given-When-Then Pattern**: Structure tests in a clear, consistent way
- **Chained Type Inference**: Maintain type information through transformations
- **Corner Case Prioritization**: Ensure edge cases are thoroughly tested
- **Coverage & Classification**: Label inputs and enforce coverage targets with statistical confidence

## Requirements

- **Node.js** ≥22 (Node.js 24 LTS recommended)

## Installation

```bash
npm install fluent-check
```

## Basic Usage

```typescript
import * as fc from 'fluent-check';

// Fluent assertion style - concise and readable
fc.scenario()
  .forall('x', fc.integer())
  .forall('y', fc.integer())
  .then(({x, y}) => x + y === y + x)
  .check()
  .assertSatisfiable();
```

### Property Shorthand (`fc.prop()`)

For simple properties that don't need the full BDD structure, use the `prop()` shorthand for minimal boilerplate:

```typescript
import * as fc from 'fluent-check';

// Single arbitrary - 80% less verbose than scenario()
fc.prop(fc.integer(), x => x + 0 === x).assert();

// Multiple arbitraries (up to 5)
fc.prop(fc.integer(), fc.integer(), (a, b) => a + b === b + a).assert();

// With custom strategy configuration
fc.prop(fc.integer(), x => x > 0)
  .config(fc.strategy().defaultStrategy())
  .assert();

// Check without throwing (returns FluentResult)
const result = fc.prop(fc.integer(), x => x >= 0).check();
if (!result.satisfiable) {
  console.log('Counterexample:', result.example);
}
```

**Comparison:**
```typescript
// Before (verbose BDD-style)
fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x + 0 === x)
  .check()
  .assertSatisfiable();

// After (shorthand) - 80% reduction
fc.prop(fc.integer(), x => x + 0 === x).assert();
```

### Fluent Assertions

FluentCheck provides built-in assertion methods that integrate seamlessly with the fluent API:

```typescript
// Assert a property holds for all inputs
fc.scenario()
  .forall('x', fc.integer(-10, 10))
  .then(({x}) => x + 0 === x)
  .check()
  .assertSatisfiable();

// Assert a property does NOT hold (find a counterexample)
fc.scenario()
  .forall('a', fc.integer(-10, 10))
  .forall('b', fc.integer(-10, 10))
  .then(({a, b}) => a - b === b - a)
  .check()
  .assertNotSatisfiable();

// Assert the found example matches expected values (partial match)
const result = fc.scenario()
  .exists('a', fc.integer())
  .forall('b', fc.integer(-10, 10))
  .then(({a, b}) => a + b === b)
  .check();

result.assertSatisfiable();
result.assertExample({ a: 0 });  // The neutral element of addition
```

**Assertion Methods:**

| Method | Description |
|--------|-------------|
| `assertSatisfiable(message?)` | Throws if property is NOT satisfiable |
| `assertNotSatisfiable(message?)` | Throws if property IS satisfiable |
| `assertExample(expected, message?)` | Throws if example doesn't match (partial match) |

Error messages automatically include:
- JSON-formatted example/counterexample
- Seed value for test reproducibility
- Custom message prefix (if provided)

**Migrating from Chai-style assertions:**

```typescript
// Before (verbose)
expect(fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x + 0 === x)
  .check()
).to.have.property('satisfiable', true);

// After (fluent)
fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x + 0 === x)
  .check()
  .assertSatisfiable();
```

## Example: Testing a Sort Function

```typescript
import { fc } from 'fluent-check';

// Property: A sorted array should contain all the same elements as the original
const result = await fc.scenario()
  .forall('array', fc.array(fc.integer()))
  .map(({array}) => {
    const sorted = [...array].sort((a, b) => a - b);
    return { original: array, sorted };
  })
  .then(({original, sorted}) => {
    // Check length is the same
    if (original.length !== sorted.length) return false;
    
    // Check all elements are preserved
    const originalMap = new Map();
    const sortedMap = new Map();
    
    original.forEach(x => originalMap.set(x, (originalMap.get(x) || 0) + 1));
    sorted.forEach(x => sortedMap.set(x, (sortedMap.get(x) || 0) + 1));
    
    for (const [key, count] of originalMap) {
      if (sortedMap.get(key) !== count) return false;
    }
    
    // Check sorting property
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] < sorted[i-1]) return false;
    }
    
    return true;
  })
  .check();
```

## Rich Set of Arbitraries

FluentCheck provides a comprehensive set of built-in arbitraries (data generators):

- **Primitives**: `integer`, `real`, `nat`, `boolean`
- **Strings**: `string`, `char`, `ascii`, `unicode`, `base64`, `hex`
- **Date & Time**: `date`, `time`, `datetime`, `duration`
- **Pattern-based**: `regex`, `patterns.email`, `patterns.uuid`, `patterns.url`, `patterns.ipv4`
- **Containers**: `array`, `set`, `tuple`
- **Combinators**: `oneof`, `union`, `constant`
- **Presets**: `positiveInt`, `negativeInt`, `nonZeroInt`, `byte`, `nonEmptyString`, `nonEmptyArray`, `pair`, `nullable`, `optional`

All arbitraries are composable and can be transformed using `map`, `filter`, and other operations. For complete details, see the [Composable Arbitraries](docs/composable-arbitraries.md) documentation.

### Arbitrary Presets

FluentCheck provides shorthand factories for frequently-used patterns:

```typescript
// Integer presets - no more manual range specification
fc.positiveInt()      // integer(1, MAX_SAFE_INTEGER)
fc.negativeInt()      // integer(MIN_SAFE_INTEGER, -1)
fc.nonZeroInt()       // union(negativeInt(), positiveInt())
fc.byte()             // integer(0, 255)

// String preset
fc.nonEmptyString(50) // string(1, 50) - always at least 1 char

// Collection presets
fc.nonEmptyArray(fc.integer())      // array with length >= 1
fc.nonEmptyArray(fc.integer(), 5)   // array with length 1-5
fc.pair(fc.integer())               // tuple(integer, integer)

// Nullable/optional presets - great for testing edge cases
fc.nullable(fc.string())   // string | null
fc.optional(fc.integer())  // integer | undefined
```

**Example: Testing with presets**

```typescript
// Before: verbose
fc.scenario()
  .forall('arr', fc.array(fc.integer(1, Number.MAX_SAFE_INTEGER), 1, 10))
  .then(({arr}) => arr.length > 0 && arr.every(n => n > 0))
  .check();

// After: using presets
fc.scenario()
  .forall('arr', fc.nonEmptyArray(fc.positiveInt()))
  .then(({arr}) => arr.length > 0 && arr.every(n => n > 0))
  .check();
```

### Strategy Presets

FluentCheck provides pre-configured strategy presets for common testing scenarios:

```typescript
import * as fc from 'fluent-check';

// Default - balanced speed and coverage (recommended for most tests)
fc.scenario()
  .config(fc.strategies.default)
  .forall('x', fc.integer())
  .then(({x}) => x + 0 === x)
  .check();

// Fast - quick feedback during development
fc.prop(fc.integer(), x => x >= 0)
  .config(fc.strategies.fast)
  .assert();

// Thorough - comprehensive coverage for critical code
fc.scenario()
  .config(fc.strategies.thorough)
  .forall('list', fc.array(fc.integer()))
  .then(({list}) => isSorted(sort(list)))
  .check();

// Minimal - for debugging with only 10 samples
fc.prop(fc.integer(), x => x + 0 === x)
  .config(fc.strategies.minimal)
  .assert();
```

| Preset | Sample Size | Features | Use Case |
|--------|-------------|----------|----------|
| `default` | 1000 | Random + Dedup + Bias + Cache + Shrink | General-purpose testing |
| `fast` | 1000 | Random only | Quick iteration |
| `thorough` | 1000 | Random + Cache + Dedup + Shrink | Critical code paths |
| `minimal` | 10 | Random only | Debugging |

Presets can be further customized:

```typescript
// Start with a preset, then customize
fc.scenario()
  .config(fc.strategies.thorough.withSampleSize(5000))
  .forall('x', fc.integer())
  .then(({x}) => x + 0 === x)
  .check();
```

### Property Helpers (`fc.props`)

FluentCheck provides reusable property helpers for common assertions in your tests:

```typescript
import * as fc from 'fluent-check';

// Simple property checks
fc.props.sorted([1, 2, 3])                    // true - check if sorted
fc.props.sorted([3, 2, 1], (a, b) => b - a)   // true - descending order
fc.props.unique([1, 2, 3])                    // true - all elements unique
fc.props.nonEmpty([1, 2, 3])                  // true - has elements
fc.props.inRange(5, 1, 10)                    // true - 1 <= 5 <= 10
fc.props.matches('hello', /^h/)               // true - matches regex

// Mathematical property predicates (composable)
fc.props.roundtrips(data, JSON.stringify, JSON.parse)   // decode(encode(x)) === x
fc.props.isIdempotent(value, Math.abs)                  // f(f(x)) === f(x)
fc.props.commutes(a, b, (x, y) => x + y)                // f(a, b) === f(b, a)
fc.props.associates(a, b, c, (x, y) => x + y)           // f(a, f(b, c)) === f(f(a, b), c)
fc.props.hasIdentity(value, (x, y) => x + y, 0)         // f(a, id) === a
```

**Composable predicates in scenarios:**

```typescript
// Use predicates in .then() clauses for full composability
fc.scenario()
  .forall('data', fc.array(fc.integer()))
  .then(({ data }) => fc.props.roundtrips(data, JSON.stringify, JSON.parse))
  .check()
  .assertSatisfiable();

// Combine multiple property checks in one scenario
fc.scenario()
  .forall('a', fc.integer(-100, 100))
  .forall('b', fc.integer(-100, 100))
  .forall('c', fc.integer(-100, 100))
  .then(({ a, b, c }) =>
    fc.props.commutes(a, b, (x, y) => x + y) &&
    fc.props.associates(a, b, c, (x, y) => x + y) &&
    fc.props.hasIdentity(a, (x, y) => x + y, 0)
  )
  .check()
  .assertSatisfiable();

// Dynamic encoder/decoder selection
fc.scenario()
  .forall('encoder', fc.oneof(fc.constant(JSON.stringify), fc.constant(customEncode)))
  .forall('decoder', fc.oneof(fc.constant(JSON.parse), fc.constant(customDecode)))
  .forall('data', fc.record({ id: fc.integer(), name: fc.string() }))
  .then(({ encoder, decoder, data }) => fc.props.roundtrips(data, encoder, decoder))
  .check();
```

### Property Templates (`fc.templates`)

FluentCheck provides pre-built property test templates for common mathematical properties. Templates are standalone tests built on top of `fc.props` predicates:

```typescript
import * as fc from 'fluent-check';

// Roundtrip: decode(encode(x)) === x
fc.templates.roundtrip(
  fc.array(fc.integer()),
  JSON.stringify,
  JSON.parse
).assert();

// Idempotent: f(f(x)) === f(x)
fc.templates.idempotent(fc.integer(), Math.abs).assert();

// Commutative: f(a, b) === f(b, a)
fc.templates.commutative(
  fc.integer(-100, 100),
  (a, b) => a + b
).assert();

// Associative: f(a, f(b, c)) === f(f(a, b), c)
fc.templates.associative(
  fc.integer(-100, 100),
  (a, b) => a + b
).assert();

// Identity: f(a, identity) === a && f(identity, a) === a
fc.templates.identity(
  fc.integer(),
  (a, b) => a + b,
  0  // 0 is identity for addition
).assert();
```

**Templates vs Predicates:**

| Need | Use |
|------|-----|
| Quick standalone test | `fc.templates.*` |
| Compose in custom scenario | `fc.props.*` predicates |
| Dynamic function/encoder | `fc.props.*` predicates |
| Multiple checks in one test | `fc.props.*` predicates |

**Templates with configuration:**

```typescript
// Use strategy presets for performance control
fc.templates.roundtrip(fc.string(), JSON.stringify, JSON.parse)
  .config(fc.strategies.fast)
  .check()
  .assertSatisfiable();
```

## Advanced Usage

### Custom Arbitraries

You can create custom arbitraries by transforming existing ones:

```typescript
// Create an arbitrary for non-empty arrays
const nonEmptyArray = <T>(arbitrary: fc.Arbitrary<T>) =>
  fc.array(arbitrary, 1, 100);

// Create an arbitrary for positive even numbers
const positiveEven = fc.integer(1, 1000).map(n => n * 2);

// Use them in tests
fc.scenario()
  .forall('arr', nonEmptyArray(fc.integer()))
  .forall('even', positiveEven)
  .then(({arr, even}) => /* your property */)
  .check();
```

### Given-When-Then Pattern

FluentCheck supports the Given-When-Then pattern for more complex test scenarios:

```typescript
fc.scenario()
  .forall('x', fc.integer(1, 100))
  .forall('y', fc.integer(1, 100))
  .given('sum', ({x, y}) => x + y)
  .given('product', ({x, y}) => x * y)
  .when(({x, y, sum, product}) => {
    // Perform actions or setup that don't return values
    console.log(`Testing with x=${x}, y=${y}`);
  })
  .then(({sum, product}) => product > sum) // This will fail for some inputs
  .check()
```

### Preconditions

Use `fc.pre()` to skip test cases that don't meet certain preconditions. This is clearer than using `filter()` when the constraint applies to the test logic rather than the data generation:

```typescript
// Skip division by zero cases
fc.scenario()
  .forall('a', fc.integer(-100, 100))
  .forall('b', fc.integer(-10, 10))
  .then(({a, b}) => {
    fc.pre(b !== 0);  // Skip if b is zero
    return Math.trunc(a / b) * b + (a % b) === a;
  })
  .check();

// With a descriptive message for debugging
fc.scenario()
  .forall('arr', fc.array(fc.integer()))
  .then(({arr}) => {
    fc.pre(arr.length > 0, 'array must be non-empty');
    return arr[0] !== undefined;
  })
  .check();
```

**When to use `pre()` vs `filter()`:**

| Use Case | Approach |
|----------|----------|
| Constraint on data generation | `filter()` on arbitrary |
| Constraint discovered during test | `fc.pre()` in test body |
| Multiple values must relate | `fc.pre()` in test body |
| Improves readability of intent | `fc.pre()` in test body |

The result includes a `skipped` count showing how many test cases were skipped due to failed preconditions. Skipped cases count as neither passes nor failures.

### Test Case Classification

FluentCheck allows you to classify and label test cases to gain insight into what kinds of inputs were actually tested. This helps ensure important categories (empty arrays, negative numbers, edge cases) are adequately covered.

#### Classify by Predicate

Use `classify()` to label test cases when a predicate is true:

```typescript
const result = fc.scenario()
  .config(fc.strategy().withSampleSize(100))
  .forall('xs', fc.array(fc.integer(), 0, 10))
  .classify(({xs}) => xs.length === 0, 'empty')
  .classify(({xs}) => xs.length < 5, 'small')
  .classify(({xs}) => xs.length >= 5, 'large')
  .then(({xs}) => xs.length >= 0)
  .check()

// Access classification statistics
console.log(result.statistics.labels)
// { empty: 15, small: 42, large: 43 }

console.log(result.statistics.labelPercentages)
// { empty: 15.0, small: 42.0, large: 43.0 }
```

#### Dynamic Labeling

Use `label()` to dynamically assign labels based on test case values:

```typescript
const result = fc.scenario()
  .config(fc.strategy().withSampleSize(100))
  .forall('x', fc.integer(-100, 100))
  .label(({x}) => x < 0 ? 'negative' : x > 0 ? 'positive' : 'zero')
  .then(({x}) => Math.abs(x) >= 0)
  .check()

console.log(result.statistics.labelPercentages)
// { negative: 48.5, positive: 48.5, zero: 3.0 }
```

#### Value Collection

Use `collect()` to aggregate values and use them as labels:

```typescript
const result = fc.scenario()
  .config(fc.strategy().withSampleSize(50))
  .forall('xs', fc.array(fc.integer(), 0, 10))
  .collect(({xs}) => xs.length)  // Collect array lengths
  .then(({xs}) => xs.length >= 0)
  .check()

console.log(result.statistics.labels)
// { '0': 5, '1': 8, '2': 12, '3': 10, ... }
```

#### Multiple Classifications

You can combine multiple classification methods in the same scenario:

```typescript
const result = fc.scenario()
  .config(fc.strategy().withSampleSize(100))
  .forall('xs', fc.array(fc.integer(), 0, 10))
  .classify(({xs}) => xs.length === 0, 'empty')
  .label(({xs}) => xs.length < 5 ? 'small' : 'large')
  .collect(({xs}) => xs.length)
  .then(({xs}) => xs.length >= 0)
  .check()

// All classifications are tracked independently
console.log(result.statistics.labels)
// { empty: 10, small: 45, large: 45, '0': 10, '1': 8, ... }
```

#### Classification with Preconditions

Classifications are evaluated before preconditions, so discarded tests are still classified:

```typescript
const result = fc.scenario()
  .config(fc.strategy().withSampleSize(100))
  .forall('x', fc.integer(0, 100))
  .classify(({x}) => x < 50, 'small')
  .classify(({x}) => x >= 50, 'large')
  .then(({x}) => {
    fc.pre(x % 2 === 0)  // Discard odd numbers
    return true
  })
  .check()

// Labels include all tests (even discarded ones)
// Percentages are based on testsRun, not testsPassed
console.log(result.statistics.testsRun)        // 100
console.log(result.statistics.testsDiscarded)  // ~50
console.log(result.statistics.labels)          // { small: ~50, large: ~50 }
```

**When to use classification:**
- Verify test coverage of important input categories
- Debug why certain edge cases aren't being found
- Understand the distribution of generated test data
- Ensure balanced testing across different input types

### Coverage Requirements

Use `cover` and `coverTable` to declare minimum coverage targets for important categories. Run `checkCoverage()` to verify the targets using Wilson score confidence intervals (95% by default, configurable per run).

```typescript
const result = fc.scenario()
  .forall('x', fc.integer(-100, 100))
  .cover(40, ({x}) => x < 0, 'negative') // at least 40% negative
  .cover(40, ({x}) => x > 0, 'positive') // at least 40% positive
.coverTable('parity', { even: 45, odd: 45 }, ({x}) => x % 2 === 0 ? 'even' : 'odd')
  .then(({x}) => x + 0 === x)
  .checkCoverage({ confidence: 0.99 }) // throws if requirements are not statistically supported

for (const entry of result.statistics.coverageResults ?? []) {
  console.log(`${entry.label}: ${entry.observedPercentage.toFixed(1)}% (CI ${entry.confidenceInterval[0].toFixed(1)}-${entry.confidenceInterval[1].toFixed(1)})`)
}
```

Coverage nodes reuse the same labeling system as `classify()`/`label()`/`collect()`, so your statistics include both distribution insights and verification results.

### Detailed Statistics

FluentCheck can collect and report comprehensive execution statistics, helping you understand the quality and coverage of your tests.

#### Enabling Statistics

Use `.withDetailedStatistics()` to track distribution data, corner case coverage, and more:

```typescript
fc.scenario()
  .config(fc.strategy().withDetailedStatistics())
  .forall('age', fc.integer(0, 120))
  .forall('name', fc.string())
  .then(({age, name}) => processUser(age, name))
  .check({ logStatistics: true }); // Prints report to console
```

#### Event Tracking

Track custom events to verify that your tests are hitting interesting logic branches:

```typescript
fc.scenario()
  .forall('data', fc.array(fc.integer()))
  .then(({data}) => {
    if (data.length === 0) fc.event('empty');
    if (new Set(data).size !== data.length) fc.event('has duplicates');
    
    return processData(data);
  })
  .check();
```

#### Optimization Targets

Track numeric metrics to see what extremes your tests are reaching:

```typescript
fc.scenario()
  .forall('graph', fc.graph())
  .then(({graph}) => {
    fc.target(graph.nodes.length, 'node count');
    fc.target(graph.edges.length, 'edge count');
    return isValid(graph);
  })
  .check();
```

## Detailed Documentation

For more details on each feature, check out our detailed documentation:

- [Fluent API](docs/fluent-api.md)
- [Quantifiers](docs/quantifiers.md)
- [Given-When-Then Pattern](docs/given-when-then-pattern.md)
- [Statistical Confidence](docs/statistical-confidence.md)
- [Reporting and Progress](docs/reporting.md)
- [Test Case Classification & Coverage](docs/test-case-classification.md)
- [Smart Shrinking](docs/smart-shrinking.md)
- [Customizable Strategies](docs/customizable-strategies.md)
- [Composable Arbitraries](docs/composable-arbitraries.md)
- [Chained Type Inference](docs/chained-type-inference.md)
- [Corner Case Prioritization](docs/corner-case-prioritization.md)

### Performance Analysis

FluentCheck includes profiling tools and performance documentation for contributors:

- [Performance Baseline Report](docs/performance/baseline-report.md) - Executive summary and optimization roadmap
- [CPU Profile Analysis](docs/performance/cpu-profile.md) - Detailed CPU profiling methodology and findings
- [Memory Profile Analysis](docs/performance/memory-profile.md) - Heap and GC analysis

Run profiling locally:
```bash
npm run profile:cpu   # Generate flame graphs and CPU profiles
npm run profile:heap  # Generate heap profiles and GC traces
```

### Date & Time Testing

FluentCheck provides arbitraries for dates, times, and durations:

```typescript
// Test date properties
fc.scenario()
  .forall('startDate', fc.date(new Date('2020-01-01'), new Date('2020-06-30')))
  .forall('days', fc.integer(1, 30))
  .then(({startDate, days}) => {
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + days)
    
    // Property: Adding days to a date should increase its timestamp
    return endDate.getTime() > startDate.getTime()
  })
  .check()

// Test time arithmetic
fc.scenario()
  .forall('time', fc.time())
  .then(({time}) => {
    // Property: Hours should be in valid range
    return time.hour >= 0 && time.hour < 24
  })
  .check()

// Test durations
fc.scenario()
  .forall('duration', fc.duration())
  .then(({duration}) => {
    const milliseconds = fc.timeToMilliseconds(duration)
    
    // Property: Converting to milliseconds and back should preserve values
    return milliseconds === (
      duration.hours * 3600000 + 
      duration.minutes * 60000 + 
      duration.seconds * 1000 + 
      duration.milliseconds
    )
  })
  .check()
```

### Regular Expression & Pattern Testing

FluentCheck supports generating strings that match regular expressions and common patterns:

```typescript
// Test with a custom regex pattern
fc.scenario()
  .forall('phone', fc.regex(/\d{3}-\d{3}-\d{4}/))
  .then(({phone}) => {
    // Property: All generated values match our phone number format
    return /^\d{3}-\d{3}-\d{4}$/.test(phone)
  })
  .check()

// Use predefined pattern generators for common formats
fc.scenario()
  .forall('email', fc.patterns.email())
  .forall('uuid', fc.patterns.uuid())
  .forall('url', fc.patterns.url())
  .then(({email, uuid, url}) => {
    // Validate our generated values with a validator function
    return validateEmail(email) && 
           validateUuid(uuid) && 
           isValidUrl(url)
  })
  .check()

// Test form validation logic
fc.scenario()
  .forall('validInput', fc.patterns.email())
  .forall('invalidInput', fc.string())
  .then(({validInput, invalidInput}) => {
    // Property: Our validator should accept valid emails
    // and reject random strings
    return emailValidator.isValid(validInput) && 
           !emailValidator.isValid(invalidInput)
  })
  .check()
```

For a detailed explanation of the design and algorithmic approaches used in our regex implementation, see the [Regular Expression Arbitrary Design](docs/regex-design.md) document.

## Comparison with Similar Projects

| Feature | FluentCheck | FastCheck | jsverify | ts-quickcheck |
|---------|-------------|-----------|----------|--------------|
| TypeScript Native | ✅ | ⚠️ (Has TS types) | ⚠️ (Has TS types) | ✅ |
| Fluent API | ✅ | ❌ | ❌ | ❌ |
| Shrinking | ✅ | ✅ | ✅ | ❌ |
| Statistical Confidence | ✅ | ❌ | ❌ | ❌ |
| Quantifiers | ✅ | ❌ | ❌ | ❌ |
| Custom Strategies | ✅ | ⚠️ (Limited) | ⚠️ (Limited) | ❌ |
| Active Development | ✅ | ✅ | ❌ | ❌ |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue for discussion.

## Acknowledgements

FluentCheck was inspired by:

- [FastCheck](https://github.com/dubzzz/fast-check)
- [QuickCheck](https://hackage.haskell.org/package/QuickCheck)
- [ScalaCheck](https://www.scalacheck.org/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
