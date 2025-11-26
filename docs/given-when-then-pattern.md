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
  constructor(
    public strategy: FluentStrategy = new FluentStrategyFactory().defaultStrategy().build(),
    protected readonly parent: FluentCheck<ParentRec, any> | undefined = undefined
  ) {}

  // Given methods for defining inputs (universal quantifier)
  forall<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckUniversal(this, name, a, this.strategy)
  }

  // Existential quantifier
  exists<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckExistential(this, name, a, this.strategy)
  }

  // Given methods for computing derived values
  given<K extends string, V>(name: K, v: V | ((args: Rec) => V)): FluentCheckGiven<K, V, Rec & Record<K, V>, Rec> {
    return v instanceof Function ?
      new FluentCheckGivenMutable(this, name, v, this.strategy) :
      new FluentCheckGivenConstant<K, V, Rec & Record<K, V>, Rec>(this, name, v, this.strategy)
  }

  // When methods for side effects
  when(f: (givens: Rec) => void): FluentCheckWhen<Rec, ParentRec> {
    return new FluentCheckWhen(this, f, this.strategy)
  }

  // Then methods for assertions
  then(f: (arg: Rec) => boolean): FluentCheckAssert<Rec, ParentRec> {
    return new FluentCheckAssert(this, f, this.strategy)
  }
}
```

The core implementation uses TypeScript's type system to ensure type safety between phases:

1. `.forall()` / `.exists()` methods add arbitraries and extend the type signature
2. `.given()` computes derived values and extends the type
3. `.when()` executes side effects without changing the type
4. `.then()` accepts a property function matching the accumulated type

The `FluentResult` class encapsulates test results:

```typescript
export class FluentResult {
  constructor(
    public readonly satisfiable = false,
    public example: PickResult<any> = {},
    public readonly seed?: number
  ) {}

  addExample<A>(name: string, value: FluentPick<A>) {
    this.example[name] = value
  }
}
```

The `check()` method runs the test and returns a `FluentResult`:

```typescript
check(child: (testCase: WrapFluentPick<any>) => FluentResult = () => new FluentResult(true)): FluentResult {
  if (this.parent !== undefined) return this.parent.check(testCase => this.run(testCase, child))
  else {
    this.strategy.randomGenerator.initialize()
    const r = this.run({} as Rec, child)
    return new FluentResult(r.satisfiable, FluentCheck.unwrapFluentPick(r.example),
      this.strategy.randomGenerator.seed)
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
  .check()
```

The type system also handles computed values with `.given()`:

```typescript
const result = fc.scenario()
  .forall('x', fc.integer())
  .given('squared', ({x}) => x * x)
  .then(({x, squared}) => squared >= 0) // TypeScript knows both x and squared are numbers
  .check()
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

Testing with preconditions using filtered arbitraries:

```typescript
// Use filter on the arbitrary rather than a separate precondition method
fc.scenario()
  .forall('x', fc.integer(-100, 100))
  .forall('y', fc.integer(-100, 100).filter(y => y !== 0))  // Precondition via filter
  .then(({x, y}) => (x / y) * y === x - (x % y))
  .check()
```

Multi-step scenario with given computed values:

```typescript
fc.scenario()
  .forall('array', fc.array(fc.integer()))
  .given('sorted', ({array}) => [...array].sort((a, b) => a - b))
  .then(({array, sorted}) => {
    // Array length doesn't change
    if (array.length !== sorted.length) return false;
    
    // Every element from original is in sorted
    for (const item of array) {
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

FluentCheck's Given-When-Then pattern integrates smoothly with testing frameworks like Mocha/Chai:

```typescript
import * as fc from 'fluent-check'
import {expect} from 'chai'

describe('Array sorting', () => {
  it('maintains all elements and sorts them', () => {
    const result = fc.scenario()
      .forall('array', fc.array(fc.integer(), 0, 100))
      .given('sorted', ({array}) => [...array].sort((a, b) => a - b))
      .then(({array, sorted}) => {
        return array.length === sorted.length &&
               array.every(x => sorted.includes(x)) &&
               [...sorted.keys()].slice(1).every(i => sorted[i] >= sorted[i-1]);
      })
      .check();
    
    expect(result).to.have.property('satisfiable', true);
  });
});
```

## Advanced Features

### Chained Arbitraries

FluentCheck supports arbitraries that depend on other values using `.chain()`:

```typescript
fc.scenario()
  .forall('array', fc.integer(1, 10).chain(size => fc.array(fc.integer(), size, size)))
  .then(({array}) => array.length >= 1 && array.length <= 10)
  .check()
```

### Using Given for Computed Values

The `.given()` method allows computing derived values from previously defined inputs:

```typescript
fc.scenario()
  .forall('n', fc.integer(0, 100))
  .given('a', () => fc.integer(0, 50))  // Can also create new arbitraries
  .then(({n, a}) => a.sample(n).every(i => i.value <= 50))
  .check()
```

### Multiple Property Assertions with `.and()`

Multiple properties can be chained using `.and()`:

```typescript
fc.scenario()
  .forall('x', fc.integer())
  .given('absX', ({x}) => Math.abs(x))
  .then(({absX}) => absX >= 0)
  .and(({x, absX}) => x !== 0 ? absX > 0 : absX === 0)
  .and(({x, absX}) => absX === Math.abs(-x))
  .check()
```

## Comparison with Other Frameworks

While most property testing frameworks focus on describing properties as standalone predicates, FluentCheck's Given-When-Then pattern offers several advantages:

1. **Readability**: The code reads more like specifications in natural language
2. **Structure**: Tests have a clear separation of concerns
3. **Composability**: Tests can be built up incrementally
4. **Type Safety**: TypeScript integration provides excellent auto-completion and error checking

Compared to frameworks like fast-check or jsverify, FluentCheck's approach leads to more maintainable and self-documenting tests, particularly for complex scenarios. 