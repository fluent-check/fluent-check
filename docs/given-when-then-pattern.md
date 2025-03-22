# Given-When-Then Pattern

FluentCheck implements a natural, fluent API based on the Given-When-Then pattern for property testing. This pattern provides a readable and intuitive way to define test scenarios, making complex test cases easier to understand, maintain, and communicate.

## Design Philosophy

The Given-When-Then pattern (originally from Behavior-Driven Development) structures tests into three clear phases:

1. **Given**: Set up the initial conditions and inputs
2. **When**: Execute the action or function being tested 
3. **Then**: Verify the expected outcomes or properties

FluentCheck's implementation of this pattern:

- Makes test cases read almost like natural language
- Provides strong typing throughout the testing pipeline
- Clearly separates the generation of test inputs from the verification of properties
- Allows for complex, multi-step test scenarios

## Implementation Details

FluentCheck implements the pattern through a series of fluent method calls:

```typescript
export class FluentCheck<Rec extends ParentRec, ParentRec extends {}> {
  // Given methods for defining inputs
  forall<K extends string, A>(
    arbitraryName: K,
    arbitrary: Arbitrary<A>,
  ): FluentCheck<Record<K, A> & Rec, ParentRec> {
    this.strategy.addArbitrary(arbitraryName, arbitrary)
    return this as unknown as FluentCheck<Record<K, A> & Rec, ParentRec>
  }

  // Conditional inputs
  assuming<R extends Rec>(
    condition: (input: R) => boolean,
  ): FluentCheck<Rec, ParentRec> {
    this.strategy.conditions.push(condition as (input: any) => boolean)
    return this
  }

  // When methods for processing
  map<A, T extends ParentRec = ParentRec>(
    f: (input: Rec) => A,
  ): FluentCheckTransformed<A, Rec, T> {
    // Transform the input and return a new FluentCheck instance
    return new FluentCheckTransformed<A, Rec, T>(f, this)
  }

  // Then methods for assertions
  then(
    property: (input: Rec) => boolean | Promise<boolean>,
  ): FluentCheckResult {
    // Handle the property evaluation
    return this.evaluate(property)
  }
}
```

The core implementation uses TypeScript's type system to ensure type safety between phases:

1. `.forall()` methods add arbitraries and extend the type signature
2. `.assuming()` adds runtime conditions without changing the type
3. `.map()` transforms inputs and potentially changes the type
4. `.then()` accepts a property function matching the accumulated type

The `FluentCheckResult` instance returned by `.then()` provides methods to control test execution:

```typescript
export class FluentCheckResult {
  constructor(
    private readonly checkFn: () => Promise<CheckResult>,
    private readonly rethrow = false,
  ) {}

  async check(): Promise<CheckResult> {
    // Run the test and return the result
    return this.checkFn()
  }

  // Control behavior on failure
  rethrowOnFailure(): FluentCheckResult {
    return new FluentCheckResult(this.checkFn, true)
  }
}
```

## Type Safety

Type information flows through the entire call chain, ensuring that property functions can only access variables that have been defined:

```typescript
const result = fc.scenario()
  .forall('x', fc.integer())
  .forall('y', fc.integer())
  .then(({x, y}) => x + y === y + x) // TypeScript knows x and y are integers
```

The type system even handles transformations:

```typescript
const result = fc.scenario()
  .forall('x', fc.integer())
  .map(({x}) => ({squared: x * x}))
  .then(({squared}) => squared >= 0) // TypeScript knows squared is a number
```

## Practical Usage Examples

Basic property test using the Given-When-Then pattern:

```typescript
fc.scenario()
  .forall('x', fc.integer())
  .forall('y', fc.integer())
  .then(({x, y}) => x + y === y + x)
  .check()
```

Testing with preconditions:

```typescript
fc.scenario()
  .forall('x', fc.integer())
  .forall('y', fc.integer())
  .assuming(({x, y}) => y !== 0)
  .then(({x, y}) => (x / y) * y === x - (x % y))
  .check()
```

Multi-step scenario with transformations:

```typescript
fc.scenario()
  .forall('array', fc.array(fc.integer()))
  .map(({array}) => {
    const sorted = [...array].sort((a, b) => a - b);
    return {original: array, sorted};
  })
  .then(({original, sorted}) => {
    // Array length doesn't change
    if (original.length !== sorted.length) return false;
    
    // Every element from original is in sorted
    for (const item of original) {
      if (!sorted.includes(item)) return false;
    }
    
    // Check sorted property
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] < sorted[i-1]) return false;
    }
    
    return true;
  })
  .check()
```

## Integration with Testing Frameworks

FluentCheck's Given-When-Then pattern integrates smoothly with testing frameworks like Jest:

```typescript
describe('Array sorting', () => {
  test('maintains all elements and sorts them', async () => {
    const result = await fc.scenario()
      .forall('array', fc.array(fc.integer(), 0, 100))
      .map(({array}) => {
        const sorted = [...array].sort((a, b) => a - b);
        return {original: array, sorted};
      })
      .then(({original, sorted}) => {
        // Property checks...
        return original.length === sorted.length &&
               original.every(x => sorted.includes(x)) &&
               [...sorted.keys()].slice(1).every(i => sorted[i] >= sorted[i-1]);
      })
      .check();
    
    expect(result.counterexample).toBeUndefined();
  });
});
```

## Advanced Features

### Dependent Inputs

FluentCheck supports defining arbitraries that depend on previously defined values:

```typescript
fc.scenario()
  .forall('size', fc.integer(1, 100))
  .forall('array', ({size}) => fc.array(fc.integer(), size, size))
  .then(({size, array}) => array.length === size)
  .check()
```

### Asynchronous Properties

The Given-When-Then pattern fully supports asynchronous property functions:

```typescript
fc.scenario()
  .forall('id', fc.integer(1, 1000))
  .then(async ({id}) => {
    const user = await fetchUserById(id);
    return user.id === id;
  })
  .check()
```

### Multiple Property Assertions

Multiple properties can be tested within a single test case:

```typescript
fc.scenario()
  .forall('x', fc.integer())
  .then(({x}) => {
    // Test multiple properties of the result
    const absX = Math.abs(x);
    return (
      absX >= 0 &&
      (x !== 0 ? absX > 0 : absX === 0) &&
      absX === Math.abs(-x)
    );
  })
  .check()
```

## Comparison with Other Frameworks

While most property testing frameworks focus on describing properties as standalone predicates, FluentCheck's Given-When-Then pattern offers several advantages:

1. **Readability**: The code reads more like specifications in natural language
2. **Structure**: Tests have a clear separation of concerns
3. **Composability**: Tests can be built up incrementally
4. **Type Safety**: TypeScript integration provides excellent auto-completion and error checking

Compared to frameworks like fast-check or jsverify, FluentCheck's approach leads to more maintainable and self-documenting tests, particularly for complex scenarios. 