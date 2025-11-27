# Usage Patterns Analysis

Analysis of FluentCheck usage patterns from the test suite (15 test files, ~2,500 lines).

## Method Usage Frequency

### Most Frequently Used Methods

| Method | Count | Context | Notes |
|--------|-------|---------|-------|
| `scenario()` | 78 | Entry | Every test starts here |
| `forall()` | 54 | Quantifier | Primary quantifier |
| `then()` | 78 | Assertion | Always needed |
| `check()` | 78 | Terminal | Always needed |
| `expect(...).to.have.property()` | 62 | Chai | Assertion pattern |
| `integer()` | 41 | Arbitrary | Most common type |
| `given()` | 18 | Setup | Common for fixtures |

### Moderately Used Methods

| Method | Count | Context |
|--------|-------|---------|
| `exists()` | 16 | Quantifier |
| `and()` | 22 | Chaining |
| `when()` | 14 | Actions |
| `string()` | 12 | Arbitrary |
| `array()` | 11 | Arbitrary |
| `filter()` | 9 | Transformation |
| `map()` | 8 | Transformation |

### Less Frequently Used

| Method | Count | Context |
|--------|-------|---------|
| `union()` | 5 | Composition |
| `tuple()` | 4 | Composition |
| `config()` | 3 | Configuration |
| `chain()` | 2 | Dependent |
| `withGenerator()` | 2 | RNG |

## Common Patterns Identified

### Pattern 1: Simple Universal Property (45% of tests)

```typescript
fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => someProperty(x))
  .check()
```

**Verbosity**: 4 method calls for basic property
**Recommendation**: Consider `fc.prop()` shorthand

### Pattern 2: Setup + Property (25% of tests)

```typescript
fc.scenario()
  .forall('x', fc.integer())
  .given('obj', () => new SomeClass())
  .when(({ x, obj }) => obj.method(x))
  .then(({ obj }) => obj.isValid())
  .check()
```

**Verbosity**: 6 method calls
**Assessment**: ✅ Appropriate for complexity

### Pattern 3: Multiple Quantifiers (15% of tests)

```typescript
fc.scenario()
  .exists('a', fc.integer())
  .forall('b', fc.integer(-100, 100))
  .then(({ a, b }) => a > b)
  .check()
```

**Verbosity**: 4 method calls
**Assessment**: ✅ Reasonable

### Pattern 4: Chained Assertions (10% of tests)

```typescript
fc.scenario()
  .forall('x', fc.array(fc.integer()))
  .given('result', ({ x }) => process(x))
  .then(({ x, result }) => condition1(x, result))
  .and(({ result }) => condition2(result))
  .and(({ x }) => condition3(x))
  .check()
```

**Verbosity**: 7 method calls
**Assessment**: ⚠️ Could be simplified with assertion composition

### Pattern 5: Configured Strategy (5% of tests)

```typescript
fc.scenario()
  .config(fc.strategy()
    .withRandomSampling()
    .usingCache()
    .withoutReplacement()
    .withShrinking()
  )
  .exists('a', fc.integer())
  .then(({ a }) => a + 1000 > a)
  .check()
```

**Verbosity**: 9 method calls
**Assessment**: ⚠️ Very verbose for common configuration

## Boilerplate Analysis

### Always Required (Every Test)

```typescript
fc.scenario()    // Entry
  ...            // Quantifiers/setup
  .check()       // Execution
```

Minimum: 2 method calls as boilerplate

### Typical Chai Assertion Pattern

```typescript
expect(fc.scenario()
  ...
  .check()
).to.have.property('satisfiable', true)
```

**Observation**: The Chai wrapper adds significant verbosity
**Recommendation**: Consider fluent assertion extension

## Friction Points Identified

### 1. Result Destructuring Repetition

```typescript
.given('a', () => createA())
.and('b', ({ a }) => createB(a))     // Must destructure 'a'
.when(({ a, b }) => doSomething(a, b)) // Must destructure both
.then(({ a, b }) => check(a, b))      // Must destructure again
```

**Issue**: Same destructuring repeated across clauses
**Impact**: Medium - verbose but type-safe

### 2. Assertion Wrapper Verbosity

```typescript
// Current pattern
expect(fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => x + 0 === x)
  .check()
).to.have.property('satisfiable', true)

// Potential alternative
fc.scenario()
  .forall('x', fc.integer())
  .then(({ x }) => x + 0 === x)
  .expectSatisfiable()
```

**Issue**: Chai wrapper obscures the fluent pattern
**Impact**: High - affects every test

### 3. Missing Common Arbitrary Aliases

```typescript
// Current
fc.integer(0, Number.MAX_SAFE_INTEGER)

// Missing shorthand
fc.positiveInt()
fc.negativeInt()
fc.byte()
fc.word()
```

**Impact**: Low - but would improve discoverability

### 4. No Built-in Property Composition

```typescript
// Current: must repeat common properties
.then(({ xs }) => xs.length >= 0)

// Desired
fc.props.nonNegativeLength(({ xs }) => xs)
```

**Impact**: Medium - reduces duplication

## Recommendations Summary

| Issue | Solution | Priority |
|-------|----------|----------|
| Simple property verbosity | Add `prop()` shorthand | High |
| Chai wrapper verbosity | Add `expectSatisfiable()` | High |
| Strategy config verbosity | Add preset strategies | Medium |
| Missing arbitrary aliases | Add `positiveInt()` etc. | Low |
| Property composition | Create combinator library | Medium |
