# Chained Type Inference

FluentCheck leverages TypeScript's advanced type system to provide a strongly-typed fluent interface that preserves type information through method chains. This feature ensures that property-based tests are type-safe, providing excellent developer experience through precise autocompletion and compile-time error detection.

## Design Philosophy

FluentCheck's type inference system is designed with several key principles:

1. **Type Safety**: Catch type errors at compile time rather than runtime
2. **Intellisense Support**: Provide accurate autocompletion and documentation
3. **Progressive Type Building**: Accumulate type information as the test is constructed
4. **Transformation Awareness**: Properly track types through transformations and operations
5. **No Generic Parameters**: Hide implementation details with inferred generic types

## Implementation Details

FluentCheck uses TypeScript's generic type parameters and type inference to build up the type information through method chaining. The key implementation lies in the `FluentCheck` class:

```typescript
export class FluentCheck<Rec extends ParentRec, ParentRec extends {}> {
  constructor(
    public strategy: FluentStrategy = new FluentStrategyFactory().defaultStrategy().build(),
    protected readonly parent: FluentCheck<ParentRec, any> | undefined = undefined
  ) {}

  // Core methods that maintain and extend type information
  forall<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckUniversal(this, name, a, this.strategy)
  }

  exists<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckExistential(this, name, a, this.strategy)
  }

  // Given methods for computing derived values
  given<K extends string, V>(name: K, v: V | ((args: Rec) => V)): FluentCheckGiven<K, V, Rec & Record<K, V>, Rec> {
    return v instanceof Function ?
      new FluentCheckGivenMutable(this, name, v, this.strategy) :
      new FluentCheckGivenConstant<K, V, Rec & Record<K, V>, Rec>(this, name, v, this.strategy)
  }

  // Property definition with inferred types
  then(f: (arg: Rec) => boolean): FluentCheckAssert<Rec, ParentRec> {
    return new FluentCheckAssert(this, f, this.strategy)
  }
}
```

The type parameters `<Rec extends ParentRec, ParentRec extends {}>` track:

1. `Rec`: The current record type, which gets extended with each `.forall()` or `.given()` call
2. `ParentRec`: The parent record type for handling nested scenarios and type safety

The `.forall()` method extends the record type with each new arbitrary by returning a new `FluentCheckUniversal` instance:

```typescript
// When called like this:
fc.scenario()
  .forall('x', fc.integer())
  .forall('y', fc.string())

// The type becomes: 
// FluentCheck<{x: number} & {y: string}, {x: number}>
```

FluentCheck uses specialized subclasses for different quantifiers:

```typescript
// Abstract base for quantifiers
abstract class FluentCheckQuantifier<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}>
  extends FluentCheck<Rec, ParentRec> {
  abstract breakValue: boolean  // false for universal, true for existential
}

// Universal quantifier (forall) - breaks when property fails
class FluentCheckUniversal<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}>
  extends FluentCheckQuantifier<K, A, Rec, ParentRec> {
  breakValue = false
}

// Existential quantifier (exists) - breaks when property succeeds
class FluentCheckExistential<K extends string, A, Rec extends ParentRec & Record<K, A>, ParentRec extends {}>
  extends FluentCheckQuantifier<K, A, Rec, ParentRec> {
  breakValue = true
}
```

## Type Composition

One of the most powerful aspects of FluentCheck's type system is how it composes types through method chaining. This happens in several ways:

### 1. Record Extension

With each `.forall()` call, the type is extended using TypeScript's intersection types:

```typescript
forall<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec>
```

This creates a new type that includes all previous properties plus the new one.

### 2. Given Computed Values

The `.given()` method allows computing derived values that are added to the type context:

```typescript
given<K extends string, V>(name: K, v: V | ((args: Rec) => V)): FluentCheckGiven<K, V, Rec & Record<K, V>, Rec>
```

TypeScript infers the return type `V` from the provided function, preserving type information. This supports both constant values and computed values based on existing context.

### 3. Arbitrary-Level Transformations

FluentCheck supports type transformations at the arbitrary level using `.map()`, `.filter()`, and `.chain()`:

```typescript
// The Arbitrary class provides these transformation methods
abstract class Arbitrary<A> {
  map<B>(f: (a: A) => B, shrinkHelper?: ...): Arbitrary<B>
  filter(f: (a: A) => boolean): Arbitrary<A>
  chain<B>(f: (a: A) => Arbitrary<B>): Arbitrary<B>
}
```

This allows building complex generators while maintaining full type safety.

## Usage Examples

Basic type inference:

```typescript
fc.scenario()
  .forall('x', fc.integer())
  .forall('y', fc.string())
  .then(({x, y}) => {
    // TypeScript knows:
    // - x is number
    // - y is string
    return x.toString() === y;
  })
  .check()
```

Computed values with type inference using `.given()`:

```typescript
fc.scenario()
  .forall('numbers', fc.array(fc.integer()))
  .given('sum', ({numbers}) => numbers.reduce((a, b) => a + b, 0))
  .given('product', ({numbers}) => numbers.reduce((a, b) => a * b, 1))
  .given('count', ({numbers}) => numbers.length)
  .then(({sum, product, count}) => {
    // TypeScript knows:
    // - sum is number
    // - product is number
    // - count is number
    return count === 0 || product / count <= sum;
  })
  .check()
```

Arbitrary-level transformations with chaining:

```typescript
fc.scenario()
  .forall('size', fc.integer(1, 10))
  .forall('array', fc.integer(1, 10).chain(i => fc.array(fc.constant(i), i, i)))
  .then(({size, array}) => {
    // TypeScript knows:
    // - size is number
    // - array is number[]
    return array.length === array[0];
  })
  .check()
```

Mapped arbitraries preserving type information:

```typescript
fc.scenario()
  .forall('point', fc.tuple(fc.integer(0, 100), fc.integer(0, 100))
    .map(([x, y]) => ({ x, y, distance: Math.sqrt(x*x + y*y) })))
  .then(({point}) => {
    // TypeScript knows point has x, y, and distance properties (all numbers)
    return point.distance >= 0;
  })
  .check()
```

## Advanced Type Features

### Union Types from Arbitrary Composition

FluentCheck preserves union types when using combinators:

```typescript
// Define a union arbitrary using fc.union
const numOrBool = fc.union(fc.integer(0, 10), fc.boolean());

fc.scenario()
  .forall('x', numOrBool)
  .then(({x}) => {
    // TypeScript knows x is number | boolean
    return typeof x === 'number' || typeof x === 'boolean';
  })
  .check()
```

### Generic Arbitraries

FluentCheck supports generic arbitraries with full type inference:

```typescript
// Define a generic pair arbitrary using fc.tuple
const pair = fc.tuple(fc.integer(), fc.string());

fc.scenario()
  .forall('pair', pair)
  .then(({pair}) => {
    // TypeScript knows pair is [number, string]
    const [num, str] = pair;
    return typeof num === 'number' && typeof str === 'string';
  })
  .check()
```

### Conditional Types

FluentCheck's type system works with TypeScript's conditional types at the arbitrary level:

```typescript
type IsNumber<T> = T extends number ? true : false;

fc.scenario()
  .forall('x', fc.integer())
  .given('isNumber', ({x}) => {
    // Type is computed based on the input
    const result: IsNumber<typeof x> = true;
    return result;
  })
  .then(({x, isNumber}) => {
    // TypeScript knows isNumber is of type true (a literal type)
    return isNumber === true && typeof x === 'number';
  })
  .check()
```

## Implementation Challenges and Solutions

Implementing chained type inference presents several challenges:

### 1. The "Any" Type Problem

TypeScript's type inference can sometimes result in `any` types, which break type safety. FluentCheck addresses this by using explicit type parameters and constraints:

```typescript
// Without constraints, this could infer "any"
forall<K extends string, A>(
  arbitraryName: K,
  arbitrary: Arbitrary<A>,
): FluentCheck<Record<K, A> & Rec, ParentRec>
```

### 2. Circular Type References

Circular type references can occur when types refer to themselves. FluentCheck breaks these cycles using separate interfaces and implementation classes.

### 3. Type Widening

TypeScript can sometimes "widen" specific literal types to more general types. FluentCheck uses explicit type annotations and `as const` assertions to preserve literal types when needed.

## Comparison with Other Frameworks

While some property testing frameworks provide basic type support, FluentCheck's implementation offers several advantages:

1. **Progressive Type Building**: Types evolve with the fluent interface, unlike many frameworks that require upfront generic parameters.
2. **Transformation Support**: Full type tracking through transformations and combinations.
3. **Dependent Type Support**: Types can depend on previously defined values.
4. **No Manual Type Annotations**: Types are inferred automatically in most cases.

Fast-check, for example, requires manually specifying tuples for multiple inputs, while FluentCheck builds these types automatically through the fluent interface. 