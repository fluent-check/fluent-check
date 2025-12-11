# Change: Add Type-Level Testing Framework

> **GitHub Issue:** [#435](https://github.com/fluent-check/fluent-check/issues/435)

## Why

The project has type-level tests in `test/types/*.types.ts` that verify TypeScript type inference works correctly. These tests use `Expect<Equal<T, U>>` patterns to cause compile errors when types don't match. However:

1. **No execution target**: There is no `npm` script to run these tests; developers must manually run `npx tsc --noEmit`
2. **No proper TypeScript config**: The main `tsconfig.json` only includes `src/**/*`, so type tests aren't properly checked
3. **Duplicated utilities**: Each test file duplicates the same type assertion utilities (`Expect`, `Equal`, `Extends`, `HasProperty`)
4. **Silent failures**: Without CI integration, type regressions can go unnoticed

## What Changes

- Add shared type assertion utilities in `test/types/test-utils.types.ts` (DRY)
- Create `tsconfig.types.json` extending the main config for type-level test compilation
- Add `npm run test:types` script to `package.json`
- Refactor existing type test files to import shared utilities
- Fix any currently failing type tests

## Impact

- Affected specs: `tooling`
- Affected code: `test/types/*.types.ts`, `package.json`, new `tsconfig.types.json`
- No breaking changes
- No runtime impact (compile-time only)
