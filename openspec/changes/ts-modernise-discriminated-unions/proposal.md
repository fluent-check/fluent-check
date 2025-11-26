# Change: Use Discriminated Unions for Better Type Narrowing

## Why
The `ArbitrarySize` type uses a discriminant field (`type: 'exact' | 'estimated'`) but doesn't leverage TypeScript's discriminated union pattern fully. Proper discriminated unions enable exhaustive type checking and automatic type narrowing in switch statements and conditionals.

## What Changes
- Refactor `ArbitrarySize` to use proper discriminated union pattern
- Apply pattern to other types where variants have different shapes
- Enable exhaustive checking with `never` in switch statements
- Reduce optional fields by making them required in specific variants

## Impact
- Affected specs: None (type-level improvement)
- Affected code: `src/arbitraries/types.ts`, files consuming `ArbitrarySize`
- Breaking: Potentially breaking for external consumers using `ArbitrarySize`

## Example

**Before:**
```typescript
export type ArbitrarySize = {
  value: number
  type: 'exact' | 'estimated'
  credibleInterval: [number, number]
}
// credibleInterval is always present but only meaningful for 'estimated'
```

**After:**
```typescript
type ExactSize = {
  type: 'exact'
  value: number
}

type EstimatedSize = {
  type: 'estimated'
  value: number
  credibleInterval: [number, number]
}

export type ArbitrarySize = ExactSize | EstimatedSize

// Usage with automatic narrowing:
function displaySize(size: ArbitrarySize): string {
  switch (size.type) {
    case 'exact':
      return `Exactly ${size.value}`
    case 'estimated':
      return `~${size.value} (${size.credibleInterval[0]}-${size.credibleInterval[1]})`
    default:
      const _exhaustive: never = size
      return _exhaustive
  }
}
```

## Benefits
- TypeScript narrows types automatically based on discriminant
- Compile-time exhaustiveness checking
- Clearer data model (exact sizes don't carry unused credibleInterval)
- Better IDE autocomplete within narrowed branches

## Migration Considerations
- Existing code creating `ArbitrarySize` objects needs updates
- Helper functions may be useful: `exactSize(value)`, `estimatedSize(value, interval)`
- Consider backwards compatibility with type alias if needed
