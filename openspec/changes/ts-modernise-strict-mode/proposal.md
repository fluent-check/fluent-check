# Change: Enable Full TypeScript Strict Mode

## Why
The current `tsconfig.json` only enables partial strict checks (`strictNullChecks`, `strictFunctionTypes`, `strictPropertyInitialization`, `noImplicitThis`), missing several important type safety options. Enabling full strict mode catches more bugs at compile time and ensures code quality aligns with TypeScript best practices.

## What Changes
- Enable `strict: true` in `tsconfig.json` (replaces individual strict flags)
- Add `noUncheckedIndexedAccess: true` for safer array/object access
- Add `exactOptionalPropertyTypes: true` to distinguish `undefined` vs missing
- Add `noImplicitOverride: true` to require explicit `override` keyword
- Add `noPropertyAccessFromIndexSignature: true` to enforce bracket notation for index signatures
- Fix any new type errors surfaced by stricter checks

## Impact
- Affected specs: None (tooling change)
- Affected code: `tsconfig.json`, potentially any files with implicit `any` or unchecked index access
- Breaking: No runtime changes, but may require code fixes to satisfy stricter type checks
