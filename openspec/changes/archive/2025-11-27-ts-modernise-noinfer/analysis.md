# Deep Inference Analysis: Which Position Should Drive Type Inference?

## Methodology

For each candidate method, we analyze:
1. **Usage frequency** - Which form is actually used in practice?
2. **Semantic intent** - What is the "source of truth" for the type?
3. **Inference conflicts** - What problems arise from bidirectional inference?
4. **User expectations** - Which position should developers control?

---

## 1. `given<K, V>(name: K, v: V | ((args: Rec) => V))`

### Current Signature
```typescript
given<K extends string, V>(name: K, v: V | ((args: Rec) => V)): FluentCheckGiven<K, V, ...>
```

### Usage Analysis

**From test suite** (13 occurrences):
```typescript
// ALL 13 usages use the callback form:
.given('a', () => fc.integer())                    // 100% callback
.given('stack', () => new Stack<number>())         // 100% callback  
.given('a', ({n}) => fc.integer(0, n))            // 100% callback
```

**Finding**: ZERO usages of the constant form `v: V` in the entire test suite.

### Semantic Analysis

The method supports two modes:
1. **Constant mode**: `v: V` - Direct value assignment
2. **Factory mode**: `(args: Rec) => V` - Computed/dependent value

**Key insight**: When both forms are possible, which should drive the generic type `V`?

#### Case 1: Callback-driven inference
```typescript
fc.scenario()
  .given('stack', () => new Stack<number>())
  // V is inferred as Stack<number> from the return type ✓
```

#### Case 2: Constant-driven inference problem
```typescript
fc.scenario()
  .given('count', 5)
  // V is inferred as 5 (literal type) instead of number
  // User likely wants: V = number, not V = 5
```

#### Case 3: Conflict when mixing
```typescript
// Hypothetical union inference:
function demo<V>(v: V | ((args: any) => V)) {
  return v
}

demo(() => 42)  // V = number (from return type)
demo(42)        // V = 42 (literal) or V = number?
```

### Recommendation: **Callback is Primary**

**Apply**: `v: NoInfer<V> | ((args: Rec) => V)`

**Reasoning**:
1. ✅ **Usage pattern**: 100% of actual usage is callback-based
2. ✅ **Literal type problem**: Constants would infer overly-specific types (`5` instead of `number`)
3. ✅ **User intent**: Callback return type is the explicit type declaration
4. ✅ **Factory pattern**: The callback IS the type specification in factory patterns

---

## 2. `and<NK, V>(name: NK, f: ((args: Rec) => V) | V)`

### Current Signature
```typescript
and<NK extends string, V>(name: NK, f: ((args: Rec) => V) | V): FluentCheckGiven<NK, V, ...>
```

### Usage Analysis

**From test suite** (2 relevant occurrences):
```typescript
.and('s2', () => new Stack<number>())              // callback
.and('r', ({a, s}) => a.sampleUniqueWithBias(s))  // callback
```

Note: Most `.and()` usages are assertion chains on `FluentCheckAssert`, not this `FluentCheckGiven.and()`.

### Semantic Analysis

This is **identical in structure** to `given()`, just different syntactic sugar for chaining.

### Recommendation: **Callback is Primary**

**Apply**: `f: ((args: Rec) => V) | NoInfer<V>`

**Reasoning**: Same as `given()` - it's the same API pattern.

---

## 3. `map<B>(f: (a: A) => B, shrinkHelper?: XOR<{inverseMap: (b: B) => A[]}, {canGenerate: ...}>)`

### Current Signature
```typescript
map<B>(
  f: (a: A) => B,
  shrinkHelper?: XOR<
    {inverseMap: (b: B) => A[]},
    {canGenerate: (pick: FluentPick<B>) => boolean}
  >
): Arbitrary<B>
```

### Usage Analysis

**From test suite** (42 occurrences, sampled):
```typescript
// Simple transforms (no shrinkHelper) - majority case:
.map(x => x + 25)                                  // B = number from return
.map(n => String.fromCharCode(n))                  // B = string from return
.map(e => e ? 'Heads' : 'Tails')                  // B = string from return

// With inverseMap (4 occurrences):
.map(a => a === 1, {inverseMap: b => b ? [1] : [0]})
     // B = boolean from f's return
     // inverseMap's (b: boolean) is DERIVED from f's output

// With canGenerate (2 occurrences):
.map(a => Math.abs(a), {canGenerate: b => b.value >= 0})
     // B = number from f's return
     // canGenerate's (b: FluentPick<number>) is DERIVED from f's output
```

### Semantic Analysis

The relationship is clear:
1. **`f: (a: A) => B`** defines the transformation and specifies what `B` is
2. **`shrinkHelper`** is an OPTIONAL helper to improve shrinking behavior

#### Key Questions:

**Q**: Should `B` be inferred from `f` or `shrinkHelper`?  
**A**: From `f` - it's the primary transformation and is REQUIRED

**Q**: What happens if `shrinkHelper` could infer a different `B`?  
**A**: That would be a type error - `shrinkHelper` MUST handle the `B` that `f` produces

#### Example of Current Problem:
```typescript
// Today, this COULD theoretically infer B from inverseMap:
someArbitrary.map(
  (x) => String(x),           // B = string
  {inverseMap: (n: number) => [42]}  // Wait, B = number?
)
// This creates confusion about which position defines B
```

#### With NoInfer:
```typescript
someArbitrary.map(
  (x) => String(x),           // B = string (primary inference)
  {inverseMap: (n: NoInfer<string>) => [/* parse string back to original */]}
  // Now clear: inverseMap MUST accept the B that f produces
)
```

### Recommendation: **Mapping function `f` is Primary**

**Apply**: `shrinkHelper?: XOR<{inverseMap: (b: NoInfer<B>) => A[]}, {canGenerate: (pick: FluentPick<NoInfer<B>>) => boolean}>`

**Reasoning**:
1. ✅ **Required vs optional**: `f` is required, `shrinkHelper` is optional
2. ✅ **Source of truth**: `f` DEFINES what `B` is, `shrinkHelper` CONSUMES it
3. ✅ **Usage pattern**: 90%+ of usage omits `shrinkHelper` entirely
4. ✅ **Semantic dependency**: `shrinkHelper` semantically depends on `f`, not vice versa
5. ✅ **Error clarity**: Wrong type in `shrinkHelper` should error at that parameter, not affect `B`

---

## Summary Table

| Method | Primary Position | NoInfer Position | Confidence |
|--------|-----------------|------------------|------------|
| `given()` | Callback `() => V` | Constant `v: V` | **HIGH** (100% callback usage) |
| `and()` | Callback `() => V` | Constant `v: V` | **HIGH** (same as `given`) |
| `map()` | Function `f: (a: A) => B` | shrinkHelper `b: B` | **VERY HIGH** (semantic dependency) |

---

## Edge Cases to Validate

### Edge Case 1: Explicit Type Parameters
```typescript
// User explicitly provides type parameter:
.given<'x', number>('x', 42)
// Should work: NoInfer doesn't prevent explicit annotation
```

### Edge Case 2: Type Widening Desired
```typescript
// What if user WANTS to widen from literal?
.given('count', 5 as number)
// Cast handles this - NoInfer doesn't block it
```

### Edge Case 3: Complex Callback Types
```typescript
// Does NoInfer affect inference from complex returns?
.given('result', () => someFunction() as SomeComplexType)
// No - callback still drives inference as intended
```

---

## Validation Plan

1. **Type-level tests**: Create test files with expected inference behavior
2. **Compile-time checks**: Use `@ts-expect-error` to verify errors appear/disappear as expected
3. **Regression testing**: Ensure all existing test patterns still compile
4. **Documentation**: Add JSDoc examples showing the inference behavior
