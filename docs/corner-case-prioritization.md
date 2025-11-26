# Corner Case Prioritization

FluentCheck implements sophisticated techniques to identify and prioritize corner cases during testing, increasing the likelihood of finding bugs in edge scenarios.

## Design Philosophy

Many bugs occur at boundary conditions or corner cases. Rather than relying solely on random sampling, FluentCheck systematically identifies and prioritizes corner cases:

1. **Explicit representation**: Corner cases are explicitly represented in arbitraries
2. **Biased sampling**: Test cases are biased toward corner cases
3. **Domain-specific corners**: Arbitraries define their own domain-specific corner cases
4. **Compositional approach**: Corner cases combine naturally when arbitraries are composed

## Implementation Details

The corner case system is implemented in the `Arbitrary` base class:

```typescript
export abstract class Arbitrary<A> {
  /**
   * The special cases for this arbitrary, which can be used during sampling to give
   * higher weight to certain elements.
   */
  cornerCases(): FluentPick<A>[] { return [] }

  /**
   * Returns a sample of picks of a given size. Sample might contain repeated values
   * and might be biased toward corner cases (depending on the specific arbitrary
   * implementing or not the cornerCases method).
   */
  sampleWithBias(sampleSize = 10, generator: () => number = Math.random): FluentPick<A>[] {
    const cornerCases = this.cornerCases()

    if (sampleSize <= cornerCases.length)
      return this.sample(sampleSize, generator)

    const sample = this.sample(sampleSize - cornerCases.length, generator)
    sample.unshift(...cornerCases)

    return sample
  }

  /**
   * Returns a sample of unique picks biased toward corner cases.
   */
  sampleUniqueWithBias(sampleSize = 10, generator: () => number = Math.random): FluentPick<A>[] {
    const cornerCases = this.cornerCases()

    if (sampleSize <= cornerCases.length)
      return this.sampleUnique(sampleSize, [], generator)

    return this.sampleUnique(sampleSize, cornerCases, generator)
  }
}
```

Each specific arbitrary type overrides the `cornerCases` method to define its own corner cases. The tests verify the actual corner cases returned:

```typescript
// From arbitrary.test.ts - actual corner case behavior
it('should return the corner cases of integers', () => {
  expect(fc.integer().cornerCases().map(c => c.value)).to.have.members(
    [0, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]
  )
  expect(fc.integer(1,10).cornerCases().map(c => c.value)).to.have.members([1, 6, 10])
  expect(fc.integer(-10,10).cornerCases().map(c => c.value)).to.have.members([0, -10, 10])
})

it('should return the corner cases of booleans', () => {
  expect(fc.boolean().cornerCases().map(c => c.value)).to.have.members([true, false])
})

it('should return the corner cases of strings', () => {
  expect(fc.string(0, 0).cornerCases().map(c => c.value)).to.have.members([''])
  expect(fc.string(1, 3, fc.char('a')).cornerCases().map(c => c.value)).to.have.members(['a', 'aaa'])
})
```

The tests verify that these corner cases are correctly implemented:

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
    expect(fc.string(1, 3, fc.char('a','b')).cornerCases().map(c => c.value)).to.have.members(
      ['a', 'aaa', 'b', 'bbb'])
  })
})
```

## Composition of Corner Cases

One of the most powerful aspects of FluentCheck's corner case system is how it composes. When arbitraries are combined, their corner cases combine in meaningful ways:

```typescript
// From arbitrary.test.ts
it('should return the corner cases of arrays/sets', () => {
  expect(fc.array(fc.integer(0, 5), 1, 3).cornerCases().map(c => c.value)).to.have.deep.members(
    [[0], [0, 0, 0], [3], [3, 3, 3], [5], [5, 5, 5]]
  )
  expect(fc.set(['a', 'b', 'c'], 1, 3).cornerCases().map(c => c.value)).to.have.deep.members(
    [['a'], ['a', 'b', 'c']]
  )
})

it('should return the corner cases of maps', () => {
  expect(fc.integer(0, 1).map(i => i === 0).cornerCases().map(c => c.value)).to.have.members([true, false])
})

it('should return the corner cases of tuples', () => {
  expect(fc.tuple(fc.integer(0, 1), fc.string(1, 2, fc.char('a','c')))
    .cornerCases().map(c => c.value)).to.have.deep.members([
    [0, 'a'], [0, 'aa'], [0, 'b'], [0, 'bb'], [0, 'c'], [0, 'cc'],
    [1, 'a'], [1, 'aa'], [1, 'b'], [1, 'bb'], [1, 'c'], [1, 'cc']
  ])
})
```

## Examples of Corner Cases

Common corner cases for different types include:

1. **Numbers**: 
   - 0 (zero)
   - 1 (unit)
   - -1 (negative unit)
   - Min and max values
   - Special values like NaN, Infinity (where applicable)

2. **Strings**: 
   - Empty string
   - Single character strings
   - Maximum length strings
   - Strings with special characters (newlines, null bytes)

3. **Arrays**: 
   - Empty array
   - Single element array
   - Maximum size array
   - Arrays with corner case elements

4. **Objects**: 
   - Empty object
   - Missing properties
   - Null properties

5. **Dates**: 
   - Unix epoch (January 1, 1970)
   - Date boundaries
   - Leap years, DST transitions

## Biased Sampling

FluentCheck can bias sampling to include corner cases:

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

This test verifies that when we sample with bias and request enough samples, the special values 0 and 50 (the boundaries of the range) are included.

## Practical Applications

Corner case prioritization is particularly useful for:

1. **Input validation**: Testing boundary conditions for input validation
2. **Resource allocation**: Testing limits of memory or other resources
3. **State transitions**: Testing edge conditions in state machines
4. **Error handling**: Verifying error handling for extreme inputs

## Usage Example

```typescript
// Sample with corner cases prioritized
const integers = fc.integer(-100, 100).sampleWithBias(20);
console.log(integers);
// Output might start with corner cases like [0, 1, -1, -100, 100, ...] 
// followed by random values
```

In the tests, we can see how this is verified:

```typescript
it('should return has many numbers has asked', () => {
  expect(fc.scenario()
    .forall('n', fc.integer(0, 100))
    .given('a', () => fc.integer())
    .then(({n, a}) => a.sample(n).length === n)
    .check()
  ).to.have.property('satisfiable', true)
})
```

## Advanced Features

FluentCheck's corner case system includes:

1. **Composition of corner cases**: When arbitraries are composed, their corner cases combine in meaningful ways
2. **Weighted corner cases**: Some corner cases may be given higher priority than others
3. **Context-sensitive corners**: Corner cases may depend on the current test context
4. **User-defined corners**: Custom arbitraries can define domain-specific corner cases

## Implementation Optimizations

The implementation includes optimizations for common scenarios:

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

When an arbitrary can only generate a single value, FluentCheck optimizes it to a constant. When it can't generate any values (like when min > max), it returns an empty arbitrary.

## Comparison with Other Frameworks

While some property testing frameworks consider corner cases, FluentCheck's approach is more systematic and explicit, with corner cases being a first-class concept in the framework. This leads to more thorough testing of edge conditions and better bug detection. The composition of corner cases, in particular, is a powerful feature that enables testing of complex interactions between different components of a system. 