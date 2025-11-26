# Change: Adopt ES2022+ Language Features

## Why
The project targets ES2022 but doesn't fully utilize its features. Modern JavaScript provides cleaner, safer alternatives to common patterns. Adopting these features improves code readability and reduces potential for bugs.

## What Changes

### 1. `Array.at()` for Negative Indexing
Replace `array[array.length - 1]` with `array.at(-1)` for cleaner last-element access.

**Before:**
```typescript
weights[weights.length - 1]
```

**After:**
```typescript
weights.at(-1)
```

### 2. `Object.hasOwn()` for Property Checks
Replace `obj.hasOwnProperty(key)` with `Object.hasOwn(obj, key)` for safer property checks that work even if `hasOwnProperty` is overridden.

**Before:**
```typescript
if (testCase.hasOwnProperty(name)) { ... }
```

**After:**
```typescript
if (Object.hasOwn(testCase, name)) { ... }
```

### 3. Error `cause` for Error Chaining
Add `cause` option when rethrowing errors to preserve the error chain.

**Before:**
```typescript
throw new Error('Method <hasInput> not implemented.')
```

**After:**
```typescript
throw new Error('Method <hasInput> not implemented.', { 
  cause: new Error('FluentStrategy is abstract - extend and implement') 
})
```

## Impact
- Affected specs: None (implementation detail)
- Affected code: Various files throughout `src/`
- Breaking: None (semantically equivalent)

## Files to Review
- `src/arbitraries/ArbitraryComposite.ts` - array access patterns
- `src/strategies/FluentStrategy.ts` - error throwing
- `src/FluentCheck.ts` - object property checks
