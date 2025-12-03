## 1. Code Analysis and Cataloging

- [ ] 1.1 Search for `if (x === undefined) { return default }` patterns
- [ ] 1.2 Search for `if (x === undefined) { x = default }` patterns
- [ ] 1.3 Identify default value patterns that can use `??`
- [ ] 1.4 Identify assignment defaults that can use `??=`
- [ ] 1.5 Catalog all locations where nullish coalescing can replace explicit checks

## 2. Apply Nullish Coalescing for Defaults

- [ ] 2.1 Update `string.ts` to use `??` for defaults
- [ ] 2.2 Update `regex.ts` range parts to use `??` for defaults
- [ ] 2.3 Apply `??` to other default value patterns
- [ ] 2.4 Verify type safety
- [ ] 2.5 Run tests to ensure no regressions

## 3. Apply Nullish Coalescing Assignment

- [ ] 3.1 Identify assignment defaults that can use `??=`
- [ ] 3.2 Replace `if (x === undefined) { x = default }` with `x ??= default`
- [ ] 3.3 Verify type safety
- [ ] 3.4 Run tests to ensure no regressions

## 4. Documentation

- [ ] 4.1 Update `docs/patterns/strict-mode-patterns.md` with nullish coalescing examples
- [ ] 4.2 Add examples showing before/after with `??` and `??=`
- [ ] 4.3 Document when to use `??` vs `||`
- [ ] 4.4 Add examples to `docs/patterns/strict-mode-refactoring-examples.md`

## 5. ESLint Configuration Review

- [ ] 5.1 Verify `@typescript-eslint/prefer-nullish-coalescing` is enabled
- [ ] 5.2 Review ESLint output for `||` that should be `??`
- [ ] 5.3 Fix any ESLint warnings about nullish coalescing
- [ ] 5.4 Ensure no new linting issues introduced

## 6. Verification

- [ ] 6.1 Run TypeScript compiler to ensure no type errors
- [ ] 6.2 Run linter to ensure no new issues
- [ ] 6.3 Run full test suite to ensure no regressions
- [ ] 6.4 Verify code is more concise and readable
