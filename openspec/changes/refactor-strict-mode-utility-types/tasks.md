## 1. Code Analysis and Cataloging

- [ ] 1.1 Search for function return types that could use `NonNullable<T>`
- [ ] 1.2 Search for object types that could use `Required<T>` after validation
- [ ] 1.3 Search for array filtering operations that don't narrow types
- [ ] 1.4 Search for discriminated union patterns that could use `Extract<T, U>`
- [ ] 1.5 Catalog all locations where utility types can replace runtime checks
- [ ] 1.6 Identify custom utility types needed for project-specific patterns

## 2. Create Custom Utility Types

- [ ] 2.1 Create `src/arbitraries/types.ts` utility type exports (or appropriate location)
- [ ] 2.2 Define `Defined<T> = Exclude<T, undefined>` for clarity
- [ ] 2.3 Define `Validated<T extends Record<string, unknown>> = Required<T>` for validated structures
- [ ] 2.4 Define `NonEmptyArray<T> = [T, ...T[]]` if needed for guaranteed non-empty arrays
- [ ] 2.5 Document utility types in code comments

## 3. Apply NonNullable Pattern

- [ ] 3.1 Refactor `Arbitrary.ts:37` filtering to use `NonNullable<FluentPick<A>>[]` return type
- [ ] 3.2 Update array filtering operations to use type guards with `NonNullable<T>`
- [ ] 3.3 Apply `NonNullable<T>` to function return types after validation
- [ ] 3.4 Verify type narrowing works correctly with filtered arrays
- [ ] 3.5 Run tests to ensure no regressions

## 4. Apply Required Pattern

- [ ] 4.1 Identify object types that are validated but remain optional in type system
- [ ] 4.2 Create validation functions that return `Required<T>` types
- [ ] 4.3 Update `ArbitraryRecord` schema access to use `Required<RecordSchema>` after validation
- [ ] 4.4 Apply `Required<Pick<T, K>>` for partial required transformations
- [ ] 4.5 Verify type safety with required properties
- [ ] 4.6 Run tests to ensure no regressions

## 5. Apply Exclude Pattern

- [ ] 5.1 Use `Exclude<T, undefined>` for array element types after filtering
- [ ] 5.2 Apply `Exclude<T, null>` where only null needs to be excluded
- [ ] 5.3 Use `Exclude` in custom utility type definitions
- [ ] 5.4 Verify type narrowing works correctly
- [ ] 5.5 Run tests to ensure no regressions

## 6. Apply Extract Pattern

- [ ] 6.1 Identify discriminated union patterns in codebase
- [ ] 6.2 Use `Extract<T, U>` for narrowing discriminated unions
- [ ] 6.3 Replace manual type narrowing with `Extract` where applicable
- [ ] 6.4 Verify type narrowing works correctly
- [ ] 6.5 Run tests to ensure no regressions

## 7. Documentation

- [ ] 7.1 Update `docs/patterns/strict-mode-patterns.md` with utility type examples
- [ ] 7.2 Add examples showing before/after with utility types
- [ ] 7.3 Document custom utility types and when to use them
- [ ] 7.4 Add examples to `docs/patterns/strict-mode-refactoring-examples.md`

## 8. ESLint Configuration Review

- [ ] 8.1 Review `eslint.config.js` for rules that interact with utility types
- [ ] 8.2 Verify `@typescript-eslint/no-unnecessary-type-assertion` works with utility types
- [ ] 8.3 Document any ESLint rule considerations in proposal
- [ ] 8.4 Ensure no new linting issues introduced

## 9. Verification

- [ ] 9.1 Run TypeScript compiler to ensure no type errors
- [ ] 9.2 Run linter to ensure no new issues
- [ ] 9.3 Run full test suite to ensure no regressions
- [ ] 9.4 Verify utility types eliminate runtime checks where applied
- [ ] 9.5 Verify code is more readable and maintainable
