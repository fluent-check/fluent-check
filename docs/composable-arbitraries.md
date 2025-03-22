# Arbitrary System with Composable Generators

FluentCheck provides a sophisticated system of arbitraries (data generators) that can be composed, transformed, and customized to generate test data for any domain.

## Design Philosophy

Generating representative test data is crucial for effective property testing. FluentCheck's arbitrary system is designed to be:

1. **Composable**: Simple arbitraries can be combined to create complex ones
2. **Type-safe**: The generated values maintain their type information
3. **Extensible**: Users can create custom arbitraries for domain-specific types
4. **Powerful**: Built-in combinators cover a wide range of use cases

## Implementation Details

The arbitrary system is built around the `Arbitrary<A>` abstract class:

```typescript
export abstract class Arbitrary<A> {
  abstract size(): ArbitrarySize
  abstract pick(generator: () => number): FluentPick<A> | undefined
  abstract canGenerate<B extends A>(pick: FluentPick<B>): boolean

  // Composable operations
  map<B>(f: (a: A) => B, shrinkHelper?: XOR<{inverseMap: (b: B) => A[]},{canGenerate: (pick: FluentPick<B>) => boolean}>): Arbitrary<B> {
    return new MappedArbitrary(this, f, shrinkHelper)
  }
  filter(f: (a: A) => boolean): Arbitrary<A> { return new FilteredArbitrary(this, f) }
  chain<B>(f: (a: A) => Arbitrary<B>): Arbitrary<B> { return new ChainedArbitrary(this, f) }

  // Utility methods
  sample(sampleSize = 10, generator: () => number = Math.random): FluentPick<A>[] { /* ... */ }
  sampleUnique(sampleSize = 10, cornerCases: FluentPick<A>[] = [], generator: () => number = Math.random): FluentPick<A>[] { /* ... */ }
  // ...
}
```

FluentCheck provides numerous built-in arbitraries:

```typescript
// Primitive arbitraries
export const boolean = () => new ArbitraryBoolean()
export const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => new ArbitraryInteger(min, max)
export const real = (min = Number.MIN_VALUE, max = Number.MAX_VALUE) => new ArbitraryReal(min, max)

// Container arbitraries
export const array = <T>(arbitrary: Arbitrary<T>, minLength = 0, maxLength = 10) => new ArbitraryArray(arbitrary, minLength, maxLength)
export const set = <T>(arbitrary: Arbitrary<T>, minSize = 0, maxSize = 10) => new ArbitrarySet(arbitrary, minSize, maxSize)
export const tuple = <Ts extends any[]>(...arbitraries: { [K in keyof Ts]: Arbitrary<Ts[K]> }) => new ArbitraryTuple(arbitraries)

// Combinators
export const constant = <T>(v: T) => new ArbitraryConstant(v)
export const oneof = <T>(...arbitraries: Arbitrary<T>[]) => new ArbitraryOneOf(arbitraries)
// ...
```

The tests validate these arbitraries with various properties:

```typescript
// From arbitrary.test.ts
describe('Builders', () => {
  it('should return a constant for strings with no chars', () => {
    expect(fc.string(0, 0)).to.be.deep.equal(fc.constant(''))
  })

  it('should return a constant for integers/reals with min == max', () => {
    expect(fc.integer(123,123)).to.be.deep.equal(fc.constant(123))
    expect(fc.real(123,123)).to.be.deep.equal(fc.constant(123))
  })

  it('should return empty for integers/reals with min > max', () => {
    expect(fc.integer(2,1)).to.be.deep.equal(fc.empty())
    expect(fc.real(2,1)).to.be.deep.equal(fc.empty())
  })
})
```

## Composing Arbitraries

FluentCheck's arbitraries can be combined in various ways:

### Mapping

```typescript
// Generate positive even numbers
const positiveEven = fc.integer(1, 1000).map(n => n * 2)

// Generate user objects
const user = fc.tuple(
  fc.string(5, 20),  // username
  fc.string(10, 30)  // password
).map(([username, password]) => ({ username, password }))
```

Tests show that mapped arbitraries work as expected:

```typescript
// From arbitrary.test.ts
it('should allow booleans to be mappeable', () => {
  expect(fc.scenario()
    .forall('n', fc.integer(10, 100))
    .given('a', () => fc.boolean().map(e => e ? 'Heads' : 'Tails'))
    .then(({a, n}) => a.sampleWithBias(n).some(s => s.value === 'Heads'))
    .and(({a, n}) => a.sampleWithBias(n).some(s => s.value === 'Tails'))
    .check()
  ).to.have.property('satisfiable', true)
})
```

### Filtering

```typescript
// Generate prime numbers
const prime = fc.integer(2, 1000).filter(n => isPrime(n))

// Generate valid email addresses
const email = fc.string().filter(s => isValidEmail(s))
```

Tests demonstrate filtering:

```typescript
// From arbitrary.test.ts
it('should allow integers to be filtered', () => {
  expect(fc.scenario()
    .forall('n', fc.integer(0, 100).filter(n => n < 10))
    .then(({n}) => n < 10)
    .check()
  ).to.have.property('satisfiable', true)
})
```

### Chaining

```typescript
// Generate an array with the same value repeated a random number of times
const repeatedArray = fc.integer(1, 10).chain(n => 
  fc.tuple(...Array(n).fill(fc.integer())).map(arr => 
    Array(n).fill(arr[0])
  )
)
```

### Combining Transformations

Multiple transformations can be chained together:

```typescript
// From arbitrary.test.ts
it('should allow integers to be both mapped and filtered', () => {
  expect(fc.scenario()
    .forall('n', fc.integer(0, 100).map(n => n + 100).filter(n => n < 150))
    .then(({n}) => n >= 100 && n <= 150)
    .check()
  ).to.have.property('satisfiable', true)
})
```

## Size Estimation

FluentCheck can determine the size of arbitrary domains, which is useful for test generation:

```typescript
// From arbitrary.test.ts
describe('Sizes', () => {
  it('size should be exact for exact well-bounded integer arbitraries', () => {
    expect(fc.integer(1, 1000).size()).to.deep.include({value: 1000, type: 'exact'})
    expect(fc.integer(0, 10).size()).to.deep.include({value: 11, type: 'exact'})
    expect(fc.integer(-50, 50).size()).to.deep.include({value: 101, type: 'exact'})
  })

  it('size should be exact for well-bounded mapped arbitraries', () => {
    expect(fc.integer(0, 1).map(i => i === 0).size()).to.deep.include({value: 2, type: 'exact'})
    expect(fc.integer(0, 10).map(i => i * 10).size()).to.deep.include({value: 11, type: 'exact'})
  })
})
```

## Advanced Features

FluentCheck's arbitrary system includes:

### 1. Corner Cases

FluentCheck explicitly represents corner cases for efficient testing:

```typescript
// From arbitrary.test.ts
describe('Corner Cases', () => {
  it('should return the corner cases of integers', () => {
    expect(fc.integer().cornerCases().map(c => c.value)).to.have.members(
      [0, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]
    )
    expect(fc.integer(1,10).cornerCases().map(c => c.value)).to.have.members([1, 6, 10])
    expect(fc.integer(-10,10).cornerCases().map(c => c.value)).to.have.members([0, -10, 10])
    expect(fc.integer(5,5).cornerCases().map(c => c.value)).to.have.members([5])
  })

  it('should return the corner cases of booleans', () => {
    expect(fc.boolean().cornerCases().map(c => c.value)).to.have.members([true, false])
  })

  it('should return the corner cases of strings', () => {
    expect(fc.string(0, 0).cornerCases().map(c => c.value)).to.have.members([''])
    expect(fc.string(1, 3, fc.char('a')).cornerCases().map(c => c.value)).to.have.members(['a', 'aaa'])
  })
})
```

### 2. Biased Sampling

Sampling can be biased toward corner cases:

```typescript
// From arbitrary.test.ts
it('should return corner cases if there is space', () => {
  expect(fc.scenario()
    .forall('n', fc.integer(4, 100))
    .given('a', () => fc.integer(0, 50))
    .then(({n, a}) => a.sampleWithBias(n).some(v => v.value === 0))
    .and(({n, a}) => a.sampleWithBias(n).some(v => v.value === 50))
    .check()
  ).to.have.property('satisfiable', true)
})
```

### 3. Custom Distributions

FluentCheck allows controlling the distribution of generated values.

### 4. Handling Edge Cases

The framework deals gracefully with edge cases:

```typescript
// From arbitrary.test.ts
it('should return the only arbitrary for unions with only one arbitrary', () => {
  expect(fc.union(fc.integer(0,10))).to.be.deep.equal(fc.integer(0, 10))
  expect(fc.union(fc.integer(123,123))).to.be.deep.equal(fc.constant(123))
  expect(fc.union(fc.integer(1,0))).to.be.deep.equal(fc.empty())
})

it('should return no arbitrary for oneofs of no elements', () => {
  expect(fc.oneof([])).to.be.deep.equal(fc.empty())
})
```

## Practical Applications

The composable arbitrary system is particularly useful for:

1. **Domain modeling**: Creating generators that match business constraints
2. **API testing**: Generating valid and invalid inputs for API endpoints
3. **State modeling**: Building complex state machines for system testing
4. **Data generation**: Creating realistic datasets for performance testing

## Comparison with Other Frameworks

While other property testing frameworks offer data generators, FluentCheck's arbitrary system stands out for its composability, type safety, and extensive API, making it more expressive and powerful for complex testing scenarios. The ability to combine operations like mapping, filtering, and chaining, while maintaining type safety, enables far more sophisticated test data generation than is possible with simpler frameworks. 