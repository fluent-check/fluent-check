## 1. Array.at() Adoption

- [ ] 1.1 Search for `array[array.length - 1]` patterns in codebase
- [ ] 1.2 Replace with `array.at(-1)` where appropriate
- [ ] 1.3 Review `src/arbitraries/ArbitraryComposite.ts` for array access patterns

## 2. Object.hasOwn() Adoption

- [ ] 2.1 Search for `.hasOwnProperty()` calls in codebase
- [ ] 2.2 Replace with `Object.hasOwn()` calls
- [ ] 2.3 Review `src/FluentCheck.ts` for property check patterns

## 3. Error Cause Support

- [ ] 3.1 Review error throwing patterns in `src/strategies/FluentStrategy.ts`
- [ ] 3.2 Add `cause` option to thrown errors where appropriate
- [ ] 3.3 Review other files for error chaining opportunities

## 4. Verification

- [ ] 4.1 Run full test suite to ensure no regressions
- [ ] 4.2 Verify ES2022 target in tsconfig.json
