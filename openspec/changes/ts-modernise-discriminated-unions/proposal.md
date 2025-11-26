# Change: Use Discriminated Unions for Better Type Narrowing

## Why
The `ArbitrarySize` type uses a discriminant field (`type: 'exact' | 'estimated'`) but doesn't leverage TypeScript's discriminated union pattern fully. Currently, every `ArbitrarySize` carries a `credibleInterval` field even when `type === 'exact'`, where it's always redundantly set to `[value, value]`. This wastes memory, clutters the API, and prevents TypeScript from automatically narrowing types.

Proper discriminated unions enable:
- Exhaustive type checking in switch/if statements
- Automatic type narrowing based on the discriminant
- Cleaner data model where each variant only carries meaningful fields
- Better developer experience with context-aware autocomplete

## What Changes

### Primary: `ArbitrarySize` Discriminated Union
- Refactor `ArbitrarySize` into `ExactSize | EstimatedSize` discriminated union
- `ExactSize` contains only `type: 'exact'` and `value: number`
- `EstimatedSize` contains `type: 'estimated'`, `value: number`, and `credibleInterval: [number, number]`
- Create helper factory functions: `exactSize(value)` and `estimatedSize(value, interval)`
- Export both variant types for consumers who need to narrow explicitly

### Secondary: Utility Function Refactoring
- Update `mapArbitrarySize` in `util.ts` to properly handle discriminated unions
- Replace `NilArbitrarySize` constant with `NilArbitrarySize: ExactSize`

### All `size()` Implementations Requiring Updates
Files returning `ExactSize`:
- `ArbitraryInteger.ts` - returns exact count of integers in range
- `ArbitraryReal.ts` - inherits from ArbitraryInteger (no change needed)
- `ArbitraryConstant.ts` - always exactly 1
- `NoArbitrary.ts` - always exactly 0
- `ArbitrarySet.ts` - exact combinatorial count
- `ArbitraryArray.ts` - exact when base is exact

Files returning `EstimatedSize`:
- `FilteredArbitrary.ts` - uses Beta distribution estimation

Files returning either (conditional):
- `ArbitraryTuple.ts` - propagates type from component arbitraries
- `ArbitraryComposite.ts` - propagates type from component arbitraries

Files delegating to base (no changes needed):
- `ChainedArbitrary.ts` - delegates to `baseArbitrary.size()`
- `MappedArbitrary.ts` - delegates to `baseArbitrary.size()`
- `WrappedArbitrary.ts` - delegates to `baseArbitrary.size()`

### Consumer Updates
- `Arbitrary.ts:62` - uses `type` discriminant for sampling logic (benefits from narrowing)

## Impact
- Affected specs: None (type-level improvement)
- Affected code:
  - `src/arbitraries/types.ts` - type definitions
  - `src/arbitraries/util.ts` - helper functions and constants
  - `src/arbitraries/*.ts` - all `size()` implementations (11 files)
  - `src/arbitraries/Arbitrary.ts` - consumer of `ArbitrarySize.type`
- Breaking: **Yes** - external consumers creating `ArbitrarySize` objects directly will need updates
- Risk: Low - primarily type-level changes; runtime behavior unchanged

## Example

**Before:**
```typescript
export type ArbitrarySize = {
  value: number
  type: 'exact' | 'estimated'
  credibleInterval: [number, number]
}

// All implementations carry redundant credibleInterval:
size(): ArbitrarySize { 
  return {value: 0, type: 'exact', credibleInterval: [0, 0]} 
}
```

**After:**
```typescript
export type ExactSize = {
  type: 'exact'
  value: number
}

export type EstimatedSize = {
  type: 'estimated'
  value: number
  credibleInterval: [number, number]
}

export type ArbitrarySize = ExactSize | EstimatedSize

// Helper factories for clean construction:
export const exactSize = (value: number): ExactSize => ({ type: 'exact', value })
export const estimatedSize = (value: number, credibleInterval: [number, number]): EstimatedSize => 
  ({ type: 'estimated', value, credibleInterval })

// Clean implementations:
size(): ExactSize { return exactSize(0) }

// Usage with automatic narrowing:
function displaySize(size: ArbitrarySize): string {
  switch (size.type) {
    case 'exact':
      return `Exactly ${size.value}`
    case 'estimated':
      // TypeScript knows credibleInterval exists here!
      return `~${size.value} (${size.credibleInterval[0]}-${size.credibleInterval[1]})`
    default:
      const _exhaustive: never = size
      return _exhaustive
  }
}
```

## Benefits

### Type Safety
- TypeScript narrows types automatically based on discriminant
- Compile-time exhaustiveness checking prevents missing cases
- Impossible to access `credibleInterval` on exact sizes (type error)

### Code Quality  
- Clearer data model - each variant carries only meaningful fields
- Self-documenting: type signature tells you what data is available
- Reduced boilerplate - no need to set dummy `credibleInterval: [value, value]`

### Developer Experience
- Better IDE autocomplete within narrowed branches
- More informative error messages when narrowing fails
- Easier to reason about what data is available in each context

### Memory Efficiency
- Exact sizes no longer carry unused `credibleInterval` tuple
- Minor but meaningful for large-scale property testing

## Migration Considerations
- Existing code creating `ArbitrarySize` objects needs updates to use factory functions
- Helper functions `exactSize()` and `estimatedSize()` simplify migration
- External consumers should update to discriminated union pattern
- Consider deprecation notice in CHANGELOG for breaking change

## Future Opportunities
This pattern could be extended to other types in the codebase:
- `FluentResult` could use discriminated unions for satisfiable vs non-satisfiable results
- The `XOR` helper type could potentially be simplified with native discriminated unions
- `FluentPick.original` could be modeled more precisely (present vs absent)
