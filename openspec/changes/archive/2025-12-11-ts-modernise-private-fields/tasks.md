## 1. Implementation

- [x] 1.1 Identify all `private` fields and methods in `src/FluentCheck.ts`
- [x] 1.2 Convert `private runPreliminaries` to `#runPreliminaries`
- [x] 1.3 Convert other private methods in FluentCheck subclasses
- [x] 1.4 Review `src/arbitraries/*.ts` for private fields to convert
- [x] 1.5 Review `src/strategies/*.ts` for private fields to convert
- [x] 1.6 Update all internal references from `this.field` to `this.#field`
- [x] 1.7 Keep `private` for protected-like visibility where subclass access is needed
- [x] 1.8 Run full test suite to ensure no regressions
- [x] 1.9 Verify ES2022 target in tsconfig.json supports private fields
