## 1. Implementation

- [ ] 1.1 Identify all `private` fields and methods in `src/FluentCheck.ts`
- [ ] 1.2 Convert `private runPreliminaries` to `#runPreliminaries`
- [ ] 1.3 Convert other private methods in FluentCheck subclasses
- [ ] 1.4 Review `src/arbitraries/*.ts` for private fields to convert
- [ ] 1.5 Review `src/strategies/*.ts` for private fields to convert
- [ ] 1.6 Update all internal references from `this.field` to `this.#field`
- [ ] 1.7 Keep `private` for protected-like visibility where subclass access is needed
- [ ] 1.8 Run full test suite to ensure no regressions
- [ ] 1.9 Verify ES2022 target in tsconfig.json supports private fields
