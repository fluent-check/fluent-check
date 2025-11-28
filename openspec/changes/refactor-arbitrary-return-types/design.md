## Context

FluentCheck uses a discriminated union `ArbitrarySize = ExactSize | EstimatedSize` to represent arbitrary sizes. The intent is to allow users to narrow the type based on `size.type`:

```typescript
const size = arbitrary.size()
if (size.type === 'exact') {
  // TypeScript knows: size is ExactSize, has no credibleInterval
} else {
  // TypeScript knows: size is EstimatedSize, has credibleInterval
}
```

However, this benefit is lost because factory functions return `Arbitrary<A>`, whose `size()` method returns `ArbitrarySize`. Users must always narrow, even when the result is deterministic.

### Key Insight: Runtime Already Does the Right Thing

Investigation of the codebase reveals that the runtime implementations already return the correct size types:

- `FilteredArbitrary.size()` already returns `EstimatedSize` (not `ArbitrarySize`)
- `MappedArbitrary.size()` delegates to `this.baseArbitrary.size()` (preserves the base type)
- `NoArbitrary.size()` returns `ExactSize` with value 0

This means **no runtime changes are needed** — we only need to add type-level declarations to expose what the code already does.

## Goals / Non-Goals

**Goals:**
- Factory functions return types that expose the specific `size()` return type
- Users can call `integer().size()` and get `ExactSize` directly
- Maintain backward compatibility (all existing code compiles)
- Support the discriminated union pattern end-to-end

**Non-Goals:**
- Exposing concrete implementation classes (e.g., `ArbitraryInteger`)
- Changing runtime behavior
- Breaking existing API contracts

## Decisions

### Decision: Use Interface Extension (not branded types)

Create interfaces that extend `Arbitrary<A>` with more specific `size()` return types:

```typescript
// In types.ts
export interface ExactSizeArbitrary<A> extends Arbitrary<A> {
  size(): ExactSize
}

export interface EstimatedSizeArbitrary<A> extends Arbitrary<A> {
  size(): EstimatedSize
}
```

**Rationale:**
- Clean and idiomatic TypeScript
- No runtime overhead
- Fully backward compatible (interfaces extend the base class)
- IDE autocompletion shows `ExactSize` properties directly

**Alternatives considered:**
1. **Return concrete classes** (e.g., `ArbitraryInteger`) - Rejected because it exposes implementation details
2. **Branded types** - More complex, less readable
3. **Generic type parameter on Arbitrary** - Would require changing every usage

### Decision: Transformation Method Return Types

| Method | Return Type | Rationale |
|--------|-------------|-----------|
| `filter()` | `EstimatedSizeArbitrary<A>` | Filtering always produces estimated size |
| `suchThat()` | `EstimatedSizeArbitrary<A>` | Alias for `filter()` |
| `map()` | Preserves base type | Mapping doesn't change cardinality |
| `chain()` | `Arbitrary<B>` (unchanged) | Complex composition, can't determine statically |

**Note:** `chain()` is out of scope for this change — it already returns `Arbitrary<B>` and will continue to do so.

### Decision: Interface Method Signatures (not `this` type polymorphism)

For `map()` to preserve the size type, we declare method signatures in the interfaces:

```typescript
export interface ExactSizeArbitrary<A> extends Arbitrary<A> {
  size(): ExactSize
  map<B>(f: (a: A) => B, shrinkHelper?: ...): ExactSizeArbitrary<B>
  filter(f: (a: A) => boolean): EstimatedSizeArbitrary<A>
  suchThat(f: (a: A) => boolean): EstimatedSizeArbitrary<A>
}

export interface EstimatedSizeArbitrary<A> extends Arbitrary<A> {
  size(): EstimatedSize
  map<B>(f: (a: A) => B, shrinkHelper?: ...): EstimatedSizeArbitrary<B>
  filter(f: (a: A) => boolean): EstimatedSizeArbitrary<A>
  suchThat(f: (a: A) => boolean): EstimatedSizeArbitrary<A>
}
```

**Why not `this` type polymorphism?**

TypeScript's `this` type cannot parameterize over a new type variable:

```typescript
// ❌ Not valid TypeScript — can't substitute A with B
map<B>(f: (a: A) => B): this<B>
```

The interface method signature approach is:
- Idiomatic TypeScript (structural typing handles the rest)
- Zero runtime changes (implementations already do the right thing)
- Type-safe chaining works naturally

### Decision: Factory Function Categorization

**ExactSizeArbitrary factories:**
- `integer()`, `real()`, `nat()` - Bounded numeric ranges
- `boolean()` - Fixed cardinality (2)
- `constant()` - Fixed cardinality (1)
- `array()`, `set()` - Combinatorial but exact
- `char()`, `ascii()`, `hex()`, `base64()`, `unicode()` - Fixed character sets
- `oneof()` - Uses `integer().map()`, preserves ExactSize

**Arbitrary factories (unknown size type):**
- `union()` - Composite of potentially mixed types
- `tuple()` - Depends on component arbitraries

### Decision: NoArbitrary is ExactSizeArbitrary<never>

`NoArbitrary` already returns `ExactSize` with value 0:

```typescript
// Current implementation in NoArbitrary.ts
size(): ExactSize { return exactSize(0) }
```

This is semantically correct:
- An empty set has **exactly** 0 elements (not an estimate)
- The `never` type means no values can be generated
- Covariance on `never` means `ExactSizeArbitrary<never>` is assignable to `ExactSizeArbitrary<T>` for any `T`

**No changes needed** — just update the type declaration to reflect what it already does.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Increased type complexity | Interfaces are simple extensions, not new abstractions |
| Method overloading complexity | Only needed for `map()`, straightforward pattern |
| Maintenance burden | Interfaces mirror existing implementation behavior |

## Migration Plan

1. Add new interfaces to `types.ts` (non-breaking)
2. Update factory return types one by one (non-breaking, more specific types)
3. Update `filter()`/`suchThat()` return type (non-breaking)
4. Update `map()` with overloading (non-breaking)
5. Update type-level tests to verify new behavior
6. No runtime changes needed

## Resolved Questions

1. **Should `MappedArbitrary` implement a specific interface, or remain `Arbitrary<B>`?**
   
   **Answer:** The runtime class remains `MappedArbitrary`, but the *declared return type* of `map()` in the interfaces determines what TypeScript sees. Since `MappedArbitrary.size()` delegates to `this.baseArbitrary.size()`, it naturally returns the correct type at runtime. No class changes needed.

2. **Should presets (`positiveInt`, `nonEmptyString`, etc.) also return specific types?**
   
   **Answer:** Yes — they delegate to factories that return specific types, so they inherit the precision automatically.

3. **How should `NoArbitrary` cases affect return type declarations?**
   
   **Answer:** Non-issue. `NoArbitrary` is typed as `Arbitrary<never>` and already returns `ExactSize`. Due to covariance on `never`, factory return types like `ExactSizeArbitrary<number>` work correctly — `NoArbitrary` is assignable because `never` is a subtype of all types.

4. **What about `this` type polymorphism for `map()`?**
   
   **Answer:** Not viable in TypeScript. The `this` type cannot parameterize over a new type variable (`this<B>` is invalid syntax). Interface method signatures are the idiomatic solution.

## Pitfalls to Avoid

1. **Don't try to use conditional return types on the base class** — TypeScript's `this` in a conditional type doesn't narrow based on the actual implementing class at call sites.

2. **Don't change runtime implementations** — the code already returns the correct types; this is purely a type-level refactor.

3. **Don't include `chain()` in scope** — it already returns `Arbitrary<B>` and that's intentional since the size type depends on runtime values.
