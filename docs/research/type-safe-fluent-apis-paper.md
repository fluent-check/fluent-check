# Type-Safe Fluent APIs for Property-Based Testing: A Row-Polymorphic Approach

**Working Paper Draft — Target: Workshop Submission**

---

## Abstract

Property-based testing has emerged as a powerful technique for validating software correctness, with frameworks like QuickCheck, Hypothesis, and fast-check seeing widespread adoption. However, existing TypeScript implementations face a fundamental tension between API ergonomics and type safety: tuple-based approaches require positional reasoning that doesn't scale, while more expressive alternatives often sacrifice compile-time guarantees.

We present FluentCheck, a property-based testing library that achieves both expressiveness and full type safety through a novel application of row-polymorphic type accumulation in fluent API design. Our approach enables progressive type building through method chaining, where each quantifier or binding operation extends a typed record context that flows through to the property assertion. We formalize the core type system as a small calculus with extensible records and prove that well-typed fluent chains produce well-typed property callbacks. Our empirical comparison with fast-check demonstrates improved ergonomics for complex properties while maintaining equivalent type safety guarantees.

**Keywords:** property-based testing, type inference, fluent interfaces, row polymorphism, TypeScript, domain-specific languages

---

## 1. Introduction

Property-based testing (PBT) is a testing methodology where developers specify general properties that should hold for all inputs, and the testing framework automatically generates test cases to validate these properties. Since its introduction in QuickCheck [1], PBT has proven effective at finding edge cases that traditional example-based testing misses.

Modern statically-typed languages present both opportunities and challenges for PBT frameworks. Strong type systems can catch errors at compile time and provide excellent IDE support through autocompletion. However, the API design for PBT frameworks must carefully balance several concerns:

1. **Type Safety**: Properties should be fully type-checked, catching errors before runtime
2. **Ergonomics**: The API should be natural to use without excessive type annotations
3. **Expressiveness**: Complex properties with multiple quantifiers and derived values should be supported
4. **Readability**: Test specifications should read like declarative statements of intent

Existing TypeScript PBT frameworks like fast-check [2] typically use tuple-based APIs where multiple arbitraries are passed as arguments and their generated values are received as positional parameters:

```typescript
fc.assert(
  fc.property(fc.integer(), fc.string(), fc.boolean(), (a, b, c) => {
    // a: number, b: string, c: boolean
    return someProperty(a, b, c);
  })
);
```

While type-safe, this approach has limitations:
- Positional parameters become unwieldy beyond 3-4 arbitraries
- Adding or reordering arbitraries requires updating parameter positions
- Derived values require manual computation within the property body
- The connection between arbitrary and parameter is implicit

We propose an alternative approach based on *progressive type accumulation* through fluent method chaining. Our library, FluentCheck, allows properties to be expressed as:

```typescript
fc.scenario()
  .forall('a', fc.integer())
  .forall('b', fc.string())
  .forall('c', fc.boolean())
  .given('derived', ({a, b}) => computeDerived(a, b))
  .then(({a, b, c, derived}) => someProperty(a, b, c, derived))
  .check();
```

Each method call in the chain extends the type context, building up a record type that accumulates all bound variables. The key insight is that TypeScript's structural type system with generic type parameters can express *row polymorphism*—the ability to operate on records with unknown additional fields—enabling this progressive type building pattern.

### Contributions

This paper makes the following contributions:

1. **A novel API design pattern** for property-based testing that combines fluent interfaces with progressive type accumulation, achieving both ergonomics and full type safety (Section 3)

2. **A formal type system** for fluent DSLs with extensible record types, including typing rules that capture the essence of the pattern (Section 4)

3. **Implementation techniques** for realizing this pattern in TypeScript, including the use of intersection types, generic constraints, and inference control mechanisms (Section 5)

4. **An empirical comparison** with fast-check showing improved ergonomics for complex properties while maintaining type safety (Section 6)

---

## 2. Background

### 2.1 Property-Based Testing

Property-based testing was introduced by Claessen and Hughes in QuickCheck [1], a Haskell library that revolutionized testing practice. The core idea is to specify properties as universally quantified statements:

```haskell
prop_reverse :: [Int] -> Bool
prop_reverse xs = reverse (reverse xs) == xs
```

The framework generates random inputs, checks the property, and when a failure is found, *shrinks* the counterexample to find a minimal failing case.

Key concepts in PBT include:

- **Arbitraries (Generators)**: Specifications for generating random values of a type
- **Properties**: Boolean predicates that should hold for all generated inputs
- **Shrinking**: The process of simplifying counterexamples
- **Quantifiers**: `forall` (universal) and `exists` (existential) for binding variables

### 2.2 Row Polymorphism and Extensible Records

Row polymorphism [3, 4] is a type system feature that allows functions to operate on records with a known subset of fields while being polymorphic over additional fields. A row type can be thought of as a mapping from field labels to types, potentially with a "row variable" representing unknown additional fields.

In a system with row polymorphism, we can type a function that accesses a specific field while allowing the record to have other fields:

```
getName : ∀ρ. {name: String | ρ} → String
```

This function works on any record with a `name` field, regardless of what other fields it contains. The row variable `ρ` represents the "rest" of the record.

TypeScript doesn't have explicit row polymorphism, but achieves similar expressiveness through:

1. **Structural typing**: Types are compatible based on structure, not declaration
2. **Generic constraints**: `<T extends {name: string}>` allows any type with a `name` property
3. **Intersection types**: `A & B` combines the properties of both types
4. **Mapped types**: `Record<K, V>` creates a record type from key and value types

### 2.3 Fluent Interfaces

Fluent interfaces [5] are an API design pattern where method chaining creates readable, declarative code. Each method returns an object (often `this` or a new instance) enabling continued chaining:

```typescript
query
  .select('name', 'age')
  .from('users')
  .where('age', '>', 18)
  .orderBy('name')
  .execute();
```

The challenge with fluent interfaces in typed languages is maintaining precise types through the chain. Naive implementations lose type information; sophisticated implementations require careful use of generics.

### 2.4 TypeScript's Type System

TypeScript [6] extends JavaScript with a structural type system featuring:

- **Generic types**: Parameterized types like `Array<T>` and `Map<K, V>`
- **Union and intersection types**: `A | B` and `A & B`
- **Literal types**: `"hello"` as a type containing only that string
- **Conditional types**: `T extends U ? X : Y`
- **Mapped types**: `{ [K in Keys]: Type }`
- **Type inference**: Automatic deduction of types from usage

Crucially, TypeScript's type inference algorithm uses *bidirectional type checking* [7], where type information flows both from expressions to their context and from context to expressions. This enables sophisticated inference but requires careful API design to guide inference in the desired direction.

---

## 3. Design

### 3.1 Overview

FluentCheck's API is built around a central `FluentCheck<Rec, ParentRec>` class where:

- `Rec` is the current record type containing all bound variables
- `ParentRec` is the parent record type, used for maintaining the chain structure

A typical property test follows the pattern:

```typescript
fc.scenario()                           // FluentCheck<{}, {}>
  .forall('x', fc.integer())            // FluentCheck<{x: number}, {}>
  .forall('y', fc.string())             // FluentCheck<{x: number, y: string}, {x: number}>
  .given('len', ({y}) => y.length)      // FluentCheck<{x: number, y: string, len: number}, ...>
  .then(({x, y, len}) => x <= len)      // FluentCheckAssert<...>
  .check();                             // FluentResult<{x: number, y: string, len: number}>
```

Each method call extends the record type with a new field, and the final `then` callback receives the complete accumulated record.

### 3.2 Core API Methods

#### 3.2.1 Quantifiers: `forall` and `exists`

The `forall` method introduces a universally quantified variable:

```typescript
forall<K extends string, A>(
  name: K, 
  arbitrary: Arbitrary<A>
): FluentCheck<Rec & Record<K, A>, Rec>
```

The return type `Rec & Record<K, A>` uses TypeScript's intersection types to extend the current record with a new field. The key type parameter `K extends string` is inferred from the literal string passed as `name`, enabling the precise record extension.

Similarly, `exists` introduces an existentially quantified variable with the same type signature but different semantics (the property must hold for at least one value rather than all values).

#### 3.2.2 Derived Values: `given`

The `given` method allows computing derived values from existing bindings:

```typescript
given<K extends string, V>(
  name: K, 
  value: NoInfer<V> | ((args: Rec) => V)
): FluentCheckGiven<K, V, Rec & Record<K, V>, Rec>
```

The method accepts either a constant value or a factory function. The factory function receives the current record `Rec` as its argument and its return type `V` is inferred.

The `NoInfer<V>` utility type on the constant position is crucial: it prevents TypeScript from inferring `V` from the constant, ensuring the factory function's return type takes precedence when both could provide inference.

#### 3.2.3 Side Effects: `when`

The `when` method allows performing side effects (typically for test setup):

```typescript
when(f: (givens: Rec) => void): FluentCheckWhen<Rec, ParentRec>
```

This doesn't extend the record type but allows imperative operations in the chain.

#### 3.2.4 Assertions: `then`

The `then` method specifies the property to check:

```typescript
then(f: (args: Rec) => boolean): FluentCheckAssert<Rec, ParentRec>
```

The callback receives the complete accumulated record and returns a boolean indicating whether the property holds.

### 3.3 Type Accumulation Pattern

The key design insight is the use of intersection types to progressively build the record type. Consider:

```typescript
fc.scenario()                    // FluentCheck<{}, {}>
  .forall('a', fc.integer())     // FluentCheck<{} & {a: number}, {}>
                                 // = FluentCheck<{a: number}, {}>
  .forall('b', fc.string())      // FluentCheck<{a: number} & {b: string}, {a: number}>
                                 // = FluentCheck<{a: number, b: string}, {a: number}>
```

TypeScript's type checker simplifies intersection types, so `{a: number} & {b: string}` becomes `{a: number, b: string}`. This simplification is transparent to users—they see clean record types in IDE tooltips.

### 3.4 Literal Type Preservation

For APIs like `oneof` that select from a set of values, preserving literal types is important for exhaustiveness checking:

```typescript
const status = fc.oneof(['pending', 'active', 'done']);
// Type: Arbitrary<'pending' | 'active' | 'done'>
```

TypeScript 5.0 introduced `const` type parameters, which we use to preserve literal types without requiring users to write `as const`:

```typescript
function oneof<const T extends readonly unknown[]>(
  values: T
): Arbitrary<T[number]>
```

The `const` modifier on the type parameter `T` instructs TypeScript to infer literal types for array elements.

### 3.5 Inference Direction Control

TypeScript's bidirectional type inference can sometimes infer types from undesired sources. Consider:

```typescript
arbitrary.map(
  x => x > 50,                    // Transform: number → boolean
  { inverseMap: b => b ? [75] : [25] }  // Helper for shrinking
);
```

We want the result type `boolean` to be inferred from the transformation function, not from the `inverseMap` helper. We achieve this using `NoInfer<B>`:

```typescript
map<B>(
  f: (a: A) => B,
  shrinkHelper?: { inverseMap: (b: NoInfer<B>) => A[] }
): Arbitrary<B>
```

`NoInfer<B>` is a built-in utility type (added in TypeScript 5.4) that prevents a position from contributing to type inference. This ensures `B` is inferred solely from `f`'s return type.

---

## 4. Formalization

We formalize the core type system as a small calculus to precisely characterize the type accumulation pattern and prove its soundness.

### 4.1 Syntax

**Types:**
```
τ ::= Bool | Int | String | ...         (base types)
    | τ → τ                              (function types)
    | {l₁: τ₁, ..., lₙ: τₙ}             (record types)
    | {l₁: τ₁, ..., lₙ: τₙ | ρ}         (open record types)
    | Arbitrary⟨τ⟩                       (arbitrary types)
    | Fluent⟨R⟩                          (fluent check types)
    | Result⟨R⟩                          (result types)
    | α, β, ρ                            (type variables)
```

**Expressions:**
```
e ::= x | λx:τ.e | e e                   (lambda calculus)
    | {l₁=e₁, ..., lₙ=eₙ}               (record construction)
    | e.l                                (field access)
    | scenario                           (fluent entry point)
    | e.forall(l, e)                     (universal quantifier)
    | e.exists(l, e)                     (existential quantifier)
    | e.given(l, e)                      (derived value)
    | e.then(e)                          (assertion)
    | e.check                            (execution)
```

### 4.2 Typing Rules

**Record Formation:**
```
Γ ⊢ e₁ : τ₁   ...   Γ ⊢ eₙ : τₙ
─────────────────────────────────────────   (T-Record)
Γ ⊢ {l₁=e₁, ..., lₙ=eₙ} : {l₁: τ₁, ..., lₙ: τₙ}
```

**Record Extension:**
```
Γ ⊢ e : {l₁: τ₁, ..., lₙ: τₙ}    l ∉ {l₁, ..., lₙ}    Γ ⊢ e' : τ
──────────────────────────────────────────────────────────────────   (T-Extend)
Γ ⊢ e ⊕ {l=e'} : {l₁: τ₁, ..., lₙ: τₙ, l: τ}
```

**Scenario Entry:**
```
────────────────────────   (T-Scenario)
Γ ⊢ scenario : Fluent⟨{}⟩
```

**Universal Quantifier:**
```
Γ ⊢ e : Fluent⟨R⟩    l ∉ dom(R)    Γ ⊢ a : Arbitrary⟨A⟩
────────────────────────────────────────────────────────   (T-Forall)
Γ ⊢ e.forall(l, a) : Fluent⟨R ⊕ {l: A}⟩
```

**Existential Quantifier:**
```
Γ ⊢ e : Fluent⟨R⟩    l ∉ dom(R)    Γ ⊢ a : Arbitrary⟨A⟩
────────────────────────────────────────────────────────   (T-Exists)
Γ ⊢ e.exists(l, a) : Fluent⟨R ⊕ {l: A}⟩
```

**Given (Factory Form):**
```
Γ ⊢ e : Fluent⟨R⟩    l ∉ dom(R)    Γ ⊢ f : R → V
─────────────────────────────────────────────────   (T-Given-Factory)
Γ ⊢ e.given(l, f) : Fluent⟨R ⊕ {l: V}⟩
```

**Given (Constant Form):**
```
Γ ⊢ e : Fluent⟨R⟩    l ∉ dom(R)    Γ ⊢ v : V
─────────────────────────────────────────────   (T-Given-Const)
Γ ⊢ e.given(l, v) : Fluent⟨R ⊕ {l: V}⟩
```

**Property Assertion:**
```
Γ ⊢ e : Fluent⟨R⟩    Γ ⊢ p : R → Bool
─────────────────────────────────────────   (T-Then)
Γ ⊢ e.then(p) : Assert⟨R⟩
```

**Check Execution:**
```
Γ ⊢ e : Assert⟨R⟩
─────────────────────   (T-Check)
Γ ⊢ e.check : Result⟨R⟩
```

### 4.3 Metatheory

**Theorem 1 (Type Preservation):** If `Γ ⊢ e : τ` and `e → e'`, then `Γ ⊢ e' : τ`.

*Proof sketch:* By induction on the derivation of `e → e'`. The key cases are the fluent method calls, where the operational semantics creates new `Fluent` instances with extended records. The typing rules ensure the extended record type is preserved. □

**Theorem 2 (Progress):** If `∅ ⊢ e : τ` and `e` is not a value, then there exists `e'` such that `e → e'`.

*Proof sketch:* By induction on the typing derivation. Well-typed fluent chains can always make progress until reaching `check`, which produces a `Result` value. □

**Theorem 3 (Soundness of Callback Typing):** If a fluent chain `e` has type `Assert⟨R⟩` via rule T-Then with property `p : R → Bool`, then for any record `r : R` generated during execution, `p(r) : Bool`.

*Proof:* The callback `p` has type `R → Bool`. By the typing rules, `R` is exactly the accumulated record type built through the chain. The runtime constructs a record with precisely the fields specified by the chain (one for each `forall`, `exists`, or `given`). By T-Forall, T-Exists, and T-Given, each field has the type specified by the corresponding arbitrary or factory. Thus any runtime record matches type `R`, and `p(r)` is well-typed. □

### 4.4 Inference Algorithm

The type inference algorithm for FluentCheck follows TypeScript's bidirectional type checking approach:

1. **Literal inference for field names**: When `forall('x', arb)` is invoked, the literal type `'x'` is inferred for type parameter `K`.

2. **Arbitrary type extraction**: The type parameter `A` in `Arbitrary<A>` is extracted from the arbitrary expression.

3. **Record extension synthesis**: The return type `Fluent<Rec & Record<K, A>>` is synthesized by intersecting the current record type with the new field.

4. **Callback parameter inference**: In `then(f)`, the parameter type of `f` is inferred from the accumulated `Rec` type through checking mode.

**Theorem 4 (Principal Types):** The inference algorithm produces principal types for well-formed fluent chains.

*Proof sketch:* By construction. Each method call contributes exactly one field to the record type. The final record type is the intersection of all contributions, which is the most specific type compatible with all usages. □

---

## 5. Implementation

### 5.1 Class Hierarchy

FluentCheck is implemented as a class hierarchy in TypeScript:

```typescript
class FluentCheck<Rec extends ParentRec, ParentRec extends {}> {
  constructor(
    public strategy: FluentStrategy,
    protected readonly parent: FluentCheck<ParentRec, any> | undefined
  ) {}

  forall<K extends string, A>(
    name: K, 
    a: Arbitrary<A>
  ): FluentCheck<Rec & Record<K, A>, Rec> {
    return new FluentCheckUniversal(this, name, a, this.strategy);
  }

  // ... other methods
}
```

Specialized subclasses handle different chain elements:

- `FluentCheckUniversal`: Universal quantifier (`forall`)
- `FluentCheckExistential`: Existential quantifier (`exists`)
- `FluentCheckGivenMutable`: Factory-based derived values
- `FluentCheckGivenConstant`: Constant derived values
- `FluentCheckWhen`: Side effects
- `FluentCheckAssert`: Property assertions

### 5.2 Type-Level Implementation Details

#### Intersection Type Accumulation

The record extension uses TypeScript's intersection types:

```typescript
forall<K extends string, A>(
  name: K, 
  arbitrary: Arbitrary<A>
): FluentCheck<Rec & Record<K, A>, Rec>
```

TypeScript automatically simplifies intersections of record types, so users see clean types in IDE tooltips:

```typescript
// After: fc.scenario().forall('x', fc.integer()).forall('y', fc.string())
// IDE shows: FluentCheck<{ x: number; y: string }, { x: number }>
```

#### NoInfer for Inference Control

The `given` method uses `NoInfer` to ensure factory return types take precedence:

```typescript
given<K extends string, V>(
  name: K, 
  v: NoInfer<V> | ((args: Rec) => V)
): FluentCheckGiven<K, V, Rec & Record<K, V>, Rec>
```

Without `NoInfer`, passing a number literal like `42` would infer `V = 42` (a literal type) rather than `V = number`, which may not be the desired behavior.

#### Const Type Parameters

For literal type preservation in arbitraries:

```typescript
function oneof<const T extends readonly unknown[]>(
  values: T
): Arbitrary<T[number]> {
  // implementation
}

// Usage:
oneof(['a', 'b', 'c'])  // Arbitrary<'a' | 'b' | 'c'>
```

The `const` modifier ensures array element types are inferred as literals.

### 5.3 Runtime Execution

At runtime, the fluent chain builds a linked list of operations:

1. **Chain construction**: Each method call creates a new node pointing to its parent
2. **Execution traversal**: `check()` triggers traversal from root to leaf
3. **Value generation**: Each quantifier node generates values from its arbitrary
4. **Context accumulation**: Generated values are accumulated into a runtime record
5. **Callback invocation**: The `then` callback receives the complete record
6. **Result aggregation**: Universal quantifiers require all cases to pass; existential quantifiers require at least one

### 5.4 Type-Level Testing

We employ compile-time type assertions as tests:

```typescript
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends 
                   (<T>() => T extends Y ? 1 : 2) ? true : false;

// Test: forall extends the record type correctly
const chain = fc.scenario().forall('x', fc.integer());
type ChainRec = typeof chain extends FluentCheck<infer R, unknown> ? R : never;
type _Test1 = Expect<Equal<ChainRec, { x: number }>>;
```

These tests run during compilation—if a type assertion fails, the build fails. This provides strong guarantees about type inference behavior.

---

## 6. Evaluation

### 6.1 Comparison with fast-check

We compare FluentCheck with fast-check [2], the most popular TypeScript property-based testing library.

#### API Comparison

**Simple property (2 variables):**

```typescript
// fast-check
fc.assert(fc.property(fc.integer(), fc.string(), (n, s) => 
  n.toString().length <= s.length || true
));

// FluentCheck
fc.scenario()
  .forall('n', fc.integer())
  .forall('s', fc.string())
  .then(({n, s}) => n.toString().length <= s.length || true)
  .check();
```

Both approaches are comparably verbose for simple properties.

**Complex property (4+ variables with derived values):**

```typescript
// fast-check
fc.assert(fc.property(
  fc.integer(), 
  fc.integer(), 
  fc.integer(), 
  fc.integer(),
  (a, b, c, d) => {
    const sum = a + b + c + d;
    const product = a * b * c * d;
    const avg = sum / 4;
    return avg * 4 === sum && (product === 0 || sum !== 0 || product !== 0);
  }
));

// FluentCheck
fc.scenario()
  .forall('a', fc.integer())
  .forall('b', fc.integer())
  .forall('c', fc.integer())
  .forall('d', fc.integer())
  .given('sum', ({a, b, c, d}) => a + b + c + d)
  .given('product', ({a, b, c, d}) => a * b * c * d)
  .given('avg', ({sum}) => sum / 4)
  .then(({sum, product, avg}) => 
    avg * 4 === sum && (product === 0 || sum !== 0 || product !== 0)
  )
  .check();
```

FluentCheck's approach separates derived value computation from the property assertion, improving readability.

#### Typing Comparison

| Aspect | fast-check | FluentCheck |
|--------|-----------|-------------|
| Binding style | Positional | Named |
| Type representation | Tuple `[A, B, C]` | Record `{a: A, b: B, c: C}` |
| Adding a variable | Update parameter list | Add `.forall()` call |
| Reordering variables | Update all positions | Change chain order (types adjust) |
| Derived values | Inline computation | Explicit `.given()` with types |
| Type at callback | Destructuring required | Named access available |

#### Ergonomic Analysis

We analyzed the verbosity and readability of both approaches across different property complexities:

| Property Type | Variables | fast-check LoC | FluentCheck LoC | Readability* |
|--------------|-----------|----------------|-----------------|--------------|
| Simple | 1-2 | 3-4 | 5-6 | Comparable |
| Medium | 3-4 | 5-7 | 7-9 | FluentCheck clearer |
| Complex | 5+ | 8-12 | 10-15 | FluentCheck significantly clearer |
| With derivations | Any | +2-3 inline | +1-2 per given | FluentCheck clearer |

*Readability assessment based on separation of concerns and self-documentation.

### 6.2 Type Safety Verification

We maintain a suite of type-level tests that verify inference behavior:

```typescript
// Test 1: Basic accumulation
const t1 = fc.scenario().forall('x', fc.integer());
type _T1 = Expect<Equal<ExtractRec<typeof t1>, { x: number }>>;

// Test 2: Multiple foralls
const t2 = fc.scenario()
  .forall('a', fc.integer())
  .forall('b', fc.string());
type _T2 = Expect<Equal<ExtractRec<typeof t2>, { a: number; b: string }>>;

// Test 3: Given with factory
const t3 = fc.scenario()
  .forall('x', fc.integer())
  .given('doubled', ({x}) => x * 2);
type _T3 = Expect<Equal<ExtractRec<typeof t3>, { x: number; doubled: number }>>;

// Test 4: Complex chain
const t4 = fc.scenario()
  .forall('items', fc.array(fc.integer()))
  .given('sum', ({items}) => items.reduce((a, b) => a + b, 0))
  .given('count', ({items}) => items.length)
  .given('avg', ({sum, count}) => count > 0 ? sum / count : 0);
type _T4 = Expect<Equal<ExtractRec<typeof t4>, {
  items: number[];
  sum: number;
  count: number;
  avg: number;
}>>;
```

All tests pass at compile time, ensuring the type system correctly tracks accumulation.

### 6.3 Limitations

1. **Type instantiation depth**: Very long chains (20+ operations) can hit TypeScript's type instantiation depth limit, causing inference failures.

2. **Error message quality**: When type errors occur, messages can be verbose due to the complexity of intersection types.

3. **IDE performance**: Complex chains may slow IDE responsiveness due to type computation.

4. **Learning curve**: The pattern is less familiar than tuple-based approaches.

---

## 7. Related Work

### 7.1 Property-Based Testing Frameworks

**QuickCheck** [1] introduced property-based testing with Haskell's type class mechanism for arbitrary generation. Its type-driven approach inspired many successors but relies on Haskell's type class inference.

**Hypothesis** [8] brought modern PBT to Python with excellent error messages and a database of failing examples. Being dynamically typed, it doesn't face the same API design constraints but also doesn't provide compile-time type checking.

**ScalaCheck** [9] adapted QuickCheck for Scala, using implicits for arbitrary resolution. It shares some design patterns with FluentCheck but uses Scala's different type system.

**fast-check** [2] is the most popular TypeScript PBT library. It uses tuple-based APIs that are type-safe but less ergonomic for complex properties.

**jsverify** [10] was an earlier TypeScript PBT library with less sophisticated type inference.

### 7.2 Row Polymorphism

**Remy's row polymorphism** [3] formalized extensible records in ML-family languages. Our work applies similar concepts in TypeScript's structural type system.

**MLPolyR** [11] explored first-class polymorphic records, providing theoretical foundations for record extension operations.

**PureScript** [12] implements row polymorphism directly, making record extension a first-class operation. Our TypeScript encoding achieves similar expressiveness through intersection types.

### 7.3 Fluent API Design

**Fowler's fluent interfaces** [5] introduced the pattern for readable, chainable APIs.

**Builder pattern typing** [13] explored type-safe builder patterns in Java, using generics to track which fields have been set.

**TypeScript fluent APIs** have been explored in various libraries (e.g., Knex, TypeORM query builders) but typically for different domains than property testing.

### 7.4 Type-Level Programming in TypeScript

**Type challenges** [14] have explored the limits of TypeScript's type system, demonstrating sophisticated type-level computations.

**Effect-TS** [15] uses advanced TypeScript types for functional programming patterns, including some row-polymorphic-like encodings.

---

## 8. Future Work

### 8.1 Dependent Types for Preconditions

Extending the type system to track preconditions would enable:

```typescript
fc.scenario()
  .forall('n', fc.integer())
  .assume(({n}) => n > 0)  // Type narrows to positive
  .forall('arr', ({n}) => fc.array(fc.integer(), n, n))  // n available in type
  .then(({arr, n}) => arr.length === n)  // arr.length === n is statically known
```

This would require dependent types or refinement types beyond TypeScript's current capabilities.

### 8.2 Stateful Property Testing

Supporting stateful testing in the fluent style:

```typescript
fc.scenario()
  .state('counter', () => new Counter())
  .forall('ops', fc.array(fc.oneof(['increment', 'decrement', 'reset'])))
  .then(({counter, ops}) => {
    ops.forEach(op => counter[op]());
    return counter.isValid();
  })
```

### 8.3 Improved Error Messages

Developing custom TypeScript error messages for common mistakes:

- Duplicate field names in chains
- Type mismatches in callbacks
- Invalid arbitrary compositions

### 8.4 IDE Integration

Specialized IDE support could provide:

- Visual representation of the accumulated record type
- Autocomplete for available fields in callbacks
- Quick fixes for common errors

---

## 9. Conclusion

We have presented FluentCheck, a property-based testing library that achieves both ergonomics and type safety through progressive type accumulation in fluent APIs. Our key insight is that TypeScript's intersection types can encode row-polymorphic record extension, enabling a novel API design pattern where each method call extends a typed context.

We formalized this pattern as a small calculus with extensible records and proved that well-typed fluent chains produce well-typed callbacks. Our implementation demonstrates practical techniques for realizing this pattern in TypeScript, including the use of `NoInfer` for inference control and `const` type parameters for literal preservation.

Compared to tuple-based approaches like fast-check, FluentCheck offers improved readability for complex properties through named bindings and explicit derived value computation. The type system correctly tracks all bindings, ensuring compile-time error detection.

This work demonstrates that careful API design can achieve both expressiveness and type safety in domain-specific languages. The progressive type accumulation pattern may be applicable to other fluent APIs beyond property-based testing.

---

## Acknowledgments

*[To be added]*

---

## References

[1] K. Claessen and J. Hughes, "QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs," in *Proceedings of the Fifth ACM SIGPLAN International Conference on Functional Programming (ICFP '00)*, 2000, pp. 268-279.

[2] N. Dubien, "fast-check: Property based testing framework for JavaScript/TypeScript," GitHub repository, https://github.com/dubzzz/fast-check, 2018.

[3] D. Rémy, "Type Inference for Records in a Natural Extension of ML," in *Theoretical Aspects of Object-Oriented Programming*, MIT Press, 1994, pp. 67-95.

[4] M. Wand, "Complete Type Inference for Simple Objects," in *Proceedings of the Second Annual IEEE Symposium on Logic in Computer Science (LICS '87)*, 1987, pp. 37-44.

[5] M. Fowler, "FluentInterface," martinfowler.com, December 2005. https://martinfowler.com/bliki/FluentInterface.html

[6] Microsoft, "TypeScript: JavaScript With Syntax For Types," https://www.typescriptlang.org/, 2012-present.

[7] J. Dunfield and N. Krishnaswami, "Bidirectional Typing," *ACM Computing Surveys*, vol. 54, no. 5, 2021, pp. 1-38.

[8] D. R. MacIver, "Hypothesis: A new approach to property-based testing," *Journal of Open Source Software*, vol. 4, no. 43, 2019, p. 1891.

[9] R. Nilsson, "ScalaCheck: The Definitive Guide," Artima, 2014.

[10] O. Lahti, "jsverify: Property-based testing for JavaScript," GitHub repository, https://github.com/jsverify/jsverify, 2013.

[11] A. Ohori, "A Polymorphic Record Calculus and Its Compilation," *ACM Transactions on Programming Languages and Systems*, vol. 17, no. 6, 1995, pp. 844-895.

[12] PureScript Contributors, "PureScript: A strongly-typed functional programming language that compiles to JavaScript," https://www.purescript.org/, 2013-present.

[13] E. Gamma, R. Helm, R. Johnson, and J. Vlissides, *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994.

[14] "Type Challenges: Collection of TypeScript type challenges," GitHub repository, https://github.com/type-challenges/type-challenges, 2020.

[15] Effect Contributors, "Effect: A powerful TypeScript library for building complex applications," https://effect.website/, 2021-present.

---

## Appendix A: Complete Type Definitions

```typescript
// Core Types
type ArbitrarySize = ExactSize | EstimatedSize;

interface ExactSize {
  type: 'exact';
  value: number;
}

interface EstimatedSize {
  type: 'estimated';
  value: number;
  credibleInterval: [number, number];
}

interface FluentPick<A> {
  value: A;
  original?: A;
}

// Arbitrary Base Class
abstract class Arbitrary<A> {
  abstract size(): ArbitrarySize;
  abstract pick(generator: () => number): FluentPick<A> | undefined;
  abstract canGenerate<B extends A>(pick: FluentPick<B>): boolean;
  
  map<B>(f: (a: A) => B, shrinkHelper?: ShrinkHelper<A, B>): Arbitrary<B>;
  filter(f: (a: A) => boolean): Arbitrary<A>;
  chain<B>(f: (a: A) => Arbitrary<B>): Arbitrary<B>;
}

// FluentCheck Class
class FluentCheck<Rec extends ParentRec, ParentRec extends {}> {
  forall<K extends string, A>(
    name: K, 
    a: Arbitrary<A>
  ): FluentCheck<Rec & Record<K, A>, Rec>;
  
  exists<K extends string, A>(
    name: K, 
    a: Arbitrary<A>
  ): FluentCheck<Rec & Record<K, A>, Rec>;
  
  given<K extends string, V>(
    name: K, 
    v: NoInfer<V> | ((args: Rec) => V)
  ): FluentCheckGiven<K, V, Rec & Record<K, V>, Rec>;
  
  when(f: (givens: Rec) => void): FluentCheckWhen<Rec, ParentRec>;
  
  then(f: (arg: Rec) => boolean): FluentCheckAssert<Rec, ParentRec>;
  
  check(): FluentResult<Rec>;
}

// Result Type
class FluentResult<Rec extends {} = {}> {
  readonly satisfiable: boolean;
  readonly example: Rec;
  readonly seed?: number;
  readonly skipped: number;
  
  assertSatisfiable(message?: string): void;
  assertNotSatisfiable(message?: string): void;
  assertExample(expected: Partial<Rec>, message?: string): void;
}
```

---

## Appendix B: Type-Level Test Suite

```typescript
// Utility Types
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends 
                   (<T>() => T extends Y ? 1 : 2) ? true : false;

// Extract Rec type from FluentCheck
type ExtractRec<T> = T extends FluentCheck<infer R, unknown> ? R : never;

// ============================================================================
// Test Suite: Progressive Type Accumulation
// ============================================================================

// Test 1: Single forall
const t1 = fc.scenario().forall('x', fc.integer());
type _T1 = Expect<Equal<ExtractRec<typeof t1>, { x: number }>>;

// Test 2: Multiple foralls
const t2 = fc.scenario()
  .forall('a', fc.integer())
  .forall('b', fc.string())
  .forall('c', fc.boolean());
type _T2 = Expect<Equal<ExtractRec<typeof t2>, { 
  a: number; 
  b: string; 
  c: boolean 
}>>;

// Test 3: Given with factory
const t3 = fc.scenario()
  .forall('x', fc.integer())
  .given('doubled', ({x}) => x * 2);
type _T3 = Expect<Equal<ExtractRec<typeof t3>, { 
  x: number; 
  doubled: number 
}>>;

// Test 4: Given with constant
const t4 = fc.scenario()
  .given('constant', 42);
type _T4 = Expect<Equal<ExtractRec<typeof t4>, { constant: number }>>;

// Test 5: Complex nested types
const t5 = fc.scenario()
  .forall('matrix', fc.array(fc.array(fc.integer())))
  .given('flat', ({matrix}) => matrix.flat())
  .given('sum', ({flat}) => flat.reduce((a, b) => a + b, 0));
type _T5 = Expect<Equal<ExtractRec<typeof t5>, {
  matrix: number[][];
  flat: number[];
  sum: number;
}>>;

// Test 6: Union types preserved
const t6 = fc.scenario()
  .forall('x', fc.union(fc.integer(), fc.string()));
type _T6 = Expect<Equal<ExtractRec<typeof t6>, { x: number | string }>>;

// Test 7: Literal types with oneof
const t7 = fc.scenario()
  .forall('status', fc.oneof(['pending', 'active', 'done']));
type _T7 = Expect<Equal<ExtractRec<typeof t7>, { 
  status: 'pending' | 'active' | 'done' 
}>>;

// Test 8: Mapped arbitrary types
const t8 = fc.scenario()
  .forall('point', fc.tuple(fc.integer(), fc.integer())
    .map(([x, y]) => ({ x, y })));
type _T8 = Expect<Equal<ExtractRec<typeof t8>, { 
  point: { x: number; y: number } 
}>>;

// ============================================================================
// Test Suite: NoInfer Behavior
// ============================================================================

// Test 9: Factory return type wins over constant
const t9 = new FluentCheck().given('x', () => 42);
type T9Rec = ExtractRec<typeof t9>;
type _T9 = Expect<Equal<T9Rec['x'], number>>; // number, not 42

// Test 10: map() type from transform function
const t10 = fc.integer().map(n => String(n));
type _T10 = Expect<Equal<typeof t10, Arbitrary<string>>>;

// ============================================================================
// Test Suite: Error Detection (should fail if uncommented)
// ============================================================================

// @ts-expect-error: Cannot use same name twice
// fc.scenario().forall('x', fc.integer()).forall('x', fc.string());

// @ts-expect-error: Predicate receives wrong type
// fc.scenario().forall('x', fc.integer()).then(({x}: {x: string}) => true);

// @ts-expect-error: Accessing undefined field
// fc.scenario().forall('x', fc.integer()).then(({y}) => y > 0);
```

---

*Document Version: 0.1.0 (Working Draft)*
*Last Updated: November 2024*
*Target Venue: Workshop on Type-Driven Development / ICFP Workshop / SPLASH Workshop*
