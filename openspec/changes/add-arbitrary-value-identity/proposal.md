# Change: Add Value Identity Functions to Arbitrary

> **GitHub Issue:** [#464](https://github.com/fluent-check/fluent-check/issues/464)

## Why

Several statistical methods rely on deterministic object comparison for deduplication (e.g., `sampleUnique`). Currently, this uses `JSON.stringify`, which:

- **Performance**: O(n) serialization cost for every comparison, creating strings that are immediately discarded
- **Memory pressure**: Allocates intermediate strings for each comparison
- **Fails on circular references**: `JSON.stringify` throws on objects with cycles
- **Non-deterministic edge cases**: Object key order inconsistencies in some environments

For primitive arbitraries (integers, booleans), this overhead is particularly wasteful since identity comparison is trivial.

## What Changes

- **Add `hashCode()` method** to `Arbitrary<A>` - returns a hash function for generated values, enabling O(1) hash-based lookups
- **Add `equals()` method** to `Arbitrary<A>` - returns an equality function for deterministic comparison
- **Primitive arbitraries** implement efficient identity (integers use identity, strings use native comparison)
- **Composite arbitraries** compose from their element arbitraries
- **Fallback behavior** - when not overridden, defaults to current `JSON.stringify` approach
- **Update `sampleUnique()`** to use the new identity functions for deduplication

## Impact

- Affected specs: `arbitraries` (Base Class, Sampling Methods)
- Affected code:
  - `src/arbitraries/Arbitrary.ts` - add base methods
  - `src/arbitraries/ArbitraryInteger.ts` - efficient integer identity
  - `src/arbitraries/ArbitraryReal.ts` - efficient real identity  
  - `src/arbitraries/ArbitraryBoolean.ts` - trivial boolean identity
  - `src/arbitraries/ArbitraryConstant.ts` - reference equality
  - `src/arbitraries/ArbitraryArray.ts` - composite identity
  - `src/arbitraries/ArbitraryTuple.ts` - composite identity
  - `src/arbitraries/ArbitraryRecord.ts` - composite identity
  - `src/arbitraries/ArbitrarySet.ts` - composite identity
  - `src/arbitraries/MappedArbitrary.ts` - inherit or fallback
  - `src/arbitraries/FilteredArbitrary.ts` - delegate to base
  - `src/arbitraries/ChainedArbitrary.ts` - fallback (unknown runtime arbitrary)

## Non-Goals

- **Not providing user-facing hash/equals API** - these are internal optimization hooks
- **Not guaranteeing hash collision-free behavior** - hashes are hints, equals is authoritative
- **Not supporting custom comparators per-instance** - arbitraries define their own identity

## Open Questions

**See [open-questions-resolution.md](./open-questions-resolution.md) for detailed analysis.**

1. ✅ **RESOLVED:** `hashCode` returns `number` (32-bit unsigned integer) - see Decision 2 in design.md
2. ❓ **DEFERRED:** Hash caching in `FluentPick` - kept as on-demand computation for now; spike recommended if performance issues arise
3. ✅ **RESOLVED:** `MappedArbitrary` always falls back to base class - see Decision 6 in design.md
