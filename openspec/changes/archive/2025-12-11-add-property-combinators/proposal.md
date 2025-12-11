# Change: Add Property Combinator Library

> **GitHub Issue:** [#412](https://github.com/fluent-check/fluent-check/issues/412)

## Why

Common mathematical properties (idempotent, commutative, associative, roundtrip) are reimplemented across tests. A combinator library encapsulates these patterns, reducing duplication and improving expressiveness. These are standard patterns in property-based testing that benefit from reusable implementations.

## What Changes

Add `fc.props` namespace with reusable property helpers and `fc.templates` namespace with property test templates.

### Property Helpers (`fc.props`)

```typescript
// Simple property checks
fc.props.sorted(arr, comparator?)  // Check if array is sorted
fc.props.unique(arr)               // Check if all elements unique
fc.props.nonEmpty(arr)             // Check if array has elements
fc.props.inRange(n, min, max)      // Check if in range
fc.props.matches(s, pattern)       // Check if matches regex

// Mathematical property predicates (composable in scenarios)
fc.props.roundtrips(value, encode, decode)    // decode(encode(x)) === x
fc.props.isIdempotent(value, fn)              // f(f(x)) === f(x)
fc.props.commutes(a, b, fn)                   // f(a, b) === f(b, a)
fc.props.associates(a, b, c, fn)              // f(a, f(b, c)) === f(f(a, b), c)
fc.props.hasIdentity(value, fn, identity)     // f(a, id) === a
```

### Property Templates (`fc.templates`)

Templates are standalone tests built on top of `fc.props` predicates:

```typescript
// Roundtrip: decode(encode(x)) === x
fc.templates.roundtrip(arb, encode, decode).check();

// Idempotent: f(f(x)) === f(x)
fc.templates.idempotent(arb, fn).check();

// Commutative: f(a, b) === f(b, a)
fc.templates.commutative(arb, fn).check();

// Associative: f(a, f(b, c)) === f(f(a, b), c)
fc.templates.associative(arb, fn).check();

// Identity: f(a, id) === a
fc.templates.identity(arb, fn, identityValue).check();
```

### Integration with Full Scenarios

Property helpers are designed to work seamlessly within `fc.scenario()` chains, making complex property tests more readable:

#### Examples

Using `fc.props` in `.then()` clauses:

```typescript
fc.scenario()
  .forall('arr', fc.array(fc.integer()))
  .then(({ arr }) => fc.props.sorted(arr.sort((a, b) => a - b)))
  .check()
  .assertSatisfiable();
```

Combining with given/when/then pattern:

```typescript
fc.scenario()
  .forall('numbers', fc.array(fc.integer(-100, 100)))
  .given('sorted', ({ numbers }) => [...numbers].sort((a, b) => a - b))
  .then(({ sorted }) => fc.props.sorted(sorted))
  .and(({ sorted }) => fc.props.nonEmpty(sorted) || sorted.length === 0)
  .check()
  .assertSatisfiable();
```

Using with multiple arbitraries:

```typescript
fc.scenario()
  .forall('arr', fc.array(fc.integer()))
  .forall('min', fc.integer(-10, 10))
  .forall('max', fc.integer(10, 20))
  .given('filtered', ({ arr, min, max }) => 
    arr.filter(n => fc.props.inRange(n, min, max))
  )
  .then(({ filtered, min, max }) => 
    filtered.every(n => fc.props.inRange(n, min, max))
  )
  .check();
```

String pattern matching in scenarios:

```typescript
fc.scenario()
  .forall('email', fc.string())
  .given('isValid', ({ email }) => 
    fc.props.matches(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  )
  .then(({ email, isValid }) =>
    // If it matches pattern, it should be valid
    !isValid || email.includes('@')
  )
  .check();
```

Complex scenario with multiple property checks:

```typescript
fc.scenario()
  .forall('arr', fc.array(fc.integer(), 1, 100))
  .given('unique', ({ arr }) => [...new Set(arr)])
  .given('sorted', ({ unique }) => [...unique].sort((a, b) => a - b))
  .then(({ sorted }) => fc.props.sorted(sorted))
  .and(({ sorted, unique }) => sorted.length === unique.length)
  .and(({ sorted }) => fc.props.nonEmpty(sorted))
  .check()
  .assertSatisfiable();
```

Using with preconditions:

```typescript
fc.scenario()
  .forall('arr', fc.array(fc.integer()))
  .pre(({ arr }) => fc.props.nonEmpty(arr))
  .then(({ arr }) => arr.length > 0)
  .check()
  .assertSatisfiable();
```

## Impact

- Affected specs: `fluent-api`
- Affected code: New `src/props.ts` and `src/templates.ts`
- Breaking: None - additive change
- Reusability: Common patterns encapsulated
