# Smart Shrinking Capabilities

FluentCheck implements an advanced shrinking system that finds simpler counterexamples when a property test fails, making debugging easier and more efficient.

## Design Philosophy

When a property test fails, the initial counterexample is often complex and contains irrelevant details. Shrinking aims to find the simplest possible counterexample that still fails the property. FluentCheck's shrinking system is:

1. **Type-aware**: Shrinking respects the type structure of values
2. **Composable**: Shrinking works across composed arbitraries
3. **Customizable**: Users can implement custom shrinking logic
4. **Efficient**: The search space is pruned to avoid combinatorial explosion

## Implementation Details

Shrinking is implemented at the arbitrary level through the `shrink` method:

```typescript
abstract class Arbitrary<A> {
  // ...
  
  /**
   * Given a pick known to falsify a property, returns a new arbitrary with simpler cases to be tested.
   * This is part of FluentCheck's behavior of searching for simpler counter-examples after one is found.
   */
  shrink<B extends A>(_initial: FluentPick<B>): Arbitrary<A> {
    return NoArbitrary
  }
  
  // ...
}
```

The tests verify that shrinking produces simpler values:

```typescript
// From arbitrary.test.ts
it('should return values smaller than what was shrunk', () => {
  expect(fc.scenario()
    .forall('n', fc.integer(0, 100))
    .forall('s', fc.integer(0, 100))
    .given('a', () => fc.integer(0, 100))
    .then(({n, s, a}) => a.shrink({value: s}).sample(n).every(i => i.value < s))
    .and(({n, s, a}) => a.shrink({value: s}).sampleWithBias(n).every(i => i.value < s))
    .check()
  ).to.have.property('satisfiable', true)
})
```

Each arbitrary type implements its own shrinking strategy:

1. **Numbers**: Shrink toward 0 or other "simple" values
2. **Strings**: Shrink by reducing length or complexity
3. **Arrays**: Shrink by removing elements or shrinking individual elements
4. **Objects**: Shrink each property while maintaining the structure

Composite arbitraries like `MappedArbitrary` handle shrinking by leveraging the base arbitrary's shrinking capabilities:

```typescript
class MappedArbitrary<A, B> extends Arbitrary<B> {
  // ...
  
  shrink<C extends B>(initial: FluentPick<C>): Arbitrary<B> {
    if (this.inverseMap) {
      // Use inverse map to shrink the base value
      const possibleAs = this.inverseMap(initial.value)
      // ... shrinking logic
    }
    return NoArbitrary
  }
}
```

Tests show that shrinking works for complex, composed arbitraries:

```typescript
it('should allow shrinking of mapped arbitraries', () => {
  expect(fc.scenario()
    .exists('n', fc.integer(0, 25).map(x => x + 25).map(x => x * 2))
    .forall('a', fc.integer(0, 10))
    .then(({n, a}) => a <= n)
    .check()
  ).to.deep.include({satisfiable: true, example: {n: 50}})
})

it('should allow shrinking of mapped tupples', () => {
  expect(fc.scenario()
    .exists('point', fc.tuple(
      fc.integer(50, 1000).filter(x => x > 100),
      fc.string(1, 10, fc.char('a')).filter(x => x.length > 2))
      .map(([a, b]) => [a * 2, '_'.concat(b)]))
    .check())
    .to.deep.include({satisfiable: true, example: {point: [202, '_aaa']}})
})
```

The shrinking process is guided by the observation that failing counterexamples often form connected regions in the input space. This allows FluentCheck to perform a binary search-like process to find the "boundary" of the failing region.

## Maintaining Invariants During Shrinking

An important aspect of FluentCheck's shrinking is that it maintains invariants established by filters:

```typescript
it('filters should exclude corner cases, even after shrinking', () => {
  expect(fc.scenario()
    .exists('a', fc.integer(-20, 20).filter(a => a !== 0))
    .then(({a}) => a % 11 === 0 && a !== 11 && a !== -11)
    .check()
  ).to.have.property('satisfiable', false)
})
```

Here, even after shrinking, the constraint `a !== 0` is preserved, preventing the shrinking process from producing invalid test cases.

## Practical Applications

Smart shrinking is particularly valuable for:

1. **Complex data structures**: Finding minimal examples of failing nested structures
2. **Edge cases**: Identifying boundary conditions that cause failures
3. **Regression testing**: Documenting the simplest case that fails
4. **Bug reporting**: Providing concise examples for bug reports

## Usage Example

```typescript
// This property will fail for arrays with more than 10 elements
const result = fc.scenario()
  .forall('arr', fc.array(fc.integer()))
  .then(({arr}) => arr.length <= 10)
  .check();

// The shrunk counterexample will likely be an array of exactly 11 elements,
// with each element being the simplest possible value (often 0)
console.log(result.example.arr);  // Something like [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
```

## Size Reduction During Shrinking

The shrinking process can significantly reduce the size of the counterexample:

```typescript
// From arbitrary.test.ts
it('should return the correct size of shrinked integer arbitraries', () => {
  expect(fc.integer(0, 10).shrink({value: 5}).size()).to.have.property('value', 5)
})
```

This test shows that when shrinking from a value of 5, the resulting arbitrary has a size of 5 (representing values 0 through 4), which is exactly what we'd expect - all values less than the original failure point.

## Advanced Shrinking Features

FluentCheck's shrinking system includes:

1. **Multi-step shrinking**: Performing multiple passes to find the simplest example
2. **Structural preservation**: Maintaining invariants during shrinking
3. **Context-aware shrinking**: Using property context to guide the shrinking process
4. **Shrinking with constraints**: Respecting preconditions during shrinking

This is illustrated in the handling of tuple arbitraries, where each component is shrunk while preserving the tuple structure.

## Comparison with Other Frameworks

While many property testing frameworks implement some form of shrinking, FluentCheck's approach is distinguished by its integration with the type system, allowing for more precise and type-safe shrinking operations. Unlike frameworks that use ad-hoc shrinking strategies, FluentCheck's shrinking is built into the arbitrary system, ensuring consistent behavior across different types of values. 