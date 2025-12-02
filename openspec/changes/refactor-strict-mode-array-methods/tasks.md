## 1. Code Analysis and Cataloging

- [ ] 1.1 Search for `for...in` loops with array index access
- [ ] 1.2 Search for manual array iteration with undefined checks
- [ ] 1.3 Identify loops that can use `every()`, `some()`, `filter()`
- [ ] 1.4 Identify array access that can use `slice()` or `at()`
- [ ] 1.5 Catalog all locations where array methods can replace manual iteration

## 2. Refactor for...in Loops to Array Methods

- [ ] 2.1 Refactor `ArbitraryTuple.canGenerate()` to use `every()`
- [ ] 2.2 Refactor `Arbitrary.cornerCases()` to use `Object.entries()` or array methods
- [ ] 2.3 Refactor `FluentCheck` test case processing to use `Object.entries()`
- [ ] 2.4 Replace other `for...in` loops with appropriate array methods
- [ ] 2.5 Verify type safety with array methods
- [ ] 2.6 Run tests to ensure no regressions

## 3. Apply filter() with Type Guards

- [ ] 3.1 Identify filtering operations with manual undefined checks
- [ ] 3.2 Replace with `filter()` and type guards
- [ ] 3.3 Use `NonNullable<T>[]` return types where appropriate
- [ ] 3.4 Verify type narrowing works correctly
- [ ] 3.5 Run tests to ensure no regressions

## 4. Apply slice() for Bounds-Safe Access

- [ ] 4.1 Identify array access with manual bounds checking
- [ ] 4.2 Replace with `slice()` where appropriate
- [ ] 4.3 Verify `slice()` handles bounds correctly
- [ ] 4.4 Run tests to ensure no regressions

## 5. Apply at() with Nullish Coalescing

- [ ] 4.1 Identify array access that can use `at()`
- [ ] 4.2 Replace with `at()` and `??` for defaults
- [ ] 4.3 Verify type safety
- [ ] 4.4 Run tests to ensure no regressions

## 6. Documentation

- [ ] 6.1 Update `docs/patterns/strict-mode-patterns.md` with array method examples
- [ ] 6.2 Add examples showing before/after with array methods
- [ ] 6.3 Document when to use each array method
- [ ] 6.4 Add examples to `docs/patterns/strict-mode-refactoring-examples.md`

## 7. ESLint Configuration Review

- [ ] 7.1 Review `eslint.config.js` for array method preferences
- [ ] 7.2 Verify no new linting issues introduced
- [ ] 7.3 Document array method patterns

## 8. Verification

- [ ] 8.1 Run TypeScript compiler to ensure no type errors
- [ ] 8.2 Run linter to ensure no new issues
- [ ] 8.3 Run full test suite to ensure no regressions
- [ ] 8.4 Verify code is more readable and maintainable
- [ ] 8.5 Verify array methods handle undefined correctly
