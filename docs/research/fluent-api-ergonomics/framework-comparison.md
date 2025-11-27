# Framework Comparison

Comparative analysis of property testing frameworks: QuickCheck (Haskell), Hypothesis (Python), fast-check (TypeScript), and ScalaCheck.

## Overview Matrix

| Feature | FluentCheck | QuickCheck | Hypothesis | fast-check | ScalaCheck |
|---------|-------------|------------|------------|------------|------------|
| Language | TypeScript | Haskell | Python | TypeScript | Scala |
| API Style | Fluent | Combinator | Decorator | Fluent | Combinator |
| Type Safety | ✅ Full | ✅ Full | ⚠️ Optional | ✅ Full | ✅ Full |
| BDD Support | ✅ Native | ❌ No | ❌ No | ⚠️ Manual | ❌ No |
| Shrinking | ✅ Auto | ✅ Auto | ✅ Auto | ✅ Auto | ✅ Auto |
| Stateful | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

## Detailed Analysis

### QuickCheck (Haskell) - The Original

**Strengths:**
- Coined standard terminology (`forAll`, `arbitrary`, `shrink`)
- Powerful type-driven generation via typeclasses
- Excellent compositional design

**API Pattern:**
```haskell
prop_reverse :: [Int] -> Bool
prop_reverse xs = reverse (reverse xs) == xs

-- Or with explicit quantification
prop_commutative = forAll arbitrary $ \a ->
  forAll arbitrary $ \b ->
    a + b == b + a
```

**Key Ergonomic Patterns:**
1. `suchThat` for filtering (not `filter`)
2. Implicit type-driven generation
3. Label/classify for test statistics
4. `===` for equality with better error messages

**Applicable to FluentCheck:**
- ✅ `suchThat` alias for `filter`
- ✅ Labeling/classification system
- ⚠️ Type-driven generation (limited in TS)

### Hypothesis (Python) - Modern UX Focus

**Strengths:**
- Outstanding error messages
- Database of failing examples
- `@given` decorator pattern
- Extensive strategy composition

**API Pattern:**
```python
@given(st.integers(), st.integers())
def test_addition_commutative(a, b):
    assert a + b == b + a

# With explicit strategies
@given(st.lists(st.integers(), min_size=1))
def test_sum_positive(xs):
    assert sum(xs) >= min(xs)
```

**Key Ergonomic Patterns:**
1. Decorator-based - minimal boilerplate
2. `assume()` for preconditions (vs filter)
3. `note()` for debugging output
4. Composable strategies with `.map()`, `.filter()`, `.flatmap()`

**Applicable to FluentCheck:**
- ✅ `assume()` for preconditions in test body
- ✅ `note()` for debugging
- ⚠️ Decorator pattern (not idiomatic TS)

### fast-check (TypeScript) - Direct Competitor

**Strengths:**
- Same language ecosystem
- Excellent arbitrary composition
- Good shrinking
- Active development

**API Pattern:**
```typescript
fc.assert(
  fc.property(fc.integer(), fc.integer(), (a, b) => {
    return a + b === b + a;
  })
);

// With pre-conditions
fc.assert(
  fc.property(fc.integer({ min: 1 }), fc.integer({ min: 1 }), (a, b) => {
    fc.pre(a !== b);  // Precondition
    return a + b > Math.max(a, b);
  })
);
```

**Key Ergonomic Patterns:**
1. `fc.property()` - direct property definition
2. `fc.pre()` - preconditions in test body
3. `fc.assert()` - throws on failure
4. Options objects for configuration
5. `.chain()` for dependent generation

**Applicable to FluentCheck:**
- ✅ `fc.prop()` shorthand entry point
- ✅ `fc.pre()` for in-body preconditions
- ✅ Throwing assertion mode
- ⚠️ Options objects (vs fluent config)

### ScalaCheck - Mature & Feature-Rich

**Strengths:**
- Mature ecosystem
- Powerful `Gen` and `Prop` abstractions
- Built-in stateful testing

**API Pattern:**
```scala
property("reverse") = forAll { (xs: List[Int]) =>
  xs.reverse.reverse == xs
}

// With constraints
property("positive") = forAll(Gen.posNum[Int]) { n =>
  n > 0
}

// With implication
property("division") = forAll { (a: Int, b: Int) =>
  (b != 0) ==> (a / b * b + a % b == a)
}
```

**Key Ergonomic Patterns:**
1. `==>` implication operator
2. `Gen.posNum`, `Gen.negNum` - common presets
3. `suchThat` for filtering
4. Built-in `Prop.forAll`, `Prop.exists`

**Applicable to FluentCheck:**
- ✅ Implication operator pattern
- ✅ Common arbitrary presets
- ✅ `suchThat` naming

## Best Practices Synthesis

### Naming Conventions

| Concept | QuickCheck | Hypothesis | fast-check | ScalaCheck | **Recommended** |
|---------|------------|------------|------------|------------|-----------------|
| Filter | `suchThat` | `filter` | `filter` | `suchThat` | **Add `suchThat` alias** |
| Precondition | - | `assume` | `pre` | `==>` | **Add `pre()` or `assume()`** |
| Transform | `fmap` | `map` | `map` | `map` | ✅ `map` is correct |
| Dependent | `>>=` | `flatmap` | `chain` | `flatMap` | ✅ `chain` is fine |

### Entry Points

| Style | Framework | FluentCheck |
|-------|-----------|-------------|
| Decorator | Hypothesis | Not applicable to TS |
| Direct | fast-check `fc.property()` | **Consider `fc.prop()`** |
| Fluent | FluentCheck `fc.scenario()` | ✅ Keep as primary |

### Configuration

| Approach | Framework | Assessment |
|----------|-----------|------------|
| Method chaining | FluentCheck | Verbose but explicit |
| Options object | fast-check | Concise for simple config |
| Global defaults | Hypothesis | Convenient but implicit |

**Recommendation**: Keep fluent config but add **preset strategies**

## Feature Gaps Analysis

### FluentCheck Advantages

1. **BDD-style API** - Unique in property testing space
2. **Type-safe accumulator** - Better than fast-check's tuple approach
3. **Named bindings** - More readable than positional params
4. **Given/When/Then** - Natural test structure

### FluentCheck Gaps

| Gap | Solution | Priority |
|-----|----------|----------|
| No simple entry for basic props | Add `fc.prop()` | High |
| No in-body preconditions | Add `fc.pre()` | Medium |
| No labeling/classification | Add `classify()` | Low |
| No stateful testing | Future enhancement | Low |
| No example database | Future enhancement | Low |

## Recommended Adoptions

### High Priority

1. **`fc.prop()` shorthand** (from fast-check)
   ```typescript
   // New
   fc.prop(fc.integer(), x => x + 0 === x)
   
   // Instead of
   fc.scenario().forall('x', fc.integer()).then(({ x }) => x + 0 === x).check()
   ```

2. **`suchThat` alias** (from QuickCheck/ScalaCheck)
   ```typescript
   fc.integer().suchThat(x => x > 0)
   // Same as
   fc.integer().filter(x => x > 0)
   ```

### Medium Priority

3. **`fc.pre()` preconditions** (from fast-check)
   ```typescript
   fc.scenario()
     .forall('a', fc.integer())
     .forall('b', fc.integer())
     .then(({ a, b }) => {
       fc.pre(b !== 0);  // Skip if precondition fails
       return a / b * b + a % b === a;
     })
     .check()
   ```

4. **Common arbitrary presets** (from ScalaCheck)
   ```typescript
   fc.positiveInt()   // integer(1, MAX_SAFE)
   fc.negativeInt()   // integer(MIN_SAFE, -1)
   fc.nonZeroInt()    // union(negativeInt(), positiveInt())
   fc.byte()          // integer(0, 255)
   fc.word()          // string of word chars
   ```

### Low Priority

5. **Classification/labeling** (from QuickCheck)
   ```typescript
   fc.scenario()
     .forall('x', fc.integer())
     .classify(({ x }) => x > 0 ? 'positive' : x < 0 ? 'negative' : 'zero')
     .then(({ x }) => x + 0 === x)
     .check()
   // Reports: 48% positive, 48% negative, 4% zero
   ```
