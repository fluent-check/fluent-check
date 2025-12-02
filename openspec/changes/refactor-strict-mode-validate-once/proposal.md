# Change: Adopt Validate Once, Assert Safely Pattern

> **GitHub Issue:** [#482](https://github.com/fluent-check/fluent-check/issues/482)

## Why

When runtime validation is necessary, it should happen once at the start of a function or at construction, not repeatedly throughout the code. **Modern TypeScript (5.5+) provides excellent type inference that can eliminate the need for non-null assertions (`!`) in many cases**, using control flow analysis and inferred type predicates.

**Current Problem:**
- Validation happens multiple times in the same function
- Redundant `if (x === undefined)` checks after validation
- Bounds are validated but then checked again
- Code is noisy with repeated validation logic
- Non-null assertions (`!`) are used when TypeScript's type inference could handle it

**Solution:**
Validate bounds/validity upfront (at function start or construction), then leverage TypeScript 5.5+ type inference features:
- **Inferred Type Predicates (TS 5.5)**: `filter()` automatically narrows types without explicit type guards
- **Control Flow Narrowing (TS 5.5)**: Constant indexed accesses are narrowed based on control flow
- **Preserved Narrowing in Closures (TS 5.4)**: Type narrowing is preserved in closures
- **Non-null assertions as last resort**: Only use `!` when type inference cannot handle the case

## What Changes

### Validate Once, Assert Safely Pattern

1. **Early Validation** - Validate at function start:
   - Check bounds, existence, or validity upfront
   - Fail fast with clear error messages
   - Eliminate need for subsequent checks

2. **Leverage TypeScript 5.5+ Type Inference** - Prefer type inference over `!` operator:
   - **Inferred Type Predicates**: Use `filter(item => item !== undefined)` - TypeScript 5.5 automatically infers `NonNullable<T>[]`
   - **Control Flow Narrowing**: After validation checks, TypeScript 5.5 narrows constant indexed accesses automatically
   - **Preserved Narrowing**: Type narrowing is preserved in closures (TS 5.4+)
   - **Non-null assertions as last resort**: Only use `!` when type inference cannot handle the case

3. **Construction-Time Validation** - Validate at object construction:
   - Validate schema/configuration at constructor
   - Store validated state
   - Eliminate runtime checks in methods

### Code Analysis

**Current Issues Found:**

1. **`src/arbitraries/ArbitraryComposite.ts:25-32`** - No upfront validation:
   ```typescript
   override pick(generator: () => number) {
     const weights = this.arbitraries.reduce(...)
     const lastWeight = weights.at(-1)
     const picked = Math.floor(generator() * (lastWeight ?? 0))
     return this.arbitraries[weights.findIndex(s => s > picked)].pick(generator)
   }
   ```
   **Problem:** No validation that `arbitraries` is non-empty, `findIndex` can return `-1`
   **Solution:** Validate at start, then leverage TypeScript 5.5 control flow narrowing:
   ```typescript
   override pick(generator: () => number) {
     if (this.arbitraries.length === 0) {
       throw new Error('Cannot pick from empty composite arbitrary')
     }
     const weights = this.arbitraries.reduce(...)
     const index = weights.findIndex(s => s > picked)
     // TypeScript 5.5 narrows this.arbitraries[index] after bounds check
     if (index >= 0 && index < this.arbitraries.length) {
       return this.arbitraries[index].pick(generator) // No ! needed - type narrowed
     }
     // Handle -1 case
   }
   ```

2. **`src/arbitraries/ArbitrarySet.ts`** - Repeated bounds checks:
   ```typescript
   const index = Math.floor(generator() * this.elements.length)
   const element = this.elements[index]
   if (element !== undefined) {
     pick.add(element)
   }
   ```
   **Problem:** Bounds check happens every iteration
   **Solution:** Use TypeScript 5.5 control flow narrowing - after bounds check, type is automatically narrowed:
   ```typescript
   const index = Math.floor(generator() * this.elements.length)
   if (index >= 0 && index < this.elements.length) {
     // TypeScript 5.5 narrows this.elements[index] to T (not T | undefined)
     pick.add(this.elements[index]) // No ! needed - type narrowed by control flow
   }
   ```

3. **Repeated validation patterns** - Throughout codebase, same validation happens multiple times

### Impact on ESLint Configuration

**Current ESLint Rules:**
- `@typescript-eslint/no-non-null-assertion: 'warn'` - Warns on `!` operator

**Proposed Changes:**
- **Prefer TypeScript 5.5+ type inference over `!` operator** - Modern TypeScript can infer types after validation
- **Use `!` only as last resort** - When type inference cannot handle the case
- Consider adding ESLint rule comments where `!` is truly necessary:
  ```typescript
   // TypeScript cannot infer type here - validated bounds above
   return this.arbitraries[index]! // eslint-disable-line @typescript-eslint/no-non-null-assertion
   ```
- Document pattern: leverage TypeScript 5.5+ type inference first, use `!` only when needed

**ESLint Rule Considerations:**
- `@typescript-eslint/no-non-null-assertion` warns on `!` - prefer type inference when possible
- TypeScript 5.5+ provides better type inference that reduces need for `!`
- Prefer assertion functions over `!` when validation provides error messages
- Use `!` only when type inference cannot handle the case

### Modern TypeScript 5.5+ Type Inference Features

**1. Inferred Type Predicates (TypeScript 5.5)**
- `filter(item => item !== undefined)` automatically infers `NonNullable<T>[]` without explicit type guard
- `filter(item => item !== null)` automatically infers `Exclude<T, null>[]`
- Eliminates need for explicit `(item): item is NonNullable<T>` type guards in most cases
- Example:
  ```typescript
  const items: (string | undefined)[] = [...]
  const defined = items.filter(item => item !== undefined) // Type: string[] (not (string | undefined)[])
  ```

**2. Control Flow Narrowing for Constant Indexed Accesses (TypeScript 5.5)**
- After bounds checks, constant indexed accesses are automatically narrowed
- `if (index >= 0 && index < array.length) { array[index] }` - type is automatically `T`, not `T | undefined`
- Eliminates need for `!` operator after bounds validation
- Example:
  ```typescript
  const index = findIndex(...)
  if (index >= 0 && index < this.items.length) {
    return this.items[index] // Type: T (not T | undefined) - no ! needed
  }
  ```

**3. Preserved Narrowing in Closures (TypeScript 5.4)**
- Type narrowing is preserved in closures after the last assignment
- No need for `!` operator in callbacks when type is narrowed before closure
- Example:
  ```typescript
  if (value !== undefined) {
    setTimeout(() => {
      value.toUpperCase() // Type: string (not string | undefined) - no ! needed
    }, 100)
  }
  ```

### Related Techniques

This pattern works synergistically with:
1. **Early Validation** - Validate at function start, then leverage type inference
2. **Assertion Functions** - Assertion functions can validate and narrow types
3. **Known Data Structures** - Validate at construction, then leverage type inference
4. **Mapped Types for Validated Structures** - Validate once, then use mapped types
5. **Array Methods with Inferred Type Predicates** - Use `filter()` with TypeScript 5.5 inferred type predicates

## Impact

- **Affected specs:** `tooling/spec.md` (code quality patterns)
- **Affected code:**
  - `src/arbitraries/ArbitraryComposite.ts` - Bounds validation
  - `src/arbitraries/ArbitrarySet.ts` - Array access validation
  - Any function with repeated validation checks
- **Breaking:** No runtime behavior changes, improves code clarity
- **Performance:** Slight improvement (validation happens once instead of repeatedly)
- **Documentation:** Updates to `docs/patterns/strict-mode-patterns.md` with validate-once examples
