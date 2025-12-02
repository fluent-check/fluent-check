## 1. Documentation

- [ ] 1.1 Create `docs/patterns/strict-mode-patterns.md` with general patterns guide emphasizing type-level solutions first
- [ ] 1.2 Create `docs/patterns/strict-mode-refactoring-examples.md` with concrete before/after examples showing type-level solutions
- [ ] 1.3 Document priority order: Type-level → Assertion functions → Runtime checks

## 2. Identify All Defensive Code Patterns

- [ ] 2.1 Search codebase for patterns: `if (.* === undefined)`, `if (.* !== undefined)`
- [ ] 2.2 Search for `for...in` loops with array index access
- [ ] 2.3 Search for array/object index access with subsequent undefined checks
- [ ] 2.4 Catalog all files and locations with defensive patterns
- [ ] 2.5 Categorize patterns by type (array iteration, record access, optional values, etc.)
- [ ] 2.6 Identify which patterns can be solved with type-level mechanisms vs runtime checks

- [ ] 2.1 Search codebase for patterns: `if (.* === undefined)`, `if (.* !== undefined)`
- [ ] 2.2 Search for `for...in` loops with array index access
- [ ] 2.3 Search for array/object index access with subsequent undefined checks
- [ ] 2.4 Catalog all files and locations with defensive patterns
- [ ] 2.5 Categorize patterns by type (array iteration, record access, optional values, etc.)

## 3. Apply Type-Level Utility Types Pattern (PRIORITY)

- [ ] 3.1 Identify function return types that can use `NonNullable<T>` to exclude undefined/null
- [ ] 3.2 Identify object types where `Required<T>` or `Required<Pick<T, K>>` can express validated structures
- [ ] 3.3 Use `Exclude<T, undefined>` for array element types after filtering
- [ ] 3.4 Use `Extract<T, U>` for discriminated union narrowing
- [ ] 3.5 Create custom utility types for common patterns (e.g., `Defined<T>`, `Validated<T>`)
- [ ] 3.6 Apply utility types to eliminate runtime checks where types can express the constraint
- [ ] 3.7 Verify tests pass after each refactoring

## 4. Apply Mapped Types Pattern (PRIORITY)

- [ ] 4.1 Identify record/schema types where validation makes all keys required
- [ ] 4.2 Use mapped types to transform `Record<K, T | undefined>` to `Record<K, T>` after validation
- [ ] 4.3 Create type-level transformations for validated data structures
- [ ] 4.4 Store validated structures with transformed types to eliminate runtime checks
- [ ] 4.5 Verify tests pass after each refactoring

## 5. Apply Assertion Functions Pattern (PRIORITY)

- [ ] 5.1 Identify validation functions that can use `asserts` keyword
- [ ] 5.2 Convert validation helpers to assertion functions for automatic type narrowing
- [ ] 5.3 Use assertion functions in constructors and initialization code
- [ ] 5.4 Verify tests pass after each refactoring

## 6. Apply Array Methods Pattern

- [ ] 3.1 Refactor `for...in` loops to use `every()`, `some()`, or `filter()` where appropriate
- [ ] 3.2 Replace manual array iteration with `slice()` for bounds-safe access
- [ ] 3.3 Use `at()` method with nullish coalescing for safe array access
- [ ] 3.4 Verify tests pass after each refactoring

## 7. Apply Validate-Once Pattern (When Runtime Validation Required)

- [ ] 7.1 Identify functions with repeated undefined checks that cannot use type-level solutions
- [ ] 7.2 Move validation to function start (early validation)
- [ ] 7.3 Replace repeated checks with non-null assertions after validation
- [ ] 7.4 Verify tests pass after each refactoring

## 8. Apply Nullish Coalescing Pattern

- [ ] 8.1 Identify optional values with default fallbacks
- [ ] 8.2 Replace `if (x === undefined) { return default }` with `x ?? default`
- [ ] 8.3 Replace `if (x === undefined) { x = default }` with `x ??= default`
- [ ] 8.4 Verify tests pass after each refactoring

## 9. Apply Known Data Structures Pattern (With Type-Level Transformation)

- [ ] 9.1 Identify classes/constructors with known key structures (e.g., schemas, configs)
- [ ] 9.2 Add validation at construction/initialization
- [ ] 9.3 Use type-level transformations (mapped types, `Required<T>`) to express validated state
- [ ] 9.4 Store validated structures with transformed types to eliminate runtime checks
- [ ] 9.5 Verify tests pass after each refactoring

## 10. Apply Type Guard Helpers Pattern (When Runtime Validation Required)

- [ ] 10.1 Identify repeated validation patterns that must happen at runtime
- [ ] 10.2 Create reusable assertion functions (prefer over type guards)
- [ ] 10.3 Replace repeated validation logic with assertion function calls
- [ ] 10.4 Verify tests pass after each refactoring

## 11. Apply Optional Chaining Pattern

- [ ] 11.1 Identify nested optional access patterns
- [ ] 11.2 Replace nested `if` checks with `?.` and `??` operators
- [ ] 11.3 Verify tests pass after each refactoring

## 12. Apply Direct Iteration Pattern

- [ ] 12.1 Replace `for...in` with `Number()` conversion with `for...of` or indexed loops
- [ ] 12.2 Use `entries()` for key-value iteration where appropriate
- [ ] 12.3 Verify tests pass after each refactoring

## 13. Code Review and Consistency

- [ ] 13.1 Review all refactored code for consistency with patterns
- [ ] 13.2 Ensure patterns are applied uniformly across similar code
- [ ] 13.3 Update any remaining defensive code to follow established patterns
- [ ] 13.4 Verify type-level patterns complement runtime patterns appropriately

## 14. Verification

- [ ] 14.1 Run TypeScript compiler to ensure no type errors
- [ ] 14.2 Run linter to ensure no new issues
- [ ] 14.3 Run full test suite to ensure no regressions
- [ ] 14.4 Verify code is more readable and maintainable
- [ ] 14.5 Verify patterns are documented and can be applied to future code
- [ ] 14.6 Verify type-level mechanisms reduce runtime checks where appropriate
