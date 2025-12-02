# Change: Adopt Type-Level Utility Types for Strict Mode

> **GitHub Issue:** [#478](https://github.com/fluent-check/fluent-check/issues/478)

## Why

After enabling `noUncheckedIndexedAccess: true`, many functions and types were updated with defensive runtime checks (`if (x === undefined)`). However, TypeScript's built-in utility types (`NonNullable<T>`, `Required<T>`, `Exclude<T, undefined>`, `Extract<T, U>`) can express non-nullable constraints at the type level with **zero runtime overhead**, eliminating the need for many runtime checks entirely.

**Current Problem:**
- Functions return `(T | undefined)[]` and require runtime filtering with undefined checks
- Object types remain optional even after validation, requiring repeated runtime checks
- Array filtering operations don't narrow types, requiring manual type guards
- Discriminated unions require manual type narrowing instead of using `Extract<T, U>`

**Solution:**
Use TypeScript utility types to express constraints at the type level, allowing the compiler to enforce non-nullable guarantees without runtime checks.

## What Changes

### Type-Level Utility Types (Zero Runtime Overhead)

1. **`NonNullable<T>`** - Exclude `null` and `undefined` from types
   - Use in function return types after filtering undefined values
   - Use with `filter()` and type guards to narrow array element types
   - Example: `NonNullable<typeof items[number]>[]` for filtered arrays

2. **`Required<T>`** - Make all properties required
   - Use after validating object structures
   - Transform `Partial<T>` or optional properties to required after validation
   - Example: `Required<Schema>` after validation ensures all keys are present

3. **`Exclude<T, undefined>`** - Remove `undefined` from union types
   - Use for array element types after filtering
   - Alternative to `NonNullable` when only excluding `undefined`
   - Example: `Exclude<string | undefined, undefined>` → `string`

4. **`Extract<T, U>`** - Extract assignable types from unions
   - Use for discriminated union narrowing
   - Extract specific union members based on type predicates
   - Example: `Extract<Result, Success>` for narrowing discriminated unions

5. **Custom Utility Types** - Create project-specific utilities
   - `Defined<T> = Exclude<T, undefined>` for clarity
   - `Validated<T extends Record<string, unknown>> = Required<T>` for validated structures
   - `NonEmptyArray<T> = [T, ...T[]]` for arrays with guaranteed elements

### Code Analysis

**Current Issues Found:**

1. **`src/arbitraries/Arbitrary.ts:37`** - Filtering with manual undefined checks:
   ```typescript
   if (pick !== undefined) result.push(pick)
   ```
   Can use: `NonNullable<FluentPick<A>>[]` return type with type guard filter

2. **`src/arbitraries/ArbitraryRecord.ts`** - Schema access requires runtime checks:
   ```typescript
   for (const key of this.#keys) {
     const arbitrary = this.schema[key]  // Type: Arbitrary<unknown> | undefined
     // Would need: if (arbitrary === undefined) continue
   }
   ```
   Can use: `Required<RecordSchema>` after validation, or mapped type transformation

3. **Array filtering patterns** - Throughout codebase, filtering undefined values:
   ```typescript
   const filtered = items.filter(item => item !== undefined)  // TypeScript 5.5: automatically NonNullable<T>[]
   ```
   **TypeScript 5.5 Improvement**: Inferred type predicates automatically narrow types:
   - `filter(item => item !== undefined)` automatically infers `NonNullable<T>[]` (no explicit type guard needed!)
   - `filter(item => item !== null)` automatically infers `Exclude<T, null>[]`
   - Only use explicit type guards when TypeScript cannot infer the predicate

4. **Function return types** - Many functions return `T | undefined` when they could return `NonNullable<T>` after validation

5. **`src/FluentCheck.ts:267-275`** - `unwrapFluentPick()` filters undefined but doesn't express type-level safety:
   ```typescript
   static unwrapFluentPick<T>(testCase: PickResult<T>): ValueResult<T> {
     const result: Record<string, T> = {}
     for (const k in testCase) {
       const pick = testCase[k]
       if (pick !== undefined) {  // Runtime check
         result[k] = pick.value
       }
     }
     return result
   }
   ```
   **Type-Level Opportunity:** Use `filter()` with `NonNullable` to express type-level filtering:
   ```typescript
   static unwrapFluentPick<T>(testCase: PickResult<T>): ValueResult<T> {
     // TypeScript 5.5 auto-infers NonNullable from filter
     const entries = Object.entries(testCase)
       .filter(([, pick]) => pick !== undefined) as [string, NonNullable<FluentPick<T>>][]
     return Object.fromEntries(entries.map(([k, pick]) => [k, pick.value])) as ValueResult<T>
   }
   ```
   **Note:** This example is also relevant to `refactor-strict-mode-array-methods` for using array methods over manual iteration.

### Impact on ESLint Configuration

**Current ESLint Rules:**
- `@typescript-eslint/no-non-null-assertion: 'warn'` - Warns on `!` operator
- `@typescript-eslint/strict-boolean-expressions: 'error'` - Enforces strict boolean checks

**Proposed Changes:**
- **No changes needed** - Utility types are compile-time only, no runtime assertions
- Utility types actually **reduce** the need for non-null assertions by expressing constraints in types
- Consider adding rule to prefer utility types over manual type guards when possible (if ESLint plugin exists)

**ESLint Rule Considerations:**
- `@typescript-eslint/prefer-nullish-coalescing` - Already encourages `??` over `||`
- `@typescript-eslint/no-unnecessary-type-assertion` - Already warns on unnecessary assertions
- Utility types complement these rules by providing type-level alternatives

### Related Techniques

This pattern works synergistically with:
1. **Mapped Types for Validated Structures** - Use `Required<T>` as part of mapped type transformations
2. **Assertion Functions** - Assertion functions can return `NonNullable<T>` types
3. **Type Guard Helpers** - Type guards can use `NonNullable<T>` in return type predicates
4. **Array Methods Over Manual Iteration** - `filter()` with type guards using `NonNullable<T>` narrows types automatically

## Impact

- **Affected specs:** `tooling/spec.md` (code quality patterns)
- **Affected code:**
  - `src/arbitraries/Arbitrary.ts` - Filtering operations
  - `src/arbitraries/ArbitraryRecord.ts` - Schema access patterns
  - `src/arbitraries/ArbitraryTuple.ts` - Array element access
  - `src/arbitraries/FilteredArbitrary.ts` - Filter result types
  - `src/arbitraries/ArbitraryArray.ts` - Array operations
  - Any function that filters undefined values or validates structures
- **Breaking:** No runtime behavior changes, purely type-level improvements
- **Performance:** Zero runtime overhead (compile-time only)
- **Documentation:** Updates to `docs/patterns/strict-mode-patterns.md` with utility type examples
