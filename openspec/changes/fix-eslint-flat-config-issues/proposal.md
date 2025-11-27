# Change: Fix ESLint Flat Config Issues from PR #394

> **Related Change:** `migrate-eslint-flat-config` (PR #394)

## Why

After PR #394 migrated to ESLint flat config, running `npm run lint` produces 266 problems (86 errors, 180 warnings). The main issues are:

1. **Test file parsing fails**: The `allowDefaultProject: ['test/*.ts']` configuration has a default limit of 8 files, but there are 14 test files, causing "Too many files (>8) have matched the default project" errors on 6 test files.

2. **Auto-fixable warnings**: 162 warnings are auto-fixable (trailing spaces, semicolons, object-curly-spacing, eol-last).

3. **Code issues**: Actual code problems detected by stricter rules need manual fixes:
   - `@typescript-eslint/strict-boolean-expressions` errors
   - `@typescript-eslint/no-unused-expressions` in test files (Chai assertions)
   - `prefer-const`, `no-case-declarations` errors
   - Unused variables

Linting must pass for CI to succeed and for the codebase to maintain quality standards.

## What Changes

### Configuration Fixes
- Create `tsconfig.eslint.json` that extends `tsconfig.json` and includes test files
- Update `eslint.config.js` to use `project: './tsconfig.eslint.json'` instead of `allowDefaultProject`
- Remove the problematic `allowDefaultProject` configuration

### Auto-fix Application
- Run `eslint --fix` to resolve 162 auto-fixable warnings

### Code Fixes (Manual)
- Disable `@typescript-eslint/no-unused-expressions` for test files (Chai assertions are valid expressions)
- Fix `@typescript-eslint/strict-boolean-expressions` errors with explicit comparisons
- Fix `prefer-const` and `no-case-declarations` errors
- Remove or prefix unused variables
- Delete spurious `src/notebook5.ts` file

### Post-Fix
- Archive `migrate-eslint-flat-config` change (combining original migration + this fix)

## Impact

- **Affected specs**: None (tooling-only change)
- **Affected code**: 
  - `eslint.config.js` - configuration update
  - `tsconfig.eslint.json` - new file
  - `src/**/*.ts` - auto-fixes and manual code fixes
  - `test/**/*.ts` - auto-fixes and manual code fixes
- **Risk**: Low - primarily formatting fixes and explicit code improvements
- **Backwards compatibility**: No breaking changes to library consumers
