# Tasks: Migrate ESLint to Flat Config Format

## 1. Preparation

- [ ] 1.1 Install `@eslint/js` for built-in recommended config
- [ ] 1.2 Install `globals` package for environment definitions

## 2. Create New Configuration

- [ ] 2.1 Create `eslint.config.js` with flat config structure
- [ ] 2.2 Configure `typescript-eslint` parser and plugin using flat config API
- [ ] 2.3 Migrate all custom rules from `.eslintrc` preserving severity levels
- [ ] 2.4 Configure file patterns for `src/` and `test/` directories
- [ ] 2.5 Set up global variables for Node.js and ES2020+ environments

## 3. Update Project Files

- [ ] 3.1 Update `package.json` lint script (remove deprecated `--ext` flag)
- [ ] 3.2 Delete legacy `.eslintrc` file

## 4. Validation

- [ ] 4.1 Run `npm run lint` and verify it executes successfully
- [ ] 4.2 Verify linting catches the same issues as before
- [ ] 4.3 Run `npm test` to ensure no regressions
