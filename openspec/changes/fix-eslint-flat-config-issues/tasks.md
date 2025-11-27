# Tasks: Fix ESLint Flat Config Issues

## 1. Configuration Fixes

- [x] 1.1 Create `tsconfig.eslint.json` extending `tsconfig.json` with `include: ["src/**/*", "test/**/*"]`
- [x] 1.2 Update `eslint.config.js` to use `project: './tsconfig.eslint.json'` instead of `allowDefaultProject`
- [x] 1.3 Verify ESLint can now parse all 14 test files without "default project" errors

## 2. Auto-fix Application

- [x] 2.1 Run `npm run lint -- --fix` to apply 162 auto-fixable changes
- [x] 2.2 Review auto-fixed changes for correctness

## 3. Test File Fixes

- [x] 3.1 Disable `@typescript-eslint/no-unused-expressions` for test files in `eslint.config.js`

## 4. Source Code Fixes

- [x] 4.1 Fix `@typescript-eslint/strict-boolean-expressions` errors with explicit comparisons
- [x] 4.2 Fix `prefer-const` errors (change `let` to `const` where appropriate)
- [x] 4.3 Fix `no-case-declarations` errors (wrap case blocks in braces)
- [x] 4.4 Remove or rename unused variables (prefix with `_`)

## 5. Cleanup

- [x] 5.1 Delete spurious `src/notebook5.ts` file

## 6. Validation

- [x] 6.1 Run `npm run lint` and verify zero errors
- [x] 6.2 Run `npm test` to ensure no regressions

## 7. Archive

- [ ] 7.1 Archive `migrate-eslint-flat-config` change with `openspec archive migrate-eslint-flat-config --yes`
