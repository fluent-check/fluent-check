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
  // Core methods that maintain and extend type information
  forall<K extends string, A>(
    arbitraryName: K,
    arbitrary: Arbitrary<A>,
  ): FluentCheck<Record<K, A> & Rec, ParentRec> {
    this.strategy.addArbitrary(arbitraryName, arbitrary)
    return this as unknown as FluentCheck<Record<K, A> & Rec, ParentRec>
  }

  // Type transformation
  map<A, T extends ParentRec = ParentRec>(
    f: (input: Rec) => A,
  ): FluentCheckTransformed<A, Rec, T> {
    return new FluentCheckTransformed<A, Rec, T>(f, this)
  }

  // Property definition with inferred types
  then(
    property: (input: Rec) => boolean | Promise<boolean>,
  ): FluentCheckResult {
    return this.evaluate(property)
  }
}
```

The type parameters `<Rec extends ParentRec, ParentRec extends {}>` track:

1. `Rec`: The current record type, which gets extended with each `.forall()` call
2. `ParentRec`: The parent record type for handling nested scenarios

The `.forall()` method extends the record type with each new arbitrary:

```typescript
// When called like this:
fc.scenario()
  .forall('x', fc.integer())
  .forall('y', fc.string())

// The type becomes: 
// FluentCheck<{x: number, y: string}, {}>
```

For transformations, FluentCheck uses a specialized class:

```typescript
export class FluentCheckTransformed<A, Rec extends {}, ParentRec extends {}> 
  extends FluentCheck<A, ParentRec> {
  constructor(
    private readonly transform: (input: Rec) => A,
    private readonly parent: FluentCheck<Rec, ParentRec>,
  ) {
    super()
  }

  // Implementation details for transforming the input
}
```

## Type Composition

One of the most powerful aspects of FluentCheck's type system is how it composes types through method chaining. This happens in several ways:

### 1. Record Extension

With each `.forall()` call, the type is extended using TypeScript's intersection types:

```typescript
forall<K extends string, A>(
  arbitraryName: K,
  arbitrary: Arbitrary<A>,
): FluentCheck<Record<K, A> & Rec, ParentRec>
```

This creates a new type that includes all previous properties plus the new one.

### 2. Type Transformation

The `.map()` method enables complete transformation of the type:

```typescript
map<A, T extends ParentRec = ParentRec>(
  f: (input: Rec) => A,
): FluentCheckTransformed<A, Rec, T>
```

TypeScript infers the return type `A` from the provided function, preserving type information.

### 3. Dependent Type Creation

FluentCheck supports defining arbitraries that depend on previously defined values while maintaining type safety:

```typescript
// The function argument is typed with the existing record
forall<K extends string, R extends Rec, A>(
  arbitraryName: K,
  arbitraryFn: (r: R) => Arbitrary<A>,
): FluentCheck<Record<K, A> & Rec, ParentRec>
```

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
```

Transformations with type inference:

```typescript
fc.scenario()
  .forall('numbers', fc.array(fc.integer()))
  .map(({numbers}) => {
    const sum = numbers.reduce((a, b) => a + b, 0);
    const product = numbers.reduce((a, b) => a * b, 1);
    return {sum, product, count: numbers.length};
  })
  .then(({sum, product, count}) => {
    // TypeScript knows:
    // - sum is number
    // - product is number
    // - count is number
    return count === 0 || product/count <= sum;
  })
```

Dependent arbitraries with type inference:

```typescript
fc.scenario()
  .forall('length', fc.integer(1, 100))
  .forall('array', ({length}) => fc.array(fc.integer(), length, length))
  .then(({length, array}) => {
    // TypeScript knows:
    // - length is number
    // - array is number[]
    // - array depends on length
    return array.length === length;
  })
```

Nested scenarios with preserved type information:

```typescript
fc.scenario()
  .forall('outer', fc.integer())
  .mapToScenario(({outer}) => 
    fc.scenario()
      .forall('inner', fc.integer())
      .then(({inner}) => {
        // TypeScript knows both inner and outer
        return inner + outer > 0;
      })
  )
```

## Advanced Type Features

### Union Types from Arbitrary Composition

FluentCheck preserves union types when using combinators:

```typescript
// Define an arbitrary for either numbers or strings
const numOrStr = fc.oneOf([fc.integer(), fc.string()]);

fc.scenario()
  .forall('x', numOrStr)
  .then(({x}) => {
    // TypeScript knows x is number | string
    return typeof x === 'number' || x.length > 0;
  })
```

### Generic Arbitraries

FluentCheck supports generic arbitraries with full type inference:

```typescript
// Define a generic pair arbitrary
function pair<T, U>(first: Arbitrary<T>, second: Arbitrary<U>): Arbitrary<[T, U]> {
  return fc.tuple([first, second]);
}

fc.scenario()
  .forall('pair', pair(fc.integer(), fc.string()))
  .then(({pair}) => {
    // TypeScript knows pair is [number, string]
    const [num, str] = pair;
    return typeof num === 'number' && typeof str === 'string';
  })
```

### Conditional Types

FluentCheck's type system works with TypeScript's conditional types:

```typescript
type IsNumber<T> = T extends number ? true : false;

fc.scenario()
  .forall('x', fc.integer())
  .map(({x}) => {
    // Type is computed based on the input
    const isNumber: IsNumber<typeof x> = true;
    return {value: x, isNumber};
  })
  .then(({value, isNumber}) => {
    // TypeScript knows isNumber is of type true (a literal type)
    return isNumber === true;
  })
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