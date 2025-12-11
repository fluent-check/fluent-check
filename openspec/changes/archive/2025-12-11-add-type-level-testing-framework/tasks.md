## 1. Infrastructure

- [x] 1.1 Create `tsconfig.types.json` extending main tsconfig for type-level tests
- [x] 1.2 Add `test:types` script to `package.json`

## 2. Shared Utilities

- [x] 2.1 Create `test/types/test-utils.types.ts` with shared type assertion utilities
- [x] 2.2 Export `Expect`, `Equal`, `Extends`, `HasProperty`, and `NotEqual` utilities

## 3. Refactor Existing Tests

- [x] 3.1 Refactor `const-type-params.types.ts` to use shared utilities
- [x] 3.2 Refactor `discriminated-unions.types.ts` to use shared utilities
- [x] 3.3 Refactor `fluentresult.types.ts` to use shared utilities
- [x] 3.4 Refactor `noinfer.types.ts` to use shared utilities
- [x] 3.5 Refactor `prop-shorthand.types.ts` to use shared utilities

## 4. Validation

- [x] 4.1 Fix any failing type tests
- [x] 4.2 Run `npm run test:types` and verify all tests pass
- [x] 4.3 Run `npm run lint` and verify no lint errors
