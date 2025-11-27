# Verbosity Analysis

Detailed analysis of code verbosity in FluentCheck compared to alternatives.

## Metrics Definition

- **LOC**: Lines of code (excluding comments)
- **Method Calls**: Number of fluent method invocations
- **Cognitive Load**: Subjective assessment (1-5 scale)
- **Type Annotations**: Required explicit type annotations

## Pattern Verbosity Comparison

### Pattern 1: Simple Property

**FluentCheck (Current)**
```typescript
expect(fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => x + 0 === x)
  .check()
).to.have.property('satisfiable', true);
```
- LOC: 5
- Method Calls: 4
- Cognitive Load: 2
- Type Annotations: 0

**fast-check Equivalent**
```typescript
fc.assert(
  fc.property(fc.integer(), (x) => x + 0 === x)
);
```
- LOC: 3
- Method Calls: 3
- Cognitive Load: 1
- Type Annotations: 0

**Proposed FluentCheck Shorthand**
```typescript
fc.prop(fc.integer(), x => x + 0 === x).assert();
```
- LOC: 1
- Method Calls: 2
- Cognitive Load: 1
- Type Annotations: 0

**Savings**: 80% LOC reduction for simple properties

### Pattern 2: Two Quantifiers

**FluentCheck (Current)**
```typescript
expect(fc.scenario()
  .forall('a', fc.integer())
  .forall('b', fc.integer())
  .then(({ a, b }) => a + b === b + a)
  .check()
).to.have.property('satisfiable', true);
```
- LOC: 6
- Method Calls: 5
- Cognitive Load: 2

**fast-check Equivalent**
```typescript
fc.assert(
  fc.property(fc.integer(), fc.integer(), (a, b) => a + b === b + a)
);
```
- LOC: 3
- Method Calls: 3
- Cognitive Load: 2

**Proposed FluentCheck**
```typescript
fc.prop(fc.integer(), fc.integer(), (a, b) => a + b === b + a).assert();
```
- LOC: 1
- Method Calls: 2
- Cognitive Load: 2

### Pattern 3: With Setup (Given/When/Then)

**FluentCheck (Current)**
```typescript
expect(fc.scenario()
  .forall('e', fc.integer())
  .given('stack', () => new Stack<number>())
  .when(({ e, stack }) => stack.push(e))
  .then(({ stack }) => stack.size() === 1)
  .check()
).to.have.property('satisfiable', true);
```
- LOC: 7
- Method Calls: 6
- Cognitive Load: 3

**fast-check Equivalent**
```typescript
fc.assert(
  fc.property(fc.integer(), (e) => {
    const stack = new Stack<number>();
    stack.push(e);
    return stack.size() === 1;
  })
);
```
- LOC: 7
- Method Calls: 3
- Cognitive Load: 3

**Assessment**: FluentCheck's verbosity is **justified** here - the BDD structure provides better readability and testability.

### Pattern 4: Strategy Configuration

**FluentCheck (Current)**
```typescript
expect(fc.scenario()
  .config(fc.strategy()
    .withRandomSampling()
    .usingCache()
    .withoutReplacement()
    .withShrinking()
  )
  .exists('a', fc.integer())
  .then(({ a }) => a + 1000 > a)
  .check()
).to.have.property('satisfiable', true);
```
- LOC: 11
- Method Calls: 9
- Cognitive Load: 4

**Proposed with Presets**
```typescript
expect(fc.scenario()
  .config(fc.strategies.thorough)  // Preset strategy
  .exists('a', fc.integer())
  .then(({ a }) => a + 1000 > a)
  .check()
).to.have.property('satisfiable', true);
```
- LOC: 6
- Method Calls: 5
- Cognitive Load: 2

**Savings**: 45% LOC reduction with presets

## Verbosity by Component

### Entry Point Analysis

| Component | Current LOC | Proposed LOC | Savings |
|-----------|-------------|--------------|---------|
| Simple property | 5 | 1 | 80% |
| Two quantifiers | 6 | 1 | 83% |
| Setup + property | 7 | 7 | 0% |
| Strategy config | 11 | 6 | 45% |

### Arbitrary Configuration

| Pattern | Current | Notes |
|---------|---------|-------|
| Range integer | `fc.integer(0, 100)` | ✅ Concise |
| Positive integer | `fc.integer(1, Number.MAX_SAFE_INTEGER)` | ⚠️ Verbose |
| Non-empty array | `fc.array(fc.integer(), 1)` | ✅ Reasonable |
| Filtered | `fc.integer().filter(x => x > 0)` | ⚠️ Common pattern |

**Proposed Shorthands:**
```typescript
fc.positiveInt()      // Instead of fc.integer(1, MAX_SAFE)
fc.negativeInt()      // Instead of fc.integer(MIN_SAFE, -1)
fc.nonEmptyArray(a)   // Instead of fc.array(a, 1)
fc.nonEmptyString()   // Instead of fc.string(1)
```

### Assertion Wrapper Analysis

**Current Pattern:**
```typescript
expect(result.check()).to.have.property('satisfiable', true);
expect(result.check()).to.deep.include({ satisfiable: true, example: { a: 0 } });
```

**Issues:**
1. Chai wrapping adds visual noise
2. Property path navigation verbose
3. Deep include for example matching complex

**Proposed Extensions:**
```typescript
// Option 1: Fluent terminal methods
fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => x + 0 === x)
  .shouldBeSatisfiable();  // Throws if not

// Option 2: Result helpers
const result = fc.scenario()...check();
result.assertSatisfiable();        // Throws if not
result.assertExample({ a: 0 });    // Asserts example value

// Option 3: With expect integration
fc.expect(fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => x + 0 === x)
).toBeProperty();
```

## Recommendations by Priority

### High Priority (>50% impact)

1. **`fc.prop()` shorthand**
   - Target: Simple properties
   - Impact: 80% LOC reduction
   - Complexity: Low

2. **Fluent assertion terminals**
   - Target: All tests
   - Impact: Removes Chai wrapper noise
   - Complexity: Low

### Medium Priority (20-50% impact)

3. **Strategy presets**
   - Target: Configured tests
   - Impact: 45% LOC reduction
   - Complexity: Low

4. **Common arbitrary aliases**
   - Target: Filtered integers
   - Impact: 30% LOC for affected patterns
   - Complexity: Low

### Low Priority (<20% impact)

5. **Result helper methods**
   - Impact: Minor convenience
   - Complexity: Low

## Before/After Examples

### Example 1: Integer Identity

**Before (Current)**
```typescript
it('integer identity', () => {
  expect(fc.scenario()
    .forall('x', fc.integer())
    .then(({ x }) => x + 0 === x)
    .check()
  ).to.have.property('satisfiable', true);
});
```

**After (Proposed)**
```typescript
it('integer identity', () => {
  fc.prop(fc.integer(), x => x + 0 === x).assert();
});
```

### Example 2: Array Reverse

**Before (Current)**
```typescript
it('double reverse identity', () => {
  expect(fc.scenario()
    .forall('xs', fc.array(fc.integer()))
    .given('reversed', ({ xs }) => xs.reverse())
    .given('doubleReversed', ({ reversed }) => reversed.reverse())
    .then(({ xs, doubleReversed }) => 
      xs.length === doubleReversed.length &&
      xs.every((x, i) => x === doubleReversed[i])
    )
    .check()
  ).to.have.property('satisfiable', true);
});
```

**After (With shorthand for simple case)**
```typescript
it('double reverse identity', () => {
  fc.prop(
    fc.array(fc.integer()), 
    xs => {
      const doubleReversed = [...xs].reverse().reverse();
      return xs.every((x, i) => x === doubleReversed[i]);
    }
  ).assert();
});
```

**Assessment**: Simple form works for simple properties; BDD form remains valuable for complex scenarios.

### Example 3: Existential with Shrinking

**Before (Current)**
```typescript
it('finds divisible by 7', () => {
  expect(fc.scenario()
    .config(fc.strategy()
      .withRandomSampling()
      .usingCache()
      .withShrinking()
    )
    .exists('a', fc.integer(1))
    .then(({ a }) => a % 7 === 0)
    .check()
  ).to.deep.include({ satisfiable: true, example: { a: 7 } });
});
```

**After (With preset)**
```typescript
it('finds divisible by 7', () => {
  const result = fc.scenario()
    .config(fc.strategies.withShrinking)
    .exists('a', fc.positiveInt())
    .then(({ a }) => a % 7 === 0)
    .check();
  
  result.assertExample({ a: 7 });
});
```
