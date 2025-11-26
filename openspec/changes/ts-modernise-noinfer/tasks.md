## 1. Investigation

- [ ] 1.1 Review `given()` method signature in `src/FluentCheck.ts`
- [ ] 1.2 Identify cases where inference comes from unintended positions
- [ ] 1.3 Document current inference behavior with examples
- [ ] 1.4 Evaluate impact of `NoInfer<T>` on developer experience

## 2. Implementation

- [ ] 2.1 Apply `NoInfer<T>` to `given()` method if beneficial
- [ ] 2.2 Review factory functions in `src/arbitraries/index.ts`
- [ ] 2.3 Apply `NoInfer<T>` to other identified candidates
- [ ] 2.4 Run full test suite to ensure no regressions
- [ ] 2.5 Verify TypeScript version supports `NoInfer<T>` (requires TS 5.4+)
