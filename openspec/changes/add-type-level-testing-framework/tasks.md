## 1. Infrastructure

- [ ] 1.1 Create `tsconfig.types.json` extending main tsconfig for type-level tests
- [ ] 1.2 Add `test:types` script to `package.json`

## 2. Shared Utilities

- [ ] 2.1 Create `test/types/test-utils.types.ts` with shared type assertion utilities
- [ ] 2.2 Export `Expect`, `Equal`, `Extends`, `HasProperty`, and `NotEqual` utilities

## 3. Refactor Existing Tests

- [ ] 3.1 Refactor `const-type-params.types.ts` to use shared utilities
- [ ] 3.2 Refactor `discriminated-unions.types.ts` to use shared utilities
- [ ] 3.3 Refactor `fluentresult.types.ts` to use shared utilities
- [ ] 3.4 Refactor `noinfer.types.ts` to use shared utilities
- [ ] 3.5 Refactor `prop-shorthand.types.ts` to use shared utilities

## 4. Validation

- [ ] 4.1 Fix any failing type tests
- [ ] 4.2 Run `npm run test:types` and verify all tests pass
- [ ] 4.3 Run `npm run lint` and verify no lint errors
