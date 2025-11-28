## 1. Specification
- [ ] 1.1 Define the arbitrary-laws spec with all law requirements
- [ ] 1.2 Review and validate spec scenarios cover all edge cases

## 2. Core Laws Implementation
- [ ] 2.1 Create `src/arbitraries/laws.ts` with law type definitions
- [ ] 2.2 Implement `sampleValidity` law (all samples pass canGenerate)
- [ ] 2.3 Implement `sampleSizeBound` law (sample length respects size)
- [ ] 2.4 Implement `uniqueSampleUniqueness` law (sampleUnique returns distinct values)
- [ ] 2.5 Implement `cornerCaseInclusion` law (sampleWithBias includes corner cases)
- [ ] 2.6 Implement `shrinkProducesSmallerValues` law
- [ ] 2.7 Implement `shrinkTermination` law (shrinking converges to NoArbitrary)
- [ ] 2.8 Implement `filterRespectsPredicate` law
- [ ] 2.9 Implement `noArbitraryComposition` law

## 3. Test Infrastructure
- [ ] 3.1 Create `test/arbitrary-laws.test.ts` test file
- [ ] 3.2 Create arbitrary-of-arbitraries for meta-testing
- [ ] 3.3 Add helper for running all laws against an arbitrary
- [ ] 3.4 Add descriptive failure messages with arbitrary identification

## 4. Law Verification
- [ ] 4.1 Verify laws pass for `integer` arbitrary
- [ ] 4.2 Verify laws pass for `real` arbitrary
- [ ] 4.3 Verify laws pass for `boolean` arbitrary
- [ ] 4.4 Verify laws pass for `string` arbitrary
- [ ] 4.5 Verify laws pass for `array` arbitrary
- [ ] 4.6 Verify laws pass for `set` arbitrary
- [ ] 4.7 Verify laws pass for `tuple` arbitrary
- [ ] 4.8 Verify laws pass for `oneof` arbitrary
- [ ] 4.9 Verify laws pass for `union` arbitrary
- [ ] 4.10 Verify laws pass for `constant` arbitrary
- [ ] 4.11 Verify laws pass for `record` arbitrary
- [ ] 4.12 Verify laws pass for filtered arbitraries
- [ ] 4.13 Verify laws pass for mapped arbitraries
- [ ] 4.14 Verify laws pass for chained arbitraries
- [ ] 4.15 Verify NoArbitrary satisfies applicable laws

## 5. Refactoring
- [ ] 5.1 Identify duplicated tests in existing test files
- [ ] 5.2 Refactor `test/arbitrary.test.ts` to use laws where applicable
- [ ] 5.3 Remove redundant test cases covered by laws

## 6. Documentation & Export
- [ ] 6.1 Export laws from `src/arbitraries/index.ts`
- [ ] 6.2 Add JSDoc documentation to all law functions
- [ ] 6.3 Update README or docs with law descriptions

## 7. Validation
- [ ] 7.1 Run full test suite
- [ ] 7.2 Run `openspec validate add-arbitrary-laws --strict`
