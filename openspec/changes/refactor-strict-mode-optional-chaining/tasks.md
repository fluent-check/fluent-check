## 1. Code Analysis and Cataloging

- [ ] 1.1 Search for nested `if` checks for optional property access
- [ ] 1.2 Search for `&&` chains that can use `?.`
- [ ] 1.3 Identify optional property access patterns
- [ ] 1.4 Identify optional method call patterns
- [ ] 1.5 Catalog all locations where optional chaining can replace nested checks

## 2. Apply Optional Chaining

- [ ] 2.1 Update `regex.ts` to use `?.` for optional access
- [ ] 2.2 Apply `?.` to other nested optional access patterns
- [ ] 2.3 Combine `?.` with `??` for defaults where appropriate
- [ ] 2.4 Verify type safety
- [ ] 2.5 Run tests to ensure no regressions

## 3. Documentation

- [ ] 3.1 Update `docs/patterns/strict-mode-patterns.md` with optional chaining examples
- [ ] 3.2 Add examples showing before/after with `?.`
- [ ] 3.3 Document when to use `?.` vs `&&` chains
- [ ] 3.4 Add examples to `docs/patterns/strict-mode-refactoring-examples.md`

## 4. ESLint Configuration Review

- [ ] 4.1 Verify `@typescript-eslint/prefer-optional-chain` is enabled
- [ ] 4.2 Review ESLint output for `&&` chains that should be `?.`
- [ ] 4.3 Fix any ESLint warnings about optional chaining
- [ ] 4.4 Ensure no new linting issues introduced

## 5. Verification

- [ ] 5.1 Run TypeScript compiler to ensure no type errors
- [ ] 5.2 Run linter to ensure no new issues
- [ ] 5.3 Run full test suite to ensure no regressions
- [ ] 5.4 Verify code is more concise and readable
