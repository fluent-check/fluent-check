# Design: Lazy Shrink Trees with Generators

## Context

FluentCheck uses shrinking to find minimal counterexamples after a failing test case is discovered. The current approach returns a new `Arbitrary<A>` from `shrink()`, which is then sampled to produce shrink candidates.

### Current Architecture

```
Property fails with counterexample
  → shrink(counterexample) returns Arbitrary<smaller_values>
  → Sample N candidates from shrunk arbitrary
  → Test each candidate
  → If fails, recurse with new counterexample
  → Continue until no smaller failing case found
```

### Problem

For composite types (tuples, records, arrays), the shrunk arbitrary is often a **union** of arbitraries, one per element that could shrink. This creates a tree structure:

```
Original: [10, 20, 30]
Shrink returns: union(
  tuple(shrink(10), constant(20), constant(30)),  // shrink first element
  tuple(constant(10), shrink(20), constant(30)),  // shrink second element
  tuple(constant(10), constant(20), shrink(30))   // shrink third element
)
```

For deeply nested types, this tree grows exponentially, causing:
- High memory allocation
- Long computation times
- Potential timeouts ([#138](https://github.com/fluent-check/fluent-check/issues/138))

## Goals / Non-Goals

### Goals

1. Reduce memory usage during shrinking by computing candidates lazily
2. Eliminate timeout issues for complex nested types
3. Maintain existing shrinking quality (find equally minimal counterexamples)
4. Keep the API ergonomic for custom arbitrary implementations

### Non-Goals

- Implementing integrated shrinking (Hypothesis/Hedgehog approach)
- Changing shrink search order or heuristics
- Adding shrink result caching

## Decisions

### Decision 1: Use ES6 Generators for Lazy Shrink Streams

**What**: Change `shrink()` return type from `Arbitrary<A>` to `Generator<FluentPick<A>>`.

**Why**:
- Native JavaScript/TypeScript feature, no dependencies
- Natural composition with `yield*`
- Lazy by default - candidates computed only when consumed
- Familiar to developers from async generators and iterators

**Alternatives considered**:
- **Iterable<FluentPick<A>>**: Less specific, harder to type
- **Stream<FluentPick<A>>**: Would require a library or custom implementation
- **LazyList<FluentPick<A>>**: Custom data structure, more code to maintain

### Decision 2: Binary Search Shrinking for Numeric Types

**What**: Shrink integers using binary search toward zero rather than linear enumeration.

**Why**:
- Logarithmic number of candidates vs linear
- Finds minimal counterexample in O(log n) steps
- Standard approach in QuickCheck, Hypothesis

**Example**:
```typescript
// Shrinking 100 toward 0
// Linear:  0, 1, 2, 3, ... 99 (100 candidates)
// Binary:  0, 50, 75, 88, 94, 97, 99 (7 candidates)
```

### Decision 3: Interleaved Element Shrinking for Composites

**What**: For tuples/records, yield shrink candidates by interleaving element positions.

**Why**:
- Finds minimal element values faster than exhaustive per-position
- Balances fairness across positions
- Avoids getting stuck shrinking one position when another would minimize faster

**Pattern**:
```typescript
*shrinkTuple(values) {
  const generators = values.map((v, i) => this.arbs[i].shrink(v))
  // Round-robin through positions
  while (generators.some(g => !g.done)) {
    for (const gen of generators) {
      const next = gen.next()
      if (!next.done) yield reconstruct(next.value)
    }
  }
}
```

### Decision 4: Preserve Backward Compatibility via Adapter

**What**: Provide a utility to convert generators back to arbitraries for legacy code.

**Why**:
- Some user code may depend on shrink returning an Arbitrary
- Migration can be gradual

**Implementation**:
```typescript
class GeneratorArbitrary<A> extends Arbitrary<A> {
  constructor(private generator: Generator<FluentPick<A>>) { super() }
  pick() { return this.generator.next().value }
  // ... other methods delegate to cached array
}
```

## API Changes

### Before

```typescript
abstract class Arbitrary<A> {
  shrink<B extends A>(initial: FluentPick<B>): Arbitrary<A>
}
```

### After

```typescript
abstract class Arbitrary<A> {
  *shrink<B extends A>(initial: FluentPick<B>): Generator<FluentPick<A>, void, unknown>
  
  // Adapter for legacy compatibility
  shrinkToArbitrary<B extends A>(initial: FluentPick<B>): Arbitrary<A>
}
```

## Strategy Integration

### Before (FluentStrategyMixins.ts)

```typescript
shrink<K extends string>(arbitraryName: K, partial: FluentResult) {
  const shrinkedArbitrary = this.arbitraries[arbitraryName].arbitrary.shrink(partial.example[arbitraryName])
  this.arbitraries[arbitraryName].collection = this.buildArbitraryCollection(shrinkedArbitrary, this.configuration.shrinkSize)
}
```

### After

```typescript
shrink<K extends string>(arbitraryName: K, partial: FluentResult) {
  const shrinkGenerator = this.arbitraries[arbitraryName].arbitrary.shrink(partial.example[arbitraryName])
  this.arbitraries[arbitraryName].shrinkIterator = shrinkGenerator
  this.arbitraries[arbitraryName].collection = []
  // Pull candidates lazily as needed
}

hasInput<K extends string>(arbitraryName: K): boolean {
  const arb = this.arbitraries[arbitraryName]
  if (arb.pickNum < arb.collection.length) return true
  if (arb.shrinkIterator) {
    const next = arb.shrinkIterator.next()
    if (!next.done) {
      arb.collection.push(next.value)
      return true
    }
  }
  return false
}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Generators are single-use; can't resample | Cache materialized candidates when resampling needed |
| Generator semantics unfamiliar to some devs | Document with examples, provide adapter function |
| Breaking change to shrink() signature | Major version bump, migration guide |
| Performance regression for simple types | Benchmark before/after, optimize hot paths |

## Migration Plan

1. **Phase 1**: Add generator-based `shrinkLazy()` alongside existing `shrink()`
2. **Phase 2**: Migrate strategy to use `shrinkLazy()` by default
3. **Phase 3**: Deprecate `shrink()` returning Arbitrary
4. **Phase 4**: Remove old signature in next major version

## Open Questions

1. Should we support async generators for arbitraries that need async shrinking?
2. How should we handle shrink generators in serialization (seed replay)?
3. Should there be a way to limit shrink depth to prevent infinite loops?
