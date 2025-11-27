# Change: Migrate ESLint to Flat Config Format

> **GitHub Issue:** [#393](https://github.com/fluent-check/fluent-check/issues/393)

## Why

ESLint v9.x (currently v9.39.1) dropped support for the legacy `.eslintrc` configuration format. The project still uses `.eslintrc`, causing `npm run lint` to fail with:

```
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
From ESLint v9.0.0, the default configuration file is now eslint.config.js.
```

Linting is a critical development workflow that is currently broken.

## What Changes

- Replace `.eslintrc` (legacy JSON format) with `eslint.config.js` (flat config format)
- Update ESLint configuration to use `typescript-eslint` flat config APIs
- Simplify the lint script in `package.json` (flat config auto-discovery)
- Remove deprecated `--ext` flag from lint command
- Preserve all existing rules and behavior

## Impact

- **Affected specs**: None (tooling-only change)
- **Affected code**: `.eslintrc` → `eslint.config.js`, `package.json` scripts
- **Risk**: Low - straightforward migration with existing tooling support
- **Backwards compatibility**: No breaking changes to library consumers

## Technical Notes

### Current Configuration (`.eslintrc`)
- Parser: `@typescript-eslint/parser` v8.48.0
- Plugin: `@typescript-eslint/eslint-plugin` v8.48.0
- Extends: `eslint:recommended`, `plugin:@typescript-eslint/recommended`
- Environment: ES2020, Node.js
- Project: `./tsconfig.json` for type-aware linting

### Migration Strategy
1. Use the `typescript-eslint` flat config helper (`tseslint.config()`)
2. Migrate all custom rules to the new format
3. Use ESLint's built-in globals for environment configuration
4. Verify identical linting behavior before and after migration
