# Change: Reduce `as unknown as` Type Assertions

## Why
The codebase contains numerous `as unknown as Arbitrary<T>` type assertions, particularly in `src/arbitraries/index.ts`. These bypass TypeScript's type checking and can mask genuine type errors. Reducing type assertions improves type safety and makes the codebase more maintainable.

## What Changes
- Refactor generic type parameters to flow correctly without assertions
- Review class hierarchies for proper generic constraints
- Consider branded types or phantom types where needed
- Replace `as unknown as` with safer alternatives:
  - Proper generic constraints
  - Type guards
  - Overloaded function signatures
  - Conditional return types

## Impact
- Affected specs: None (internal type safety)
- Affected code: `src/arbitraries/index.ts`, `src/arbitraries/*.ts`
- Breaking: None if done correctly; may surface hidden type bugs

## Example

**Before:**
```typescript
export const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> =>
  min > max ? NoArbitrary : 
  min === max ? new ArbitraryConstant(min) as unknown as Arbitrary<number> : 
  new ArbitraryInteger(min, max) as unknown as Arbitrary<number>
```

**After (potential approach):**
```typescript
// Option 1: Fix class generics so they extend Arbitrary<number> properly
export const integer = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> =>
  min > max ? NoArbitrary : 
  min === max ? new ArbitraryConstant(min) : 
  new ArbitraryInteger(min, max)

// Option 2: Use a type-safe factory pattern
function createArbitrary<T>(impl: ArbitraryImpl<T>): Arbitrary<T> { ... }
```

## Investigation Required
This change requires careful analysis of:
1. Why assertions are needed (variance issues? missing constraints?)
2. The inheritance hierarchy of `Arbitrary` classes
3. How `NoArbitrary` singleton fits into the type system
4. Whether branded types could help distinguish arbitrary subtypes

## Notes
This is a higher-effort change that may require architectural adjustments. Consider implementing incrementally, starting with the most problematic patterns.
