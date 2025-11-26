# Tasks: Modernize to Node.js 24 LTS and ES2025

## 1. Infrastructure Updates

- [x] 1.1 Update `package.json`:
  - Add `"engines": { "node": ">=22" }`
- [x] 1.2 Update `tsconfig.json`:
  - Change `"target": "ES2022"` to `"target": "ES2024"`
- [x] 1.3 Update `.github/workflows/node.js.yml`:
  - Change `node-version: [18.x, 20.x]` to `node-version: [22.x, 24.x]`
- [x] 1.4 Update `README.md`:
  - Document Node.js ≥22 requirement

## 2. Array.at() Adoption (ES2022)

- [x] 2.1 Update `src/arbitraries/ArbitraryComposite.ts`:
  - Line 20: Replace `acc[acc.length - 1]` with `(acc.at(-1) ?? 0)`
  - Line 23: Replace `weights[weights.length - 1]` with `weights.at(-1)!`
- [x] 2.2 Verify behavior with empty array edge cases

## 3. Array.prototype.toSorted() Adoption (ES2023)

- [x] 3.1 Update `src/arbitraries/ArbitrarySet.ts`:
  - Line 30: Replace `Array.from(pick).sort()` with `Array.from(pick).toSorted()`
- [x] 3.2 Update `src/arbitraries/ArbitraryInteger.ts`:
  - Lines 22-24: Replace `.sort((a,b) => ...)` with `.toSorted((a,b) => ...)`
- [x] 3.3 Verify sorting produces identical results

## 4. Error Cause Support (ES2022)

- [x] 4.1 Update `src/strategies/FluentStrategy.ts`:
  - Line 89: Add cause `'FluentStrategy.hasInput is abstract'`
  - Line 96: Add cause `'FluentStrategy.getInput is abstract'`
  - Line 105: Add cause `'FluentStrategy.handleResult is abstract'`
- [x] 4.2 Update `src/strategies/FluentStrategyMixins.ts`:
  - Line 36: Add cause `'Mixin method requires implementation'`
  - Line 40: Add cause `'Mixin method requires implementation'`
- [x] 4.3 Update `src/arbitraries/regex.ts`:
  - Line 142: Add cause with pattern position context

## 5. Future Features Assessment (ES2024/ES2025)

- [x] 5.1 Review codebase for `Object.groupBy()` opportunities
- [x] 5.2 Review `ArbitrarySet.ts` for potential Set method adoption
- [x] 5.3 Review `regex.ts` for RegExp `/v` flag opportunities
- [x] 5.4 Document findings for future proposal

## 6. Verification

- [x] 6.1 Install Node.js 24 locally for testing
- [x] 6.2 Run `npm run lint` - ensure no linting errors (Note: ESLint 9 config issue pre-existing)
- [x] 6.3 Run `npm test` - ensure all tests pass on Node.js 22 and 24 (125/125 passing)
- [x] 6.4 Run `npm run prepare` - ensure clean TypeScript compilation
- [x] 6.5 Verify error causes appear correctly in stack traces
- [x] 6.6 Test in CI with new matrix [22.x, 24.x]

## 7. Documentation

- [x] 7.1 Update CONTRIBUTING.md if it mentions Node.js version requirements (not needed)
- [x] 7.2 Add CHANGELOG entry for breaking change (Node.js ≥22 required)

## Notes

### Breaking Change Notice
This is a **breaking change** that drops support for Node.js 18 and 20. Users must upgrade to Node.js 22+. Node.js 18 reaches end-of-life in April 2025.

### TypeScript Target
- ES2024 is the highest stable target in TypeScript 5.x
- ES2025 target may be available in TypeScript 5.7+
- Using ES2024 provides access to most modern features

### Array.at() Null Safety
`Array.at(-1)` returns `T | undefined`. Use:
- `arr.at(-1) ?? defaultValue` when a fallback is appropriate
- `arr.at(-1)!` when array is guaranteed non-empty (use sparingly)

### toSorted() vs sort()
- `toSorted()` returns a new array (immutable)
- `sort()` mutates in place and returns the same array
- Semantically equivalent when original array isn't reused
