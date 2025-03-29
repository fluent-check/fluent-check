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

## Installation

```bash
npm install fluent-check
```

## Basic Usage

```typescript
import { fc } from 'fluent-check';

const result = await fc.scenario()
  .forall('x', fc.integer())
  .forall('y', fc.integer())
  .then(({x, y}) => x + y === y + x)
  .check();

if (result.success) {
  console.log('Property holds!');
} else {
  console.log('Counterexample found:', result.counterexample);
}
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
- **Containers**: `array`, `set`, `tuple`, `record`
- **Combinators**: `oneof`, `union`, `constant`

All arbitraries are composable and can be transformed using `map`, `filter`, and other operations. For complete details, see the [Composable Arbitraries](docs/composable-arbitraries.md) documentation.

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

## Detailed Documentation

For more details on each feature, check out our detailed documentation:

- [Fluent API](docs/fluent-api.md)
- [Quantifiers](docs/quantifiers.md)
- [Given-When-Then Pattern](docs/given-when-then-pattern.md)
- [Statistical Confidence](docs/statistical-confidence.md)
- [Smart Shrinking](docs/smart-shrinking.md)
- [Customizable Strategies](docs/customizable-strategies.md)
- [Composable Arbitraries](docs/composable-arbitraries.md)
- [Chained Type Inference](docs/chained-type-inference.md)
- [Corner Case Prioritization](docs/corner-case-prioritization.md)

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

### Record and Object Testing

FluentCheck provides the `record` arbitrary for generating JavaScript objects with string keys and arbitrary values:

```typescript
// Test object properties
fc.scenario()
  .forall('userRecord', fc.record(fc.string(1, 10), fc.string(5, 20)))
  .then(({userRecord}) => {
    // Property: All keys in generated records are strings
    const allKeysAreStrings = Object.keys(userRecord).every(key => typeof key === 'string')
    
    // Property: All values in generated records match our value type
    const allValuesAreStrings = Object.values(userRecord).every(value => typeof value === 'string')
    
    return allKeysAreStrings && allValuesAreStrings
  })
  .check()

// Test validation logic
fc.scenario()
  .forall('user', fc.record(
    fc.string(), // Key arbitrary
    fc.oneof([fc.string(), fc.integer(), fc.boolean()]), // Value can be different types
    1, // Minimum 1 property
    5  // Maximum 5 properties
  ))
  .then(({user}) => {
    // Implement a validator that validates the record
    const isValidUser = validateUser(user)
    
    // Property: All generated users should pass validation
    return isValidUser
  })
  .check()

// Create complex nested objects
fc.scenario()
  .forall('nestedObject', fc.record(
    fc.string(1, 5), // Keys
    fc.record(fc.string(1, 3), fc.integer(0, 100)), // Values are records themselves
    1, 3 // Size constraints
  ))
  .then(({nestedObject}) => {
    // Property: Working with nested records
    const allNestedValuesAreObjects = Object.values(nestedObject).every(
      value => typeof value === 'object' && value !== null
    )
    
    return allNestedValuesAreObjects
  })
  .check()
```

The `record` arbitrary allows you to:
- Generate objects with a specific key and value type
- Control the minimum and maximum number of entries
- Create nested data structures for complex testing scenarios
- Test validation and transformation logic for JavaScript objects

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
