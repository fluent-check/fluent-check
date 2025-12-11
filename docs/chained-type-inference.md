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

FluentCheck uses TypeScript's generic type parameters and type inference to build up the type information through method chaining. The key implementation lies in the `FluentCheck` class and its collaboration with arbitraries and the execution strategy.

### 2.1 Core Types: `Rec`, `WrapFluentPick`, `FluentResult`

At the heart of the type strategy are three families of types:

- **Fluent record (`Rec`)** – the current view of all bound names and their *value* types.
- **Pick-wrapped record (`WrapFluentPick<Rec>`)** – the same shape, but each property wrapped as a `FluentPick`.
- **Result record (`FluentResult<Rec>`)** – the final outcome of a check, including an `example` of type `Rec`.

```typescript
// Value-level record seen by user code
type WrapFluentPick<T> = { [P in keyof T]: FluentPick<T[P]> }
type PickResult<V> = Record<string, FluentPick<V>>
type ValueResult<V> = Record<string, V>

export class FluentResult<Rec extends {} = {}> {
  constructor(
    public readonly satisfiable = false,
    public example: Rec = {} as Rec,
    public readonly seed?: number,
    public skipped: number = 0
  ) {}

  addExample<A>(name: string, value: FluentPick<A>) {
    (this.example as PickResult<A>)[name] = value
  }
}

// Internal helper to go from Record<string, FluentPick<V>>
// back to Record<string, V> while preserving keys.
static unwrapFluentPick<T>(testCase: PickResult<T>): ValueResult<T> {
  const entries = Object.entries(testCase)
    .filter(([, pick]) => pick !== undefined)
    .map(([k, pick]) => [k, pick.value] as const)
  return Object.fromEntries(entries)
}
```

The **runtime flow** is:

1. During sampling, quantifiers manipulate `WrapFluentPick<Rec>` (each binding is a `FluentPick`).
2. Just before user assertions run, `unwrapFluentPick` converts this to a plain `Rec` (values only).
3. When `.check()` completes at the root, the returned `FluentResult<Rec>` exposes `example: Rec`.

This guarantees that:

- The record that callbacks see (`Rec`) is the same record that `FluentResult` exposes.
- The only “boundary” where `FluentPick` is visible is inside the engine, not in user-facing APIs.

### 2.2 FluentCheck: Building `Rec` as an Intersection of Records

```typescript
export class FluentCheck<Rec extends ParentRec, ParentRec extends {}> {
  constructor(
    protected readonly parent: FluentCheck<ParentRec, any> | undefined = undefined
  ) {}

  // Core methods that maintain and extend type information
  forall<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec>

  exists<K extends string, A>(name: K, a: Arbitrary<A>): FluentCheck<Rec & Record<K, A>, Rec>

  // Given methods for computing derived values
  given<K extends string, V>(name: K, v: V | ((args: Rec) => V)): FluentCheckGiven<K, V, Rec & Record<K, V>, Rec>

  // Property definition with inferred types
  then(f: (arg: Rec) => boolean): FluentCheckAssert<Rec, ParentRec>
}
```

The type parameters `<Rec extends ParentRec, ParentRec extends {}>` track:

1. `Rec`: The current record type, which gets extended with each `.forall()` or `.given()` call
2. `ParentRec`: The parent record type for handling nested scenarios and type safety

The `.forall()` method extends the record type with each new arbitrary:

```typescript
// When called like this:
fc.scenario()
  .forall('x', fc.integer())
  .forall('y', fc.string())

// The type becomes:
// FluentCheck<{x: number} & {y: string}, {x: number}>
```

### 2.3 Scenario AST: Type-Safe Structure

The scenario structure captures type information in the AST:

```typescript
// Quantifier nodes in the Scenario AST
export interface ForallNode<A = unknown> {
  readonly type: 'forall'
  readonly name: string
  readonly arbitrary: Arbitrary<A>
}

export interface ExistsNode<A = unknown> {
  readonly type: 'exists'
  readonly name: string
  readonly arbitrary: Arbitrary<A>
}

// The Scenario preserves quantifier information
export interface Scenario<Rec extends {} = {}> {
  readonly nodes: readonly ScenarioNode<Rec>[]
  readonly quantifiers: readonly QuantifierNode[]
  readonly hasExistential: boolean
  readonly searchSpaceSize: number
}
```

When compiled to `ExecutableScenario`, quantifier operations are extracted:

```typescript
export interface ExecutableQuantifier<A = unknown> {
  readonly name: string
  readonly type: 'forall' | 'exists'
  sample(sampler: Sampler, count: number): FluentPick<A>[]
  sampleWithBias(sampler: Sampler, count: number): FluentPick<A>[]
  shrink(pick: FluentPick<A>, sampler: Sampler, count: number): FluentPick<A>[]
  isShrunken(candidate: FluentPick<A>, current: FluentPick<A>): boolean
}
```

### 2.4 Strategy Bindings: Type Boundary

The strategy factory and sampler work with type-erased bindings at runtime:

```typescript
// Runtime shape: map from quantifier name to pick values
export type BoundTestCase<Rec> = {
  [K in keyof Rec]: FluentPick<Rec[K]>
}
```

From the type system's perspective:

- `FluentCheck` knows that `Rec` contains `K: A`.
- The `Scenario` and `ExecutableScenario` preserve the type relationship.
- At runtime, `BoundTestCase<Rec>` maintains the type mapping from names to values.
- The `Explorer` and `Shrinker` work with generic `Rec` type parameters.

## Gaps and Future Improvements

Even with the current design, there are a few intentional "escape hatches" where type information is erased. These are the main places we want to improve to provide a **complete advanced type experience**.

### 1. FluentCheck Parent/Recursion Typing Uses `any`

- **Current state**
  - Parent references and path tracking use `any`:
    ```ts
    constructor(
      protected readonly parent: FluentCheck<ParentRec, any> | undefined = undefined
    ) {}

    protected pathFromRoot(): FluentCheck<any, any>[] { /* ... */ }

    class FluentCheckAssert<Rec extends ParentRec, ParentRec extends {}> extends FluentCheck<Rec, ParentRec> {
      preliminaries: FluentCheck<unknown, any>[]
      // ...
    }
    ```
  - This keeps the recursive type graph simple but loses information about how `Rec` evolves along the chain.
- **Impact**
  - Internal helpers like `pathFromRoot` and `preliminaries` can’t express the exact `Rec`/`ParentRec` relationships.
  - It doesn’t affect user-facing types, but it limits compiler help inside the engine.
- **Future direction**
  - Replace `any` in parent references and `pathFromRoot` with a dedicated base type (e.g. `FluentCheckBase`) or a constrained generic that preserves more structure.

### 2. `FluentCheck.check` Callback Uses `WrapFluentPick<any>`

- **Current state**
  - The `check` method accepts a callback typed with `any`:
    ```ts
    check(
      child: (testCase: WrapFluentPick<any>) => FluentResult<Record<string, unknown>> =
        () => new FluentResult(true)
    ): FluentResult<Rec> { /* ... */ }
    ```
  - In practice, `child` is always called with `WrapFluentPick<Rec>`, but the type does not encode this.
- **Impact**
  - TypeScript cannot verify that callers pass callbacks compatible with `Rec`.
  - This affects internal callers (templates, tests) more than end users.
- **Future direction**
  - After tightening parent recursion, update the signature to:
    ```ts
    check(
      child: (testCase: WrapFluentPick<Rec>) => FluentResult<Record<string, unknown>>
    ): FluentResult<Rec>
    ```
  - This will likely require small adjustments in templates/tests to use `Rec` consistently.

### 3. `FluentPick` Original Value Uses `any`

- **Current state**
  - `FluentPick` erases the type of the original value:
    ```ts
    export type FluentPick<V> = {
      value: V
      original?: any
    }
    ```
  - For many arbitraries, `original` is the same type as `V`, but mapping/shrinking may change it.
- **Impact**
  - Internal code that inspects `original` has no type-level guarantees.
  - This is mostly an internal concern, but it’s a clear type hole.
- **Future direction**
  - Introduce a second type parameter:
    ```ts
    export type FluentPick<V, O = V> = {
      value: V
      original?: O
    }
    ```
  - Gradually update arbitraries that preserve originals (`O = V`) vs. those that transform them (`O` differs from `V`).

### 4. Bridges That Use `Record<string, unknown>`

- **Current state**
  - Several bridging layers (especially `FluentProperty` and templates) use loose records:
    ```ts
    // FluentProperty.check
    let chain: FluentCheck<Record<string, unknown>, Record<string, unknown>> = checker as ...

    const wrappedPredicate = (args: Record<string, unknown>): boolean => { /* ... */ }

    // Templates
    interface CheckableTemplate {
      check(): FluentResult<Record<string, unknown>>
      // ...
    }
    ```
  - These are convenient but throw away specific `Rec` shapes that are known locally.
- **Impact**
  - Type inference for positional arguments in `prop` and some templates is weaker than it could be internally, even though user-facing generics (`Args`) are correct.
- **Recent improvement**
  - `prop`/`FluentPropertyImpl` now use a generic rest tuple, so internal storage is typed as:
    ```ts
    readonly #arbitraries: { [I in keyof Args]: Arbitrary<Args[I]> }
    ```
  - The public `FluentProperty<Args>` interface remains strongly typed.
- **Future direction**
  - Generalize `CheckableTemplateImpl` and its `buildScenario` callback to carry a concrete `Rec` type instead of `FluentCheck<any, any>`.
  - Keep the external `CheckableTemplate` API simple (`FluentResult<Record<string, unknown>>` or `FluentResult<Rec>` with a generic), while making internal composition fully typed.

---

These gaps do **not** affect the user-facing type guarantees for `Rec` (what you see in `.then(({ x, y }) => …)`), but they are the primary areas where the internal implementation still falls back to `any`/`unknown`. Future changes can progressively tighten these without affecting the public API.

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
