# Error Messages Evaluation

Analysis of TypeScript error message quality in FluentCheck chains.

## Methodology

1. Intentionally introduced type errors in chains
2. Evaluated error message clarity
3. Identified patterns that produce confusing errors
4. Proposed improvements

## Error Categories

### Category 1: Quantifier Type Mismatches

**Scenario: Wrong arbitrary type**
```typescript
fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => x.toUpperCase())  // Error: x is number, not string
```

**Error Message:**
```
Property 'toUpperCase' does not exist on type 'number'.
```

**Assessment**: ✅ Clear and actionable

---

**Scenario: Misspelled binding name**
```typescript
fc.scenario()
  .forall('value', fc.integer())
  .then(({ val }) => val > 0)  // Error: 'val' not 'value'
```

**Error Message:**
```
Property 'val' does not exist on type '{ value: number; }'.
```

**Assessment**: ✅ Clear - shows available properties

### Category 2: Chained Setup Errors

**Scenario: Accessing binding before definition**
```typescript
fc.scenario()
  .given('a', ({ b }) => b + 1)  // Error: b not defined yet
  .given('b', () => 10)
```

**Error Message:**
```
Property 'b' does not exist on type '{}'.
```

**Assessment**: ⚠️ Partially clear - doesn't indicate ordering issue

**Improvement Suggestion:**
- Add JSDoc comment explaining binding order
- Consider runtime warning for undefined access

---

**Scenario: Circular dependency attempt**
```typescript
fc.scenario()
  .given('a', ({ b }) => b + 1)
  .and('b', ({ a }) => a - 1)
```

**Error Message:**
```
Property 'b' does not exist on type '{}'.
```

**Assessment**: ⚠️ Same as above - doesn't explain why

### Category 3: Assertion Type Errors

**Scenario: Non-boolean return**
```typescript
fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => x + 1)  // Should return boolean
```

**Error Message:**
```
Argument of type '({ x }: { x: number; }) => number' is not assignable 
to parameter of type '(arg: { x: number; }) => boolean'.
  Type 'number' is not assignable to type 'boolean'.
```

**Assessment**: ✅ Clear - shows expected return type

---

**Scenario: Missing property in assertion**
```typescript
fc.scenario()
  .forall('x', fc.integer())
  .given('y', () => 'hello')
  .then(({ x, z }) => x === z)  // 'z' doesn't exist
```

**Error Message:**
```
Property 'z' does not exist on type '{ x: number; y: string; }'.
```

**Assessment**: ✅ Clear - shows what IS available

### Category 4: Arbitrary Composition Errors

**Scenario: Wrong inner arbitrary type**
```typescript
fc.array(fc.integer())
  .map(arr => arr.join(','))
  .filter(s => s.length > 5)
  .map(s => s.split(',').map(x => parseInt(x)))  // OK
  .map(arr => arr.reduce((a, b) => a.toUpperCase() + b))  // Error
```

**Error Message:**
```
Property 'toUpperCase' does not exist on type 'number'.
```

**Assessment**: ✅ Clear - points to exact issue

---

**Scenario: Incompatible union types**
```typescript
fc.union(
  fc.integer(),
  fc.string()
).map(x => x.toFixed(2))  // Error: string has no toFixed
```

**Error Message:**
```
Property 'toFixed' does not exist on type 'string | number'.
  Property 'toFixed' does not exist on type 'string'.
```

**Assessment**: ✅ Clear - explains union constraint

### Category 5: Complex Chain Errors

**Scenario: Deep chain type mismatch**
```typescript
fc.scenario()
  .forall('a', fc.integer())
  .forall('b', fc.integer())
  .given('sum', ({ a, b }) => a + b)
  .when(({ sum }) => console.log(sum))
  .given('doubled', ({ sum }) => sum * 2)
  .then(({ sum, doubled, product }) => sum < doubled)  // 'product' doesn't exist
```

**Error Message:**
```
Property 'product' does not exist on type '{ a: number; b: number; sum: number; doubled: number; }'.
```

**Assessment**: ✅ Excellent - shows full accumulated type

---

**Scenario: Nested quantifier type confusion**
```typescript
fc.scenario()
  .forall('outer', fc.array(fc.integer()))
  .forall('inner', fc.integer(0, 10))
  .then(({ outer, inner }) => outer[inner].toUpperCase())  // outer[inner] is number
```

**Error Message:**
```
Property 'toUpperCase' does not exist on type 'number'.
```

**Assessment**: ✅ Clear

## Runtime Error Evaluation

### Scenario: Filter that always fails
```typescript
fc.scenario()
  .forall('x', fc.integer().filter(() => false))
  .then(({ x }) => x > 0)
  .check()
```

**Runtime Behavior:** Returns `{ satisfiable: true }` (vacuous truth)

**Assessment**: ⚠️ Potentially confusing - no warning about empty sample space

**Improvement Suggestion:**
- Add console warning when arbitrary sample space appears empty
- Add `warnOnEmpty` strategy option

---

### Scenario: Shrinking produces unexpected result
```typescript
const result = fc.scenario()
  .exists('a', fc.integer(0, 1000))
  .then(({ a }) => a % 7 === 0)
  .check();

// Expected: { a: 7 }
// Got: { a: 0 } (0 % 7 === 0)
```

**Assessment**: ✅ Correct behavior - 0 is the minimal example

---

### Scenario: Check result interpretation
```typescript
const result = fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => x !== x)  // Always false
  .check();

// result = { satisfiable: false, example: { x: 0 } }
```

**Assessment**: ✅ Clear - example shows counterexample

## Error Message Quality Matrix

| Scenario | Clarity | Actionability | Score |
|----------|---------|---------------|-------|
| Wrong type in then | ✅ | ✅ | 5/5 |
| Misspelled binding | ✅ | ✅ | 5/5 |
| Binding order issue | ⚠️ | ⚠️ | 3/5 |
| Non-boolean return | ✅ | ✅ | 5/5 |
| Union type constraint | ✅ | ✅ | 5/5 |
| Deep chain missing prop | ✅ | ✅ | 5/5 |
| Empty filter space | ⚠️ | ❌ | 2/5 |

**Overall Score: 4.3/5**

## Recommendations

### High Priority

1. **Binding order documentation**
   - Add JSDoc explaining left-to-right evaluation
   - Example in documentation showing correct order

2. **Empty sample space warning**
   ```typescript
   // Proposed runtime warning
   console.warn('FluentCheck: Arbitrary for "x" produced no samples. ' +
     'Check filter conditions or range constraints.');
   ```

### Medium Priority

3. **Helper types for better errors**
   ```typescript
   // Use template literal types for better error messages
   type BindingNotFound<K extends string, Available extends string> = 
     `Property '${K}' not found. Available: ${Available}`;
   ```

4. **Runtime debug mode**
   ```typescript
   fc.scenario()
     .debug()  // Enable verbose logging
     .forall('x', fc.integer())
     ...
   ```

### Low Priority

5. **Custom error class hierarchy**
   ```typescript
   class FluentCheckError extends Error {}
   class EmptySampleSpaceError extends FluentCheckError {}
   class ShrinkingError extends FluentCheckError {}
   ```

## TypeScript Configuration Impact

### strictNullChecks

With `strictNullChecks: true`:
```typescript
fc.scenario()
  .forall('x', fc.integer())
  .given('y', ({ x }) => x > 0 ? x : undefined)
  .then(({ y }) => y > 0)  // Error: y possibly undefined
```

**Assessment**: ✅ Good - catches potential issues

### noImplicitAny

With `noImplicitAny: true`:
```typescript
fc.scenario()
  .forall('x', fc.integer())
  .then(({ x, y }) => x > y)  // Error: y is implicit any
```

**Assessment**: ✅ Good - forces explicit bindings

## Comparison with fast-check

### fast-check error for wrong type
```typescript
fc.assert(fc.property(fc.integer(), x => x.toUpperCase()))
// Error: Property 'toUpperCase' does not exist on type 'number'.
```

### FluentCheck error for same
```typescript
fc.scenario().forall('x', fc.integer()).then(({ x }) => x.toUpperCase())
// Error: Property 'toUpperCase' does not exist on type 'number'.
```

**Assessment**: ✅ Equivalent clarity

### fast-check: Multiple arbitraries type mismatch
```typescript
fc.property(fc.integer(), fc.string(), (a, b) => a + b)
// a: number, b: string, a + b: string (concatenation)
```

### FluentCheck equivalent
```typescript
fc.scenario()
  .forall('a', fc.integer())
  .forall('b', fc.string())
  .then(({ a, b }) => a + b)
// Same inference: a + b is string
```

**Assessment**: ✅ Equivalent behavior

## Summary

FluentCheck's TypeScript integration produces **high-quality error messages** in most scenarios. The main improvements needed are:

1. Better documentation for binding order semantics
2. Runtime warnings for edge cases (empty sample spaces)
3. Optional debug mode for development

No fundamental type system changes are required.
