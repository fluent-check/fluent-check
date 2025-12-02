## 1. Code Analysis and Cataloging

- [ ] 1.1 Search for validation patterns that use manual `if` checks
- [ ] 1.2 Search for bounds checking patterns (array indices, object keys)
- [ ] 1.3 Search for schema/record validation patterns
- [ ] 1.4 Identify validation logic that could be extracted into assertion functions
- [ ] 1.5 Catalog all locations where assertion functions can replace manual checks

## 2. Create Assertion Function Helpers

- [ ] 2.1 Create `src/util/assertions.ts` (or appropriate location)
- [ ] 2.2 Implement `assertDefined<T>(value, message)` assertion function
- [ ] 2.3 Implement `assertInBounds(index, length)` for array bounds
- [ ] 2.4 Implement `assertSchemaValid<T>(schema, keys)` for record validation
- [ ] 2.5 Document assertion functions with JSDoc comments
- [ ] 2.6 Export assertion functions for use across codebase

## 3. Apply Assertion Functions to Bounds Validation

- [ ] 3.1 Update `ArbitraryComposite.pick()` to use bounds assertion
- [ ] 3.2 Update `ArbitraryTuple.canGenerate()` to use bounds assertion
- [ ] 3.3 Apply bounds assertions to other array access patterns
- [ ] 3.4 Verify type narrowing works correctly
- [ ] 3.5 Run tests to ensure no regressions

## 4. Apply Assertion Functions to Schema Validation

- [ ] 4.1 Update `ArbitraryRecord` constructor to use schema assertion
- [ ] 4.2 Apply schema assertions to other record validation patterns
- [ ] 4.3 Verify type narrowing works correctly
- [ ] 4.4 Run tests to ensure no regressions

## 5. Apply Assertion Functions to Existence Validation

- [ ] 5.1 Replace manual `if (x === undefined)` checks with `assertDefined`
- [ ] 5.2 Apply to constructors and initialization code
- [ ] 5.3 Verify type narrowing works correctly
- [ ] 5.4 Run tests to ensure no regressions

## 6. Documentation

- [ ] 6.1 Update `docs/patterns/strict-mode-patterns.md` with assertion function examples
- [ ] 6.2 Add examples showing before/after with assertion functions
- [ ] 6.3 Document when to use assertion functions vs utility types
- [ ] 6.4 Add examples to `docs/patterns/strict-mode-refactoring-examples.md`

## 7. ESLint Configuration Review

- [ ] 7.1 Review `eslint.config.js` for rules that interact with assertion functions
- [ ] 7.2 Verify assertion functions work with existing type-checking rules
- [ ] 7.3 Document preference for assertion functions over non-null assertions
- [ ] 7.4 Ensure no new linting issues introduced

## 8. Verification

- [ ] 8.1 Run TypeScript compiler to ensure no type errors
- [ ] 8.2 Run linter to ensure no new issues
- [ ] 8.3 Run full test suite to ensure no regressions
- [ ] 8.4 Verify assertion functions provide clear error messages
- [ ] 8.5 Verify code is more readable and maintainable
