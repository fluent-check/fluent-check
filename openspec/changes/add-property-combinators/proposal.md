# Change: Add Property Combinator Library

> **GitHub Issue:** [#412](https://github.com/fluent-check/fluent-check/issues/412)

## Why

Common mathematical properties (idempotent, commutative, associative, roundtrip) are reimplemented across tests. A combinator library encapsulates these patterns, reducing duplication and improving expressiveness. These are standard patterns in property-based testing that benefit from reusable implementations.

## What Changes

Add `fc.props` namespace with reusable property helpers and `fc.templates` namespace with property test templates.

### Property Helpers (`fc.props`)

```typescript
// Array properties
fc.props.sorted(arr, comparator?)  // Check if array is sorted
fc.props.unique(arr)               // Check if all elements unique
fc.props.nonEmpty(arr)             // Check if array has elements

// Number properties
fc.props.inRange(n, min, max)      // Check if in range

// String properties
fc.props.matches(s, pattern)       // Check if matches regex
```

### Property Templates (`fc.templates`)

```typescript
// Roundtrip: decode(encode(x)) === x
fc.templates.roundtrip(arb, encode, decode).check();

// Idempotent: f(f(x)) === f(x)
fc.templates.idempotent(arb, fn).check();

// Commutative: f(a, b) === f(b, a)
fc.templates.commutative(arb, fn).check();

// Associative: f(a, f(b, c)) === f(f(a, b), c)
fc.templates.associative(arb, fn).check();
```

## Impact

- Affected specs: `fluent-api`
- Affected code: New `src/props.ts` and `src/templates.ts`
- Breaking: None - additive change
- Reusability: Common patterns encapsulated
