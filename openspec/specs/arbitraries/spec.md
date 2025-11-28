# Arbitraries

## Purpose

Data generators for property-based testing that produce random values and support shrinking.
## Requirements
### Requirement: Arbitrary Base Class

The system SHALL provide an abstract `Arbitrary<A>` base class that all data generators extend or implement.

#### Scenario: Abstract methods
- **WHEN** a new Arbitrary is implemented
- **THEN** it MUST implement `size()`, `pick(generator)`, and `canGenerate(pick)` methods

### Requirement: Integer Arbitrary

The system SHALL provide an `integer(min?, max?)` function that creates an arbitrary generating integers within a range.

#### Scenario: Generate bounded integers
- **WHEN** `fc.integer(0, 100)` is called
- **THEN** all generated values SHALL be integers in [0, 100]

#### Scenario: Default bounds
- **WHEN** `fc.integer()` is called without arguments
- **THEN** the range defaults to [MIN_SAFE_INTEGER, MAX_SAFE_INTEGER]

#### Scenario: Empty range
- **WHEN** `fc.integer(10, 5)` is called (min > max)
- **THEN** NoArbitrary SHALL be returned

#### Scenario: Single value
- **WHEN** `fc.integer(5, 5)` is called (min === max)
- **THEN** a constant arbitrary SHALL be returned

### Requirement: Real Arbitrary

The system SHALL provide a `real(min?, max?)` function that creates an arbitrary generating real numbers within a range.

#### Scenario: Generate bounded reals
- **WHEN** `fc.real(-1.0, 1.0)` is called
- **THEN** all generated values SHALL be real numbers in [-1.0, 1.0]

### Requirement: Natural Number Arbitrary

The system SHALL provide a `nat(min?, max?)` function that creates an arbitrary generating non-negative integers.

#### Scenario: Generate natural numbers
- **WHEN** `fc.nat()` is called
- **THEN** all generated values SHALL be >= 0

#### Scenario: Negative max returns empty
- **WHEN** `fc.nat(0, -5)` is called
- **THEN** NoArbitrary SHALL be returned

### Requirement: Boolean Arbitrary

The system SHALL provide a `boolean()` function that creates an arbitrary generating true/false values.

#### Scenario: Generate booleans
- **WHEN** `fc.boolean()` is called
- **THEN** the arbitrary generates both `true` and `false` values

### Requirement: String Arbitraries

The system SHALL provide string generation functions with various character sets.

#### Scenario: char function
- **WHEN** `fc.char('a', 'z')` is called
- **THEN** single characters in the range 'a' to 'z' are generated

#### Scenario: string function
- **WHEN** `fc.string(5, 10)` is called
- **THEN** strings of length 5-10 are generated using printable characters

#### Scenario: ascii function
- **WHEN** `fc.ascii()` is called
- **THEN** single ASCII characters are generated

#### Scenario: unicode function
- **WHEN** `fc.unicode()` is called
- **THEN** unicode characters are generated

#### Scenario: hex function
- **WHEN** `fc.hex()` is called
- **THEN** hexadecimal digit characters (0-9, a-f) are generated

#### Scenario: base64 function
- **WHEN** `fc.base64()` is called
- **THEN** base64 alphabet characters are generated

### Requirement: Array Arbitrary

The system SHALL provide an `array(arbitrary, min?, max?)` function that creates arrays of generated values.

#### Scenario: Generate bounded arrays
- **WHEN** `fc.array(fc.integer(), 1, 5)` is called
- **THEN** arrays of 1-5 integers are generated

#### Scenario: Empty range
- **WHEN** `fc.array(fc.integer(), 5, 1)` is called (min > max)
- **THEN** NoArbitrary SHALL be returned

### Requirement: Set Arbitrary

The system SHALL provide a `set(elements, min?, max?)` function that creates subsets of the given elements, preserving literal types when called with literal arrays.

#### Scenario: Generate subsets
- **WHEN** `fc.set([1, 2, 3, 4, 5], 2, 3)` is called
- **THEN** arrays of 2-3 unique elements from the input are generated

#### Scenario: Literal type preservation
- **WHEN** `fc.set(['red', 'green', 'blue'], 1, 2)` is called with literal values
- **THEN** the inferred type SHALL be `Arbitrary<('red' | 'green' | 'blue')[]>`

### Requirement: Tuple Arbitrary

The system SHALL provide a `tuple(...arbitraries)` function that creates tuples of generated values with strict tuple type inference.

#### Scenario: Generate typed tuples
- **WHEN** `fc.tuple(fc.integer(), fc.string(), fc.boolean())` is called
- **THEN** tuples of type `[number, string, boolean]` are generated

#### Scenario: Strict tuple inference
- **WHEN** arbitrary combinators are composed with `tuple()`
- **THEN** TypeScript SHALL infer exact tuple types in all contexts

### Requirement: Constant Arbitrary

The system SHALL provide a `constant(value)` function that always generates the same value.

#### Scenario: Generate constant
- **WHEN** `fc.constant(42)` is called
- **THEN** the value 42 is always generated

### Requirement: OneOf Combinator

The system SHALL provide an `oneof(elements)` function that generates one of the given values, preserving literal types when called with literal arrays.

#### Scenario: Generate from set
- **WHEN** `fc.oneof(['a', 'b', 'c'])` is called
- **THEN** one of 'a', 'b', or 'c' is generated each time

#### Scenario: Empty array
- **WHEN** `fc.oneof([])` is called
- **THEN** NoArbitrary SHALL be returned

#### Scenario: Literal type preservation
- **WHEN** `fc.oneof(['pending', 'active', 'done'])` is called with literal values
- **THEN** the inferred type SHALL be `Arbitrary<'pending' | 'active' | 'done'>`
- **AND** exhaustive switch statements on generated values SHALL be type-safe

### Requirement: Union Combinator

The system SHALL provide a `union(...arbitraries)` function that combines multiple arbitraries.

#### Scenario: Union of arbitraries
- **WHEN** `fc.union(fc.integer(0, 10), fc.integer(90, 100))` is called
- **THEN** values from either range are generated

#### Scenario: Single arbitrary
- **WHEN** `fc.union(fc.integer())` is called with one arbitrary
- **THEN** that arbitrary is returned directly

### Requirement: Date/Time Arbitraries

The system SHALL provide date and time generation functions.

#### Scenario: date function
- **WHEN** `fc.date(new Date('2020-01-01'), new Date('2020-12-31'))` is called
- **THEN** Date objects within the range are generated

#### Scenario: time function
- **WHEN** `fc.time()` is called
- **THEN** time objects with hour, minute, second, millisecond are generated

#### Scenario: datetime function
- **WHEN** `fc.datetime()` is called
- **THEN** Date objects with full datetime precision are generated

#### Scenario: duration function
- **WHEN** `fc.duration(48)` is called
- **THEN** duration objects up to 48 hours are generated

### Requirement: Time Utilities

The system SHALL provide utility functions for working with time and duration.

#### Scenario: Convert to milliseconds
- **WHEN** `fc.timeToMilliseconds(timeObj)` is called
- **THEN** the total duration in milliseconds is returned

### Requirement: Regex Arbitrary

The system SHALL provide a `regex(pattern, maxLength?)` function that generates strings matching a regular expression.

#### Scenario: Generate from pattern
- **WHEN** `fc.regex(/\d{3}-\d{4}/)` is called
- **THEN** strings matching the phone number pattern are generated

#### Scenario: Respect maxLength
- **WHEN** `fc.regex(/\w+/, 10)` is called
- **THEN** generated strings SHALL not exceed 10 characters

### Requirement: Pattern Generators

The system SHALL provide pre-built generators for common patterns via `fc.patterns`.

#### Scenario: email pattern
- **WHEN** `fc.patterns.email()` is called
- **THEN** valid email address strings are generated

#### Scenario: uuid pattern
- **WHEN** `fc.patterns.uuid()` is called
- **THEN** valid UUID v4 strings are generated

#### Scenario: ipv4 pattern
- **WHEN** `fc.patterns.ipv4()` is called
- **THEN** valid IPv4 address strings are generated

#### Scenario: url pattern
- **WHEN** `fc.patterns.url()` is called
- **THEN** valid URL strings are generated

### Requirement: Map Transformation

The system SHALL provide a `map(f, shrinkHelper?)` method to transform generated values.

#### Scenario: Transform values
- **WHEN** `fc.integer().map(n => n * 2)` is called
- **THEN** all generated values are doubled

#### Scenario: Inverse map for shrinking
- **WHEN** `map(f, {inverseMap: f'})` is provided
- **THEN** shrinking can work backwards through the transformation

### Requirement: Filter Transformation

The system SHALL provide a `filter(predicate)` method to constrain generated values.

#### Scenario: Filter values
- **WHEN** `fc.integer().filter(n => n % 2 === 0)` is called
- **THEN** only even numbers are generated

#### Scenario: Corner cases filtered
- **WHEN** a filter is applied
- **THEN** corner cases that don't pass the filter SHALL be excluded

### Requirement: Chain Transformation

The system SHALL provide a `chain(f)` method for dependent arbitrary generation.

#### Scenario: Dependent generation
- **WHEN** `fc.integer(1, 10).chain(n => fc.array(fc.string(), n, n))` is called
- **THEN** arrays whose length depends on the generated integer are produced

### Requirement: Corner Cases

The system SHALL provide corner case values with higher priority during sampling.

#### Scenario: Integer corner cases
- **WHEN** sampling from `fc.integer(0, 100)`
- **THEN** values like 0, 1, and 100 SHALL be included as corner cases

#### Scenario: Boolean corner cases
- **WHEN** sampling from `fc.boolean()`
- **THEN** both `true` and `false` SHALL be corner cases

#### Scenario: String corner cases
- **WHEN** sampling from `fc.string(0, 10)`
- **THEN** the empty string SHALL be a corner case

#### Scenario: Array corner cases
- **WHEN** sampling from `fc.array(fc.integer(), 0, 10)`
- **THEN** the empty array SHALL be a corner case

### Requirement: Sampling Methods

The system SHALL provide multiple sampling methods for generating test cases.

#### Scenario: sample method
- **WHEN** `arbitrary.sample(10)` is called
- **THEN** 10 picks are returned (may contain duplicates)

#### Scenario: sampleUnique method
- **WHEN** `arbitrary.sampleUnique(10)` is called
- **THEN** up to 10 unique picks are returned

#### Scenario: sampleWithBias method
- **WHEN** `arbitrary.sampleWithBias(10)` is called
- **THEN** corner cases are included at the start of the sample

#### Scenario: sampleUniqueWithBias method
- **WHEN** `arbitrary.sampleUniqueWithBias(10)` is called
- **THEN** unique picks with corner case bias are returned

### Requirement: Size Estimation

The system SHALL provide size information for arbitraries using a discriminated union type for exact and estimated sizes.

#### Scenario: Exact size
- **WHEN** `fc.integer(0, 10).size()` is called
- **THEN** an exact size with value 11 is returned
- **AND** the returned type SHALL be `ExactSize` with only `type` and `value` fields

#### Scenario: Estimated size
- **WHEN** a filtered arbitrary's size is queried
- **THEN** an estimated size with credible interval is returned
- **AND** the returned type SHALL be `EstimatedSize` with `type`, `value`, and `credibleInterval` fields

#### Scenario: Discriminated union type narrowing
- **WHEN** code checks `size.type === 'exact'`
- **THEN** TypeScript SHALL narrow the type to exclude `credibleInterval` field access
- **AND** exhaustive switch statements on `size.type` SHALL be type-safe

#### Scenario: Factory functions for size creation
- **WHEN** creating size values programmatically
- **THEN** `exactSize(value)` SHALL return an `ExactSize` object
- **AND** `estimatedSize(value, interval)` SHALL return an `EstimatedSize` object

### Requirement: NoArbitrary Singleton

The system SHALL provide a `NoArbitrary` instance representing an impossible/empty arbitrary.

#### Scenario: Empty factory
- **WHEN** `fc.empty()` is called
- **THEN** the NoArbitrary singleton is returned

#### Scenario: Size is zero
- **WHEN** `NoArbitrary.size()` is called
- **THEN** size value SHALL be 0

#### Scenario: Sample is empty
- **WHEN** `NoArbitrary.sample()` is called
- **THEN** an empty array SHALL be returned

#### Scenario: Vacuous truth for universal
- **WHEN** a forall property uses NoArbitrary
- **THEN** the property SHALL be satisfiable (vacuous truth)

#### Scenario: Unsatisfiable for existential
- **WHEN** an exists property uses NoArbitrary
- **THEN** the property SHALL be unsatisfiable

### Requirement: Integer Preset Factories

The system SHALL provide shorthand factories for common integer ranges.

#### Scenario: Positive integer generation
- **WHEN** `fc.positiveInt()` is called
- **THEN** it SHALL return an arbitrary that generates integers >= 1
- **AND** the maximum value SHALL be `Number.MAX_SAFE_INTEGER`

#### Scenario: Negative integer generation
- **WHEN** `fc.negativeInt()` is called
- **THEN** it SHALL return an arbitrary that generates integers <= -1
- **AND** the minimum value SHALL be `Number.MIN_SAFE_INTEGER`

#### Scenario: Non-zero integer generation
- **WHEN** `fc.nonZeroInt()` is called
- **THEN** it SHALL return an arbitrary that never generates 0
- **AND** it SHALL generate both positive and negative integers

#### Scenario: Byte generation
- **WHEN** `fc.byte()` is called
- **THEN** it SHALL return an arbitrary that generates integers in range [0, 255]

### Requirement: String Preset Factories

The system SHALL provide shorthand factories for common string patterns.

#### Scenario: Non-empty string generation
- **WHEN** `fc.nonEmptyString(maxLength?)` is called
- **THEN** it SHALL return an arbitrary that generates strings with length >= 1
- **AND** the maximum length SHALL default to 100 if not specified

### Requirement: Collection Preset Factories

The system SHALL provide shorthand factories for common collection patterns.

#### Scenario: Non-empty array generation
- **WHEN** `fc.nonEmptyArray(arb, maxLength?)` is called
- **THEN** it SHALL return an arbitrary that generates arrays with length >= 1
- **AND** elements SHALL be generated from the provided arbitrary

#### Scenario: Pair generation
- **WHEN** `fc.pair(arb)` is called
- **THEN** it SHALL return an arbitrary that generates 2-tuples
- **AND** both elements SHALL be generated from the same arbitrary

### Requirement: Nullable/Optional Factories

The system SHALL provide factories for nullable and optional value generation.

#### Scenario: Nullable value generation
- **WHEN** `fc.nullable(arb)` is called
- **THEN** it SHALL return an arbitrary that generates values of type `T | null`
- **AND** it SHALL sometimes generate `null`

#### Scenario: Optional value generation
- **WHEN** `fc.optional(arb)` is called
- **THEN** it SHALL return an arbitrary that generates values of type `T | undefined`
- **AND** it SHALL sometimes generate `undefined`

### Requirement: suchThat Filter Alias

The `Arbitrary` class SHALL provide a `suchThat()` method as an alias for `filter()`.

#### Scenario: suchThat equivalence
- **WHEN** `arbitrary.suchThat(predicate)` is called
- **THEN** it SHALL behave identically to `arbitrary.filter(predicate)`
- **AND** it SHALL return the same type of filtered arbitrary

#### Scenario: suchThat chaining
- **WHEN** `suchThat` is chained with other arbitrary methods
- **THEN** it SHALL work correctly with `map`, `chain`, and other transformations
- **AND** corner cases SHALL be filtered appropriately

### Requirement: Record Arbitrary

The system SHALL provide a `record(schema)` function that creates an arbitrary generating objects from a schema where keys map to arbitraries.

#### Scenario: Generate typed objects

- **WHEN** `fc.record({ name: fc.string(), age: fc.integer(0, 120) })` is called
- **THEN** objects of type `{ name: string, age: number }` are generated
- **AND** each property value SHALL be generated from its corresponding arbitrary

#### Scenario: Type inference from schema

- **WHEN** a record schema is provided with typed arbitraries
- **THEN** TypeScript SHALL infer the exact object type from the schema
- **AND** accessing non-existent properties SHALL be a compile-time error

#### Scenario: Nested records

- **WHEN** `fc.record({ user: fc.record({ name: fc.string() }), active: fc.boolean() })` is called
- **THEN** nested objects are generated with the correct structure

#### Scenario: Empty schema

- **WHEN** `fc.record({})` is called
- **THEN** empty objects `{}` SHALL be generated

#### Scenario: NoArbitrary in schema

- **WHEN** any property arbitrary is `NoArbitrary`
- **THEN** `NoArbitrary` SHALL be returned

#### Scenario: Corner cases

- **WHEN** sampling from a record arbitrary
- **THEN** corner cases SHALL be combinations of property corner cases
- **AND** corner cases SHALL be generated for each property independently

#### Scenario: Shrinking

- **WHEN** shrinking a record value
- **THEN** each property SHALL be shrunk independently
- **AND** shrinking SHALL produce records with one property shrunk at a time

