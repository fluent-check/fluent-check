## 1. Code Analysis and Cataloging

- [ ] 1.1 Search for functions with repeated validation checks
- [ ] 1.2 Search for bounds validation that happens multiple times
- [ ] 1.3 Identify validation that can be moved to function start
- [ ] 1.4 Identify validation that can be moved to construction
- [ ] 1.5 Catalog all locations where validate-once pattern can be applied

## 2. Apply Early Validation Pattern

- [ ] 2.1 Update `ArbitraryComposite.pick()` to validate at start
- [ ] 2.2 Update `ArbitrarySet.pick()` to validate bounds once
- [ ] 2.3 Apply early validation to other functions with repeated checks
- [ ] 2.4 Use non-null assertions after validation
- [ ] 2.5 Verify type safety
- [ ] 2.6 Run tests to ensure no regressions

## 3. Apply Construction-Time Validation

- [ ] 3.1 Identify classes that can validate at construction
- [ ] 3.2 Move validation to constructors
- [ ] 3.3 Store validated state
- [ ] 3.4 Use non-null assertions in methods after construction validation
- [ ] 3.5 Verify type safety
- [ ] 3.6 Run tests to ensure no regressions

## 4. Replace Repeated Checks with Assertions

- [ ] 4.1 Identify redundant undefined checks after validation
- [ ] 4.2 Replace with non-null assertions where validation is clear
- [ ] 4.3 Add comments explaining validation when needed
- [ ] 4.4 Verify type safety
- [ ] 4.5 Run tests to ensure no regressions

## 5. Documentation

- [ ] 5.1 Update `docs/patterns/strict-mode-patterns.md` with validate-once examples
- [ ] 5.2 Add examples showing before/after with validate-once pattern
- [ ] 5.3 Document when non-null assertions are acceptable
- [ ] 5.4 Add examples to `docs/patterns/strict-mode-refactoring-examples.md`

## 6. ESLint Configuration Review

- [ ] 6.1 Review `eslint.config.js` for `@typescript-eslint/no-non-null-assertion` rule
- [ ] 6.2 Document pattern for using `!` after validation
- [ ] 6.3 Add ESLint disable comments where appropriate
- [ ] 6.4 Ensure no new linting issues introduced

## 7. Verification

- [ ] 7.1 Run TypeScript compiler to ensure no type errors
- [ ] 7.2 Run linter to ensure no new issues
- [ ] 7.3 Run full test suite to ensure no regressions
- [ ] 7.4 Verify validation happens once where applied
- [ ] 7.5 Verify code is more readable and maintainable
