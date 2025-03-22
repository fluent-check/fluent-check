# FluentCheck

A type-safe fluent-based property testing framework specifically designed for TypeScript. FluentCheck combines the power of property-based testing with TypeScript's strong type system to help you write more robust and reliable tests.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/fluent-check/fluent-check/blob/main/LICENSE)

## Overview

FluentCheck is a property-based testing framework inspired by [FastCheck](https://github.com/dubzzz/fast-check) but with a focus on:

- Native TypeScript support with full type safety
- Fluent API for expressive and readable test cases
- Smart search strategies for efficient test case generation
- Statistical confidence calculation
- Comprehensive shrinking capabilities for better counterexample discovery

Property-based testing goes beyond traditional example-based testing by automatically generating test cases based on properties that should hold true for your code. This approach helps uncover edge cases and bugs that might not be discovered through manual testing.

## Installation

```bash
npm install --save-dev fluent-check
```

## Quick Start

Here's a simple example showing how to use FluentCheck to test a basic property:

```typescript
import * as fc from 'fluent-check';
import { expect } from 'chai';

describe('String properties', () => {
  it('should verify that string concatenation length equals sum of individual lengths', () => {
    expect(fc.scenario()
      .forall('a', fc.string())
      .forall('b', fc.string())
      .then(({a, b}) => a.length + b.length === (a + b).length)
      .check()
    ).to.have.property('satisfiable', true);
  });
});
```

## Key Features

### 1. Fluent, Type-Safe API

FluentCheck's fluent API provides a natural way to express properties:

```typescript
fc.scenario()
  .forall('x', fc.integer(0, 100))
  .forall('y', fc.integer(0, 100))
  .then(({x, y}) => x + y === y + x)  // Testing commutativity of addition
  .check()
```

The TypeScript compiler will verify that your properties are correctly typed, catching errors at compile time.

### 2. Universal and Existential Quantifiers

FluentCheck supports both universal and existential quantification:

```typescript
// Universal: For all integers x, x + 0 = x
fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => x + 0 === x)
  .check()

// Existential: There exists a string with length 5
fc.scenario()
  .exists('s', fc.string())
  .then(({s}) => s.length === 5)
  .check()
```

### 3. Rich Set of Arbitraries

FluentCheck provides a comprehensive set of built-in arbitraries (data generators):

- Primitives: `integer`, `real`, `nat`, `boolean`
- Strings: `string`, `char`, `ascii`, `unicode`, `base64`, `hex`
- Containers: `array`, `set`, `tuple`
- Combinators: `oneof`, `union`, `constant`

All arbitraries are composable and can be transformed using `map`, `filter`, and other operations.

### 4. Smart Shrinking

When a test fails, FluentCheck will automatically try to find a simpler counterexample through shrinking:

```typescript
// This property will fail
fc.scenario()
  .forall('n', fc.integer())
  .then(({n}) => n < 1000)
  .check()
// Instead of a random large number, FluentCheck will shrink to 1000
```

### 5. Customizable Testing Strategies

FluentCheck allows you to configure test strategies to control:

```typescript
fc.scenario()
  .config(fc.strategy()
    .withMaxIterations(1000)
    .withSeed(42)
    .withConfidence(0.99))
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()
```

## Advanced Usage

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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

FluentCheck was inspired by:

- [FastCheck](https://github.com/dubzzz/fast-check)
- [QuickCheck](https://hackage.haskell.org/package/QuickCheck)
- [ScalaCheck](https://www.scalacheck.org/)
