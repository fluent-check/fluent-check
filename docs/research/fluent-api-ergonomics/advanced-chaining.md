# Advanced Chaining Investigation

Research on conditional assertions, nested quantifiers, and alternative accumulator patterns.

## Current Chaining Model

FluentCheck uses a type-accumulating pattern where each chain method extends the record type:

```typescript
fc.scenario()                                    // FluentCheck<{}>
  .forall('a', fc.integer())                     // FluentCheck<{ a: number }>
  .forall('b', fc.integer())                     // FluentCheck<{ a: number, b: number }>
  .given('sum', ({ a, b }) => a + b)             // FluentCheck<{ a: number, b: number, sum: number }>
  .then(({ a, b, sum }) => sum === a + b)        // FluentCheck<{ a: number, b: number, sum: number }>
  .check()                                       // FluentResult<{ a: number, b: number, sum: number }>
```

**Strengths:**
- Full type safety
- Named bindings (readable)
- Accumulative access to all values

**Limitations:**
- Cannot branch conditionally
- Nested quantifiers share same namespace
- No scoped bindings

## Conditional Assertions

### Current Workaround

```typescript
fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => {
    if (x > 0) {
      return x * 2 > x;  // Only check for positive
    }
    return true;  // Skip for non-positive
  })
  .check();
```

### Proposed Pattern 1: Implication Operator

```typescript
// Inspired by ScalaCheck's ==>
fc.scenario()
  .forall('x', fc.integer())
  .given('positive', ({ x }) => x > 0)
  .implies(({ positive }) => positive)  // NEW: Skip if condition false
  .then(({ x }) => x * 2 > x)
  .check();

// Or inline form
fc.scenario()
  .forall('x', fc.integer())
  .when(({ x }) => x > 0)  // Precondition
  .implies()               // NEW: Mark as implication
  .then(({ x }) => x * 2 > x)
  .check();
```

**Implementation Complexity:** Medium
- Requires new chain node type
- Must handle skipped tests in statistics

### Proposed Pattern 2: Pre-condition in Body

```typescript
// Inspired by fast-check's fc.pre()
fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => {
    fc.pre(x > 0);  // Throws special exception to skip
    return x * 2 > x;
  })
  .check();
```

**Implementation Complexity:** Low
- Just a special exception type
- Check runner catches and counts as skip

### Proposed Pattern 3: Conditional Chains

```typescript
// Branch within chain
fc.scenario()
  .forall('x', fc.integer())
  .branch(({ x }) => x > 0, 
    chain => chain.then(({ x }) => x * 2 > x),
    chain => chain.then(() => true)  // Else branch
  )
  .check();
```

**Implementation Complexity:** High
- Complex type inference
- Not recommended

## Nested Quantifiers

### Current Behavior

```typescript
fc.scenario()
  .forall('outer', fc.array(fc.integer()))
  .forall('inner', fc.integer(0, 10))
  .then(({ outer, inner }) => inner < outer.length || outer.length === 0)
  .check();
```

**Issue:** `inner` is independent of `outer`, not truly nested

### Desired Pattern: Dependent Quantification

```typescript
// Want: forall outer, exists inner IN outer
fc.scenario()
  .forall('arr', fc.array(fc.integer(), 1))  // Non-empty
  .existsIn('elem', ({ arr }) => arr)        // NEW: Pick from arr
  .then(({ arr, elem }) => arr.includes(elem))
  .check();
```

### Alternative: Chain Arbitrary

```typescript
// Current workaround with chain
fc.scenario()
  .forall('arr', fc.array(fc.integer(), 1)
    .chain(arr => fc.oneof(arr).map(elem => ({ arr, elem })))
  )
  .then(({ arr }) => arr.arr.includes(arr.elem))  // Awkward access
  .check();
```

### Proposed Pattern: Scoped Quantifiers

```typescript
// Explicit scoping
fc.scenario()
  .forall('arr', fc.array(fc.integer(), 1))
  .scope(({ arr }) =>                          // NEW: Create scope
    fc.scenario()
      .exists('elem', fc.oneof(arr))           // Inner quantifier
      .then(({ elem }) => arr.includes(elem))
  )
  .check();
```

**Implementation Complexity:** High
- Requires scope management
- Complex type inference

### Recommended Approach: Helper Functions

```typescript
// Use chain for dependent generation
const arrayWithElement = fc.array(fc.integer(), 1, 10)
  .chain(arr => 
    fc.integer(0, arr.length - 1)
      .map(idx => ({ arr, elem: arr[idx], idx }))
  );

fc.scenario()
  .forall('data', arrayWithElement)
  .then(({ data }) => data.arr[data.idx] === data.elem)
  .check();
```

## Given/When/Then Integration

### Current Pattern

```typescript
fc.scenario()
  .given('stack', () => new Stack<number>())
  .forall('elements', fc.array(fc.integer()))
  .when(({ stack, elements }) => elements.forEach(e => stack.push(e)))
  .then(({ stack, elements }) => stack.size() === elements.length)
  .check();
```

### Issue: When Order Affects Behavior

```typescript
// Order 1: given -> forall -> when
fc.scenario()
  .given('stack', () => new Stack<number>())  // Created once
  .forall('e', fc.integer())
  .when(({ stack, e }) => stack.push(e))      // Accumulates across iterations
  .then(({ stack }) => stack.size() >= 1)     // Always true after first
  .check();

// Order 2: forall -> given -> when
fc.scenario()
  .forall('e', fc.integer())
  .given('stack', () => new Stack<number>())  // Created per iteration
  .when(({ stack, e }) => stack.push(e))
  .then(({ stack }) => stack.size() === 1)    // Always exactly 1
  .check();
```

**Observation:** Current design is correct but subtle

### Proposed: Documentation Enhancement

Add clear documentation explaining:
1. `given` with factory creates per-iteration
2. `given` with value creates once
3. Order relative to `forall` matters

## Alternative Accumulator Patterns

### Pattern A: Positional (fast-check style)

```typescript
// Positional arguments
fc.property(
  fc.integer(),
  fc.integer(),
  (a, b) => a + b === b + a
);
```

**Pros:** Less boilerplate for simple cases
**Cons:** Loses named access, harder to read with many params

### Pattern B: Object Config

```typescript
// Configuration object
fc.property({
  arbitraries: { a: fc.integer(), b: fc.integer() },
  property: ({ a, b }) => a + b === b + a
});
```

**Pros:** Declarative, all-at-once
**Cons:** Less fluent, harder to extend dynamically

### Pattern C: Hybrid (Recommended)

```typescript
// Simple cases: positional shorthand
fc.prop(fc.integer(), fc.integer(), (a, b) => a + b === b + a);

// Complex cases: full fluent API
fc.scenario()
  .forall('a', fc.integer())
  .forall('b', fc.integer())
  .given('sum', ({ a, b }) => a + b)
  .when(({ sum }) => console.log('Testing:', sum))
  .then(({ a, b, sum }) => sum === a + b)
  .check();
```

## Recommendations

### High Priority

1. **`fc.pre()` precondition helper**
   - Simple to implement
   - Clear semantics
   - Non-breaking

2. **Documentation for ordering semantics**
   - Explain given/forall interaction
   - Provide clear examples
   - Add to API docs

### Medium Priority

3. **`fc.prop()` shorthand**
   - Positional arguments for simple cases
   - 1-5 arbitrary support
   - Returns result for assertion

4. **Dependent arbitrary helpers**
   - `fc.elementOf(arr)` - pick from array
   - `fc.indexOf(arr)` - valid index for array
   - Built on existing `chain` mechanism

### Low Priority

5. **Scoped quantifiers**
   - Complex implementation
   - Limited use cases
   - Can be achieved with `chain`

6. **Implication operator**
   - Nice to have
   - `fc.pre()` covers most cases

## Type System Considerations

### Challenge: Conditional Types

```typescript
// If we add branching, types become complex
type ConditionalChain<R, C extends boolean> = 
  C extends true 
    ? FluentCheck<R & { conditionMet: true }>
    : FluentCheck<R & { conditionMet: false }>;
```

### Challenge: Scope Isolation

```typescript
// Inner scope shouldn't leak to outer
.scope(({ outer }) => 
  fc.scenario()
    .forall('inner', fc.integer())  // 'inner' only visible here
    .then(...)
)
.then(({ outer }) => ...)           // 'inner' not visible - good!
```

### Recommendation

Keep current accumulator pattern for complex scenarios. Add `fc.prop()` shorthand for simple cases. Avoid complex conditional typing that would hurt inference quality.

## Summary

| Feature | Recommended | Complexity | Priority |
|---------|-------------|------------|----------|
| `fc.pre()` | ✅ Yes | Low | High |
| `fc.prop()` shorthand | ✅ Yes | Low | High |
| Documentation | ✅ Yes | Low | High |
| Implication operator | ⚠️ Maybe | Medium | Low |
| Scoped quantifiers | ❌ No | High | N/A |
| Conditional chains | ❌ No | High | N/A |
