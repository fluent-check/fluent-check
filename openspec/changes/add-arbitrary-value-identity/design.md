# Design: Arbitrary Value Identity

## Context

The `sampleUnique()` method needs to deduplicate generated values. Currently it uses:

```typescript
const result = new Map<string, FluentPick<A>>()
// ...
if (!result.has(stringify(r.value))) result.set(stringify(r.value), r)
```

Where `stringify` calls `JSON.stringify` for objects. This has significant overhead for large/nested objects and primitives alike.

## Goals

- Reduce CPU overhead for deduplication in statistical sampling
- Eliminate unnecessary string allocations
- Support circular references (fallback gracefully)
- Maintain backward compatibility (same deduplication behavior)

## Non-Goals

- User-configurable equality semantics
- Perfect hash distribution (we accept collisions, equals() is authoritative)
- Exposing identity functions as public API

## Decisions

### Decision 1: Return functions, not direct values

**What:** `hashCode()` and `equals()` return functions `(a: A) => number` and `(a: A, b: A) => boolean`, not methods that take values directly.

**Why:** This allows:
- Caching the function reference for repeated calls
- Composition in derived arbitraries
- Clear separation between "what can this arbitrary hash" vs "hash this specific value"

**Alternative considered:** Instance methods like `arbitrary.hash(value)` - rejected because it couples the arbitrary instance lifecycle to each comparison.

### Decision 2: Use number for hashCode (not bigint)

**What:** Hash values are `number` type.

**Why:**
- JavaScript Map/Set use SameValueZero, which works with numbers
- Bitwise operations are faster on 32-bit integers
- No BigInt allocation overhead

**Trade-off:** 32-bit hash space may have more collisions for very large sample sizes. Acceptable because equals() resolves collisions.

### Decision 3: Fallback uses stringify

**What:** Default implementation in base `Arbitrary` class uses `JSON.stringify`.

**Why:**
- Maintains backward compatibility
- Works for any serializable value
- Allows incremental optimization (override only where it matters)

### Decision 4: Primitives use identity

**What:** 
- `ArbitraryInteger`: `hashCode = v => v | 0`, `equals = (a, b) => a === b`
- `ArbitraryReal`: `hashCode = doubleToHash`, `equals = Object.is` (handles NaN, -0)
- `ArbitraryBoolean`: `hashCode = v => v ? 1 : 0`, `equals = (a, b) => a === b`

**Why:** Primitives have trivial identity semantics and maximum optimization potential.

### Decision 5: Composites compose hash/equals

**What:** Arrays, tuples, records combine element hashes using a mixing function.

**Why:** Structural equality is the expected semantic for generated data.

**Hash mixing:** Use FNV-1a or similar fast mixer:
```typescript
const mix = (hash: number, value: number): number => {
  hash ^= value
  hash = Math.imul(hash, 0x01000193)
  return hash >>> 0
}
```

### Decision 6: MappedArbitrary falls back

**What:** `MappedArbitrary` does not attempt to derive identity from base + transform.

**Why:**
- The transformation function `f` is opaque
- Different inputs may map to equal outputs (non-injective)
- Fallback to stringify is correct, even if slower

**Future:** Could accept optional `hashCode`/`equals` in shrinkHelper parameter.

### Decision 7: Update sampleUnique to use identity functions

**What:** Replace string-keyed Map with hash-bucketed structure.

**Implementation sketch:**
```typescript
sampleUnique(sampleSize = 10, ...): FluentPick<A>[] {
  const hash = this.hashCode()
  const equals = this.equals()
  const buckets = new Map<number, FluentPick<A>[]>()
  
  const has = (value: A): boolean => {
    const h = hash(value)
    const bucket = buckets.get(h)
    return bucket !== undefined && bucket.some(p => equals(p.value, value))
  }
  
  const add = (pick: FluentPick<A>): void => {
    const h = hash(pick.value)
    const bucket = buckets.get(h) ?? []
    bucket.push(pick)
    buckets.set(h, bucket)
  }
  // ...
}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Hash collisions cause bucket bloat | Keep sample sizes reasonable; equals() ensures correctness |
| Breaking change if identity semantics differ from stringify | Extensive tests; stringify fallback as default |
| Added complexity in Arbitrary base class | Methods are optional overrides; default works |

## Migration Plan

1. Add base methods with fallback implementation
2. Override in primitive arbitraries (high-frequency, high-impact)
3. Override in composite arbitraries (arrays, tuples, records)
4. Update sampleUnique to use new methods
5. Benchmark to confirm improvement

Rollback: Revert to string-keyed Map if issues discovered.
