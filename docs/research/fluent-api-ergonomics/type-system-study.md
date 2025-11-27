# Type System Study

Research on TypeScript type inference improvements for FluentCheck.

## Current Type System Analysis

### Strengths

1. **Accumulating Record Types**
   ```typescript
   fc.scenario()                              // FluentCheck<{}, {}>
     .forall('a', fc.integer())               // FluentCheck<{ a: number }, {}>
     .given('b', () => 'hello')               // FluentCheck<{ a: number, b: string }, {}>
     .then(({ a, b }) => a > 0 && b.length > 0)  // Full access, full inference
   ```

2. **Arbitrary Type Inference**
   ```typescript
   fc.integer()                    // Arbitrary<number>
   fc.string()                     // Arbitrary<string>
   fc.array(fc.integer())          // Arbitrary<number[]>
   fc.tuple(fc.integer(), fc.string())  // Arbitrary<[number, string]>
   ```

3. **Const Type Parameters (Modern)**
   ```typescript
   // With const generics (already implemented)
   fc.oneof(['a', 'b', 'c'] as const)  // Arbitrary<'a' | 'b' | 'c'>
   fc.set(['x', 'y', 'z'] as const)    // Preserves literal types
   ```

4. **NoInfer Usage**
   ```typescript
   // Prevents widening in given()
   given<K extends string, V>(name: K, v: NoInfer<V> | ((args: Rec) => V))
   ```

### Current Limitations

1. **Callback Parameter Inference**
   ```typescript
   // Sometimes requires explicit destructuring
   .then(({ a, b }) => ...)  // Must destructure, can't use args.a
   ```

2. **Complex Union Narrowing**
   ```typescript
   fc.union(fc.integer(), fc.string())
     .map(x => {
       // x is number | string
       // No automatic narrowing based on runtime checks
       if (typeof x === 'number') return x.toFixed(2);
       return x.toUpperCase();  // TS knows it's string here ✅
     });
   ```

3. **Deep Chain Type Depth**
   ```typescript
   // Very long chains may hit TypeScript's type instantiation depth
   fc.scenario()
     .forall('a', fc.integer())
     .forall('b', fc.integer())
     .forall('c', fc.integer())
     // ... 20+ more
     .then(...)  // May show type errors or slow IDE
   ```

## Proposed Improvements

### 1. Template Literal Types for Pattern Validation

```typescript
// Current: runtime validation only
fc.string().filter(s => /^[a-z]+@[a-z]+\.[a-z]+$/.test(s))

// Proposed: compile-time pattern hints
type EmailPattern = `${string}@${string}.${string}`;

fc.string<EmailPattern>()  // Arbitrary<EmailPattern>
  // IDE can show pattern in autocomplete
```

**Implementation:**
```typescript
const email = (): Arbitrary<`${string}@${string}.${string}`> =>
  fc.regex(/^[a-z]+@[a-z]+\.[a-z]+$/) as any;
```

**Benefit:** Better IDE hints, documentation in types

### 2. Discriminated Union Support

FluentCheck already supports discriminated unions well:

```typescript
type Result = 
  | { type: 'success'; value: number }
  | { type: 'error'; message: string };

const resultArbitrary: Arbitrary<Result> = fc.union(
  fc.integer().map(value => ({ type: 'success' as const, value })),
  fc.string().map(message => ({ type: 'error' as const, message }))
);

fc.scenario()
  .forall('r', resultArbitrary)
  .then(({ r }) => {
    if (r.type === 'success') {
      return r.value >= 0;  // TS knows r.value exists ✅
    }
    return r.message.length > 0;  // TS knows r.message exists ✅
  })
  .check();
```

**Assessment:** ✅ Already works well

### 3. Improved Optional/Nullable Handling

```typescript
// Current: manual handling
fc.scenario()
  .forall('x', fc.union(fc.integer(), fc.constant(null)))
  .then(({ x }) => {
    if (x === null) return true;
    return x > 0;  // x is number here ✅
  });

// Proposed: nullable helper
fc.nullable(fc.integer())  // Arbitrary<number | null>
fc.optional(fc.integer())  // Arbitrary<number | undefined>
```

**Implementation:**
```typescript
const nullable = <T>(arb: Arbitrary<T>): Arbitrary<T | null> =>
  fc.union(arb, fc.constant(null));

const optional = <T>(arb: Arbitrary<T>): Arbitrary<T | undefined> =>
  fc.union(arb, fc.constant(undefined));
```

### 4. Better Map Type Preservation

```typescript
// Current: type is inferred
fc.integer().map(x => x * 2)  // Arbitrary<number> ✅

// Edge case with literal types
fc.constant(1 as const).map(x => x + 1)  // Arbitrary<number>, loses literal

// Proposed: overloads for common patterns
fc.integer().map(x => x * 2)  // Arbitrary<number>
fc.integer().map(x => x.toString())  // Arbitrary<string>
fc.integer().map(x => ({ value: x }))  // Arbitrary<{ value: number }>
```

**Assessment:** ✅ Already works well, minor edge cases

### 5. Assertion Type Guards

```typescript
// Current: then returns boolean
.then(({ x }) => x > 0)

// Proposed: type-narrowing assertions (future consideration)
.assert(({ x }): x is number & { __positive: true } => x > 0)
// Subsequent chains could use narrowed type
```

**Assessment:** Complex, low priority

## Modern TypeScript Features Integration

### Already Implemented

| Feature | Status | Usage |
|---------|--------|-------|
| Const type parameters | ✅ | `oneof`, `set`, `tuple` |
| NoInfer | ✅ | `given` constant vs factory |
| Discriminated unions | ✅ | Size types (ExactSize, EstimatedSize) |
| Template literals | ⚠️ Partial | Available but not exposed |

### Recommended Additions

| Feature | Benefit | Complexity |
|---------|---------|------------|
| `fc.nullable()` | Convenience | Low |
| `fc.optional()` | Convenience | Low |
| Type-level patterns | Documentation | Low |
| Record utility types | Complex objects | Medium |

## Type Inference Quality Tests

### Test 1: Simple Quantifier
```typescript
fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => x + 1 > x);
// Expected: x inferred as number ✅
// Result: PASS
```

### Test 2: Multiple Quantifiers
```typescript
fc.scenario()
  .forall('a', fc.integer())
  .forall('b', fc.string())
  .then(({ a, b }) => a.toString() === b);
// Expected: a: number, b: string ✅
// Result: PASS
```

### Test 3: Given with Factory
```typescript
fc.scenario()
  .forall('x', fc.integer())
  .given('doubled', ({ x }) => x * 2)
  .then(({ x, doubled }) => doubled === x * 2);
// Expected: doubled inferred as number ✅
// Result: PASS
```

### Test 4: Nested Arbitrary Types
```typescript
fc.scenario()
  .forall('matrix', fc.array(fc.array(fc.integer())))
  .then(({ matrix }) => matrix.flat().every(n => typeof n === 'number'));
// Expected: matrix: number[][] ✅
// Result: PASS
```

### Test 5: Union Types
```typescript
fc.scenario()
  .forall('x', fc.union(fc.integer(), fc.string()))
  .then(({ x }) => typeof x === 'number' || typeof x === 'string');
// Expected: x: number | string ✅
// Result: PASS
```

### Test 6: Mapped Types with Transform
```typescript
fc.scenario()
  .forall('coords', fc.tuple(fc.integer(), fc.integer())
    .map(([x, y]) => ({ x, y })))
  .then(({ coords }) => typeof coords.x === 'number');
// Expected: coords: { x: number, y: number } ✅
// Result: PASS
```

### Test 7: Complex Chain (Stress Test)
```typescript
fc.scenario()
  .forall('a', fc.integer())
  .forall('b', fc.integer())
  .forall('c', fc.integer())
  .given('sum', ({ a, b, c }) => a + b + c)
  .given('product', ({ a, b, c }) => a * b * c)
  .given('avg', ({ sum }) => sum / 3)
  .when(({ sum }) => console.log(sum))
  .then(({ a, b, c, sum, product, avg }) => 
    sum === a + b + c && 
    avg === sum / 3
  );
// Expected: All types correctly inferred ✅
// Result: PASS
```

## Recommendations Summary

### High Priority

1. **Add `fc.nullable()` and `fc.optional()`**
   - Simple implementation
   - High convenience value

2. **Document type inference behavior**
   - Explain accumulator pattern
   - Show edge cases and workarounds

### Medium Priority

3. **Add pattern type aliases**
   - `EmailString`, `UrlString`, etc.
   - Documentation value

4. **Performance optimization for long chains**
   - Investigate type caching
   - May require restructuring

### Low Priority

5. **Type-narrowing assertions**
   - Complex implementation
   - Limited use cases

6. **Full template literal integration**
   - Requires regex-to-type mapping
   - High complexity

## Conclusion

FluentCheck's type system integration is **excellent**. The accumulating record pattern provides full type safety with good inference. The main recommendations are:

1. Add convenience wrappers (`nullable`, `optional`)
2. Improve documentation
3. Monitor TypeScript version compatibility

No fundamental changes needed.
