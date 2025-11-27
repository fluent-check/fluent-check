# Composability Patterns

Research on patterns for reusable property definitions and test composition.

## Current State

### Arbitrary Composition (Excellent)

FluentCheck already provides excellent arbitrary composition:

```typescript
// Composition via map/filter/chain
const positiveEven = fc.integer(1, 1000)
  .filter(x => x % 2 === 0);

const coordinatePair = fc.tuple(fc.real(-100, 100), fc.real(-100, 100));

const personArbitrary = fc.tuple(
  fc.string(1, 50),  // name
  fc.integer(0, 120) // age
).map(([name, age]) => ({ name, age }));

// Composition via union
const jsonPrimitive = fc.union(
  fc.string(),
  fc.integer(),
  fc.boolean(),
  fc.constant(null)
);
```

**Assessment**: ✅ Excellent - follows functor/monad patterns

### Property Composition (Limited)

Currently, properties cannot be easily composed or reused:

```typescript
// Cannot extract and reuse this pattern
fc.scenario()
  .forall('xs', fc.array(fc.integer()))
  .then(({ xs }) => xs.length >= 0)  // Common assertion
  .check();

fc.scenario()
  .forall('ys', fc.array(fc.string()))
  .then(({ ys }) => ys.length >= 0)  // Duplicated assertion
  .check();
```

## Proposed Patterns

### Pattern 1: Property Combinators

**Concept:** Reusable assertion functions

```typescript
// Current approach - inline assertions
fc.scenario()
  .forall('xs', fc.array(fc.integer()))
  .then(({ xs }) => xs.length >= 0)
  .and(({ xs }) => Array.isArray(xs))
  .check();

// Proposed: Property combinator library
const props = {
  nonNegativeLength: <T>(arr: T[]) => arr.length >= 0,
  isArray: <T>(arr: T[]) => Array.isArray(arr),
  isSorted: (arr: number[]) => arr.every((v, i) => i === 0 || arr[i-1] <= v),
  isEmpty: <T>(arr: T[]) => arr.length === 0,
  nonEmpty: <T>(arr: T[]) => arr.length > 0,
};

// Usage
fc.scenario()
  .forall('xs', fc.array(fc.integer()))
  .then(({ xs }) => props.nonNegativeLength(xs))
  .and(({ xs }) => props.isArray(xs))
  .check();
```

**Benefits:**
- Reusable across tests
- Self-documenting assertions
- Reduced duplication

### Pattern 2: Property Templates

**Concept:** Pre-defined property patterns

```typescript
// Template for idempotency property
const idempotent = <T>(
  arb: Arbitrary<T>,
  fn: (x: T) => T
) => fc.scenario()
  .forall('x', arb)
  .given('once', ({ x }) => fn(x))
  .given('twice', ({ once }) => fn(once))
  .then(({ once, twice }) => JSON.stringify(once) === JSON.stringify(twice));

// Usage
idempotent(fc.array(fc.integer()), arr => [...new Set(arr)]).check();
idempotent(fc.string(), s => s.toLowerCase()).check();
```

**Templates Library:**
```typescript
const templates = {
  // f(f(x)) === f(x)
  idempotent: <T>(arb: Arbitrary<T>, fn: (x: T) => T) => ...,
  
  // f(g(x)) === g(f(x))
  commutative: <A, B>(arb: Arbitrary<A>, f: (a: A) => B, g: (a: A) => B) => ...,
  
  // f(a, f(b, c)) === f(f(a, b), c)
  associative: <T>(arb: Arbitrary<T>, f: (a: T, b: T) => T) => ...,
  
  // f(a, identity) === a
  identity: <T>(arb: Arbitrary<T>, f: (a: T, b: T) => T, id: T) => ...,
  
  // f(g(x)) === x (roundtrip)
  inverse: <A, B>(arb: Arbitrary<A>, encode: (a: A) => B, decode: (b: B) => A) => ...,
};

// Usage
templates.inverse(
  fc.array(fc.integer()),
  JSON.stringify,
  JSON.parse
).check();
```

### Pattern 3: Scenario Builders

**Concept:** Partially applied scenarios

```typescript
// Base scenario with common setup
const withStack = <T>() => fc.scenario()
  .given('stack', () => new Stack<T>());

// Extend for specific tests
withStack<number>()
  .forall('e', fc.integer())
  .when(({ e, stack }) => stack.push(e))
  .then(({ stack }) => stack.size() === 1)
  .check();

// Another test using same setup
withStack<string>()
  .forall('s', fc.string())
  .when(({ s, stack }) => stack.push(s))
  .then(({ stack }) => stack.size() === 1)
  .check();
```

**Challenge:** TypeScript type accumulation makes this tricky

### Pattern 4: Assertion Helpers

**Concept:** Wrapped assertions for common patterns

```typescript
const assertions = {
  // Array assertions
  array: {
    sorted: <T>(arr: T[], cmp: (a: T, b: T) => number = (a, b) => (a as any) - (b as any)) =>
      arr.every((v, i) => i === 0 || cmp(arr[i-1], v) <= 0),
    
    unique: <T>(arr: T[]) =>
      arr.length === new Set(arr).size,
    
    contains: <T>(arr: T[], item: T) =>
      arr.includes(item),
    
    allMatch: <T>(arr: T[], pred: (x: T) => boolean) =>
      arr.every(pred),
  },
  
  // Number assertions
  number: {
    inRange: (n: number, min: number, max: number) =>
      n >= min && n <= max,
    
    isFinite: (n: number) =>
      Number.isFinite(n),
    
    isInteger: (n: number) =>
      Number.isInteger(n),
  },
  
  // String assertions
  string: {
    nonEmpty: (s: string) =>
      s.length > 0,
    
    matches: (s: string, pattern: RegExp) =>
      pattern.test(s),
    
    startsWith: (s: string, prefix: string) =>
      s.startsWith(prefix),
  },
};

// Usage
fc.scenario()
  .forall('xs', fc.array(fc.integer()))
  .given('sorted', ({ xs }) => [...xs].sort((a, b) => a - b))
  .then(({ sorted }) => assertions.array.sorted(sorted))
  .check();
```

### Pattern 5: Property Composition Operators

**Concept:** Combine properties with logical operators

```typescript
// Property type wrapper
type Property<R extends {}> = (args: R) => boolean;

const propOps = {
  // p1 AND p2
  and: <R extends {}>(p1: Property<R>, p2: Property<R>): Property<R> =>
    (args) => p1(args) && p2(args),
  
  // p1 OR p2
  or: <R extends {}>(p1: Property<R>, p2: Property<R>): Property<R> =>
    (args) => p1(args) || p2(args),
  
  // NOT p
  not: <R extends {}>(p: Property<R>): Property<R> =>
    (args) => !p(args),
  
  // p1 IMPLIES p2
  implies: <R extends {}>(p1: Property<R>, p2: Property<R>): Property<R> =>
    (args) => !p1(args) || p2(args),
  
  // All properties hold
  all: <R extends {}>(...props: Property<R>[]): Property<R> =>
    (args) => props.every(p => p(args)),
  
  // Any property holds
  any: <R extends {}>(...props: Property<R>[]): Property<R> =>
    (args) => props.some(p => p(args)),
};

// Usage
const isPositive: Property<{ x: number }> = ({ x }) => x > 0;
const isEven: Property<{ x: number }> = ({ x }) => x % 2 === 0;

fc.scenario()
  .forall('x', fc.integer())
  .then(propOps.implies(isPositive, propOps.or(isEven, propOps.not(isEven))))
  .check();
```

## Framework Comparison

### Hypothesis (Python)

```python
# Composable strategies
@composite
def user_with_posts(draw):
    user = draw(users())
    posts = draw(st.lists(posts_for(user), min_size=1))
    return (user, posts)

# Property composition via regular functions
def is_valid_user(user):
    return user.age >= 0 and len(user.name) > 0
```

### ScalaCheck

```scala
// Property combinators
val sorted: Prop = forAll { (xs: List[Int]) =>
  val s = xs.sorted
  s.sliding(2).forall { case List(a, b) => a <= b }
}

// Property composition
val combined = prop1 && prop2
val conditional = prop1 ==> prop2
```

### fast-check

```typescript
// Model-based testing
fc.assert(
  fc.property(
    fc.commands(allCommands),
    fc.nat(),
    (cmds, seed) => {
      const model = new Model();
      const real = new Real();
      return fc.modelRun(() => ({ model, real }), cmds);
    }
  )
);
```

## Recommendations

### High Priority

1. **Property combinator library**
   - Create `fc.props` namespace
   - Include common assertions
   - Fully typed with generics

2. **Property templates**
   - Create `fc.templates` namespace
   - Include: idempotent, commutative, associative, inverse
   - Easy to extend

### Medium Priority

3. **Assertion helpers**
   - Create `fc.assert` namespace
   - Array, number, string helpers
   - Composable with `then()`

4. **Logical operators**
   - `propOps.and()`, `propOps.or()`, `propOps.implies()`
   - For combining property functions

### Low Priority (Future)

5. **Model-based testing support**
   - Command pattern
   - State machine testing
   - Beyond current scope

## Implementation Complexity

| Pattern | Complexity | Breaking Changes | Effort |
|---------|------------|------------------|--------|
| Property combinators | Low | None | 2 days |
| Property templates | Medium | None | 3 days |
| Assertion helpers | Low | None | 1 day |
| Logical operators | Low | None | 1 day |
| Model-based testing | High | None | 2 weeks |
