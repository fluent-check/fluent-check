## 1. Code Analysis and Cataloging

- [ ] 1.1 Search for functions with validation after computation
- [ ] 1.2 Search for nested validation patterns
- [ ] 1.3 Identify preconditions that can be checked early
- [ ] 1.4 Identify validation that happens mid-function
- [ ] 1.5 Catalog all locations where early validation can be applied

## 2. Apply Early Validation Pattern

- [ ] 2.1 Update `ArbitraryComposite.pick()` to validate at start
- [ ] 2.2 Move validation to start of other functions
- [ ] 2.3 Use assertion functions for early validation where appropriate
- [ ] 2.4 Verify error messages are clear and early
- [ ] 2.5 Verify type safety
- [ ] 2.6 Run tests to ensure no regressions

## 3. Documentation

- [ ] 3.1 Update `docs/patterns/strict-mode-patterns.md` with early validation examples
- [ ] 3.2 Add examples showing before/after with early validation
- [ ] 3.3 Document fail-fast principle
- [ ] 3.4 Add examples to `docs/patterns/strict-mode-refactoring-examples.md`

## 4. ESLint Configuration Review

- [ ] 4.1 Review `eslint.config.js` for validation-related rules
- [ ] 4.2 Document early validation pattern
- [ ] 4.3 Ensure no new linting issues introduced

## 5. Verification

- [ ] 5.1 Run TypeScript compiler to ensure no type errors
- [ ] 5.2 Run linter to ensure no new issues
- [ ] 5.3 Run full test suite to ensure no regressions
- [ ] 5.4 Verify validation happens early where applied
- [ ] 5.5 Verify code flow is clearer
