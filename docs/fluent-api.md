# Fluent, Type-Safe API

FluentCheck's most distinctive feature is its fluent API that is fully integrated with TypeScript's type system. This design decision delivers several key benefits:

## Design Philosophy

The fluent API pattern allows for expressive, chainable method calls that read more like natural language. When combined with TypeScript's strong typing, this creates a powerful, intuitive, and safe way to express test properties.

```typescript
fc.scenario()
  .forall('x', fc.integer(0, 100))
  .forall('y', fc.integer(0, 100))
  .then(({x, y}) => x + y === y + x)  // Testing commutativity of addition
  .check()
```

As seen in the Math properties tests, this fluent approach enables elegant expression of mathematical properties:

```typescript
// From math.test.ts
it('finds if multiplication is distributive over addition', () => {
  expect(fc.scenario()
    .forall('a', fc.integer(-10, 10))
    .forall('b', fc.integer(-10, 10))
    .forall('c', fc.integer(-10, 10))
    .then(({a, b, c}) => (a + b) * c === a * c + b * c)
    .check()
  ).to.have.property('satisfiable', true)
})
```

## Type Safety Throughout the Chain

Every step in the chain maintains and propagates type information:

1. When you call `.forall('x', fc.integer())`, TypeScript knows that `x` is of type `number`
2. When chaining with `.forall('y', fc.string())`, TypeScript knows about both `x: number` and `y: string`
3. In the `.then()` callback, the parameter is typed as `{x: number, y: string}`

This ensures that all property tests are type-checked at compile time, catching errors early.

## Implementation Details

The implementation uses TypeScript's generic types and record types to build up the context through the chain:

```typescript
export class FluentCheck<Rec extends ParentRec, ParentRec extends {}> {
  constructor(
    public strategy: FluentStrategy = new FluentStrategyFactory().defaultStrategy().build(),
    protected readonly parent: FluentCheck<ParentRec, any> | undefined = undefined
  ) {}

  // Universal quantifier - property must hold for all values
  forall<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckUniversal(this, name, a, this.strategy)
  }

  // Existential quantifier - property must hold for at least one value
  exists<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckExistential(this, name, a, this.strategy)
  }

  // Computed values added to the context
  given<K extends string, V>(name: K, v: V | ((args: Rec) => V)): FluentCheckGiven<K, V, Rec & Record<K, V>, Rec>

  // Side effects before assertions
  when(f: (givens: Rec) => void): FluentCheckWhen<Rec, ParentRec>

  // Property assertion
  then(f: (arg: Rec) => boolean): FluentCheckAssert<Rec, ParentRec>
}
```

Each call to `forall` or `exists` returns a new `FluentCheck` instance with an updated type parameter that includes the new variable name and type. The generic type parameters track:

1. `Rec`: The current record of all variables defined so far
2. `ParentRec`: The previous record, used for maintaining the chain

The result of property tests is encapsulated in the `FluentResult` class:

```typescript
export class FluentResult {
  constructor(
    public readonly satisfiable = false,
    public example: PickResult<any> = {},
    public readonly seed?: number) { }

  addExample<A>(name: string, value: FluentPick<A>) {
    this.example[name] = value
  }
}
```

This allows for rich assertions in tests:

```typescript
// Check if property is satisfiable
expect(result).to.have.property('satisfiable', true);

// Check specific example values
expect(result).to.deep.include({
  satisfiable: true, 
  example: {a: 0}  // Example value that satisfies the property
});

// Check the seed for reproducibility
console.log('Seed for reproduction:', result.seed);
```

## Limitations

While the fluent API with type safety provides an excellent developer experience, it does come with some limitations:

1. Type inference complexity: In rare cases with deeply nested chains, TypeScript might struggle with inference
2. Error messages: When type errors occur, the error messages can be verbose due to the complexity of the types
3. Performance overhead: Building the type chain adds some overhead at compile time

## Comparison with Other Frameworks

Most other property testing frameworks like FastCheck use a more traditional function-based API, which can be less expressive and type-safe. FluentCheck's approach combines the best of both worlds, offering an intuitive API that leverages TypeScript's type system to catch errors early.

For example, in FastCheck you might write:

```typescript
fc.property(fc.integer(), fc.integer(), (a, b) => a + b === b + a)
```

While in FluentCheck, the same property would be:

```typescript
fc.scenario()
  .forall('a', fc.integer())
  .forall('b', fc.integer())
  .then(({a, b}) => a + b === b + a)
  .check()
```

The FluentCheck approach is more verbose but provides named variables, better type inference, and a more readable structure that aligns with how we naturally think about properties. 