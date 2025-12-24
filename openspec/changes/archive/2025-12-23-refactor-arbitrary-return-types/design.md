## Context

FluentCheck uses a discriminated union `ArbitrarySize = ExactSize | EstimatedSize` to represent arbitrary sizes. The intent is to allow users to narrow the type based on `size.type`:

```typescript
const size = arbitrary.size()
if (size.type === 'exact') {
  // TypeScript knows: size is ExactSize, has no credibleInterval
} else {
  // TypeScript knows: size is EstimatedSize, has credibleInterval
}
```

However, this benefit is lost because factory functions return `Arbitrary<A>`, whose `size()` method returns `ArbitrarySize`. Users must always narrow, even when the result is deterministic.

## Goals / Non-Goals

**Goals:**
- Factory functions return types that expose the specific `size()` return type
- Users can call `integer().size()` and get `ExactSize` directly
- Maintain backward compatibility (all existing code compiles)
- Support the discriminated union pattern end-to-end

**Non-Goals:**
- Exposing concrete implementation classes (e.g., `ArbitraryInteger`)
- Changing runtime behavior
- Breaking existing API contracts

## Decisions

### Decision: Use Interface Extension (not branded types)

Create interfaces that extend `Arbitrary<A>` with more specific `size()` return types:

```typescript
// In types.ts
export interface ExactSizeArbitrary<A> extends Arbitrary<A> {
  size(): ExactSize
}

export interface EstimatedSizeArbitrary<A> extends Arbitrary<A> {
  size(): EstimatedSize
}
```

**Rationale:**
- Clean and idiomatic TypeScript
- No runtime overhead
- Fully backward compatible (interfaces extend the base class)
- IDE autocompletion shows `ExactSize` properties directly

**Alternatives considered:**
1. **Return concrete classes** (e.g., `ArbitraryInteger`) - Rejected because it exposes implementation details
2. **Branded types** - More complex, less readable
3. **Generic type parameter on Arbitrary** - Would require changing every usage

### Decision: Transformation Method Return Types

| Method | Return Type | Rationale |
|--------|-------------|-----------|
| `filter()` | `EstimatedSizeArbitrary<A>` | Filtering always produces estimated size |
| `suchThat()` | `EstimatedSizeArbitrary<A>` | Alias for `filter()` |
| `map()` | Preserves base type | Mapping doesn't change cardinality |
| `chain()` | `Arbitrary<B>` | Complex composition, can't determine statically |

For `map()`, we use method overloading:
```typescript
// On ExactSizeArbitrary<A>
map<B>(f: (a: A) => B): ExactSizeArbitrary<B>

// On EstimatedSizeArbitrary<A>  
map<B>(f: (a: A) => B): EstimatedSizeArbitrary<B>
```

### Decision: Factory Function Categorization

**ExactSizeArbitrary factories:**
- `integer()`, `real()`, `nat()` - Bounded numeric ranges
- `boolean()` - Fixed cardinality (2)
- `constant()` - Fixed cardinality (1)
- `array()`, `set()` - Combinatorial but exact
- `char()`, `ascii()`, `hex()`, `base64()`, `unicode()` - Fixed character sets

**Arbitrary factories (unknown size type):**
- `union()` - Composite of potentially mixed types
- `tuple()` - Depends on component arbitraries
- `oneof()` - Uses `map()` internally, preserves base type

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Increased type complexity | Interfaces are simple extensions, not new abstractions |
| Method overloading complexity | Only needed for `map()`, straightforward pattern |
| Maintenance burden | Interfaces mirror existing implementation behavior |

## Migration Plan

1. Add new interfaces to `types.ts` (non-breaking)
2. Update factory return types one by one (non-breaking, more specific types)
3. Update `filter()`/`suchThat()` return type (non-breaking)
4. Update `map()` with overloading (non-breaking)
5. Update type-level tests to verify new behavior
6. No runtime changes needed

## Open Questions

1. Should `MappedArbitrary` implement a specific interface, or remain `Arbitrary<B>`?
   - **Proposed answer:** Keep it simple - `map()` on `ExactSizeArbitrary` returns `ExactSizeArbitrary`

2. Should presets (`positiveInt`, `nonEmptyString`, etc.) also return specific types?
   - **Proposed answer:** Yes, they delegate to factories that return specific types
