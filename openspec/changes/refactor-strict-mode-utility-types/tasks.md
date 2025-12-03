## 1. Code Analysis and Cataloging

- [x] 1.1 Search for function return types that could use `NonNullable<T>`
- [x] 1.2 Search for object types that could use `Required<T>` after validation
- [x] 1.3 Search for array filtering operations that don't narrow types
- [x] 1.4 Search for discriminated union patterns that could use `Extract<T, U>`
- [x] 1.5 Catalog all locations where utility types can replace runtime checks
- [x] 1.6 Identify custom utility types needed for project-specific patterns

## 2. Create Custom Utility Types

- [x] 2.1 Create `src/arbitraries/types.ts` utility type exports (or appropriate location)
- [x] 2.2 Define `Defined<T> = Exclude<T, undefined>` for clarity
- [x] 2.3 Define `Validated<T extends Record<string, unknown>> = Required<T>` for validated structures
- [x] 2.4 Define `NonEmptyArray<T> = [T, ...T[]]` if needed for guaranteed non-empty arrays
- [x] 2.5 Document utility types in code comments

## 3. Apply NonNullable Pattern

- [x] 3.1 Refactor `Arbitrary.ts:37` filtering to use `NonNullable<FluentPick<A>>[]` return type
- [x] 3.2 Update array filtering operations to use type guards with `NonNullable<T>`
- [x] 3.3 Apply `NonNullable<T>` to function return types after validation
- [x] 3.4 Verify type narrowing works correctly with filtered arrays
- [x] 3.5 Run tests to ensure no regressions

## 4. Apply Required Pattern

- [x] 4.1 Identify object types that are validated but remain optional in type system
- [x] 4.2 Create validation functions that return `Required<T>` types
- [x] 4.3 Update `ArbitraryRecord` schema access to use `Required<RecordSchema>` after validation
- [x] 4.4 Apply `Required<Pick<T, K>>` for partial required transformations
- [x] 4.5 Verify type safety with required properties
- [x] 4.6 Run tests to ensure no regressions

## 5. Apply Exclude Pattern

- [x] 5.1 Use `Exclude<T, undefined>` for array element types after filtering
- [x] 5.2 Apply `Exclude<T, null>` where only null needs to be excluded
- [x] 5.3 Use `Exclude` in custom utility type definitions
- [x] 5.4 Verify type narrowing works correctly
- [x] 5.5 Run tests to ensure no regressions

## 6. Apply Extract Pattern

- [x] 6.1 Identify discriminated union patterns in codebase
- [x] 6.2 Use `Extract<T, U>` for narrowing discriminated unions
- [x] 6.3 Replace manual type narrowing with `Extract` where applicable
- [x] 6.4 Verify type narrowing works correctly
- [x] 6.5 Run tests to ensure no regressions

## 7. Documentation

- [x] 7.1 Update `docs/patterns/strict-mode-patterns.md` with utility type examples
- [x] 7.2 Add examples showing before/after with utility types
- [x] 7.3 Document custom utility types and when to use them
- [x] 7.4 Add examples to `docs/patterns/strict-mode-refactoring-examples.md`

## 8. ESLint Configuration Review

- [x] 8.1 Review `eslint.config.js` for rules that interact with utility types
- [x] 8.2 Verify `@typescript-eslint/no-unnecessary-type-assertion` works with utility types
- [x] 8.3 Document any ESLint rule considerations in proposal
- [x] 8.4 Ensure no new linting issues introduced

## 9. Verification

- [x] 9.1 Run TypeScript compiler to ensure no type errors
- [x] 9.2 Run linter to ensure no new issues
- [x] 9.3 Run full test suite to ensure no regressions
- [x] 9.4 Verify utility types eliminate runtime checks where applied
- [x] 9.5 Verify code is more readable and maintainable
