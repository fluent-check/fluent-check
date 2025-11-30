## 1. Specification
- [x] 1.1 Define the arbitrary-laws spec with all law requirements
- [x] 1.2 Review and validate spec scenarios cover all edge cases

## 2. Core Laws Implementation
- [x] 2.1 Create `src/arbitraries/laws.ts` with law type definitions
- [x] 2.2 Implement `sampleValidity` law (all samples pass canGenerate)
- [x] 2.3 Implement `sampleSizeBound` law (sample length respects requested size)
- [x] 2.4 Implement `uniqueSampleUniqueness` law (sampleUnique returns distinct values)
- [x] 2.5 Implement `cornerCaseInclusion` law (sampleWithBias includes corner cases)
- [x] 2.6 Implement `shrinkProducesValidArbitrary` law
- [x] 2.7 Implement `shrinkTermination` law (shrinking converges to NoArbitrary)
- [x] 2.8 Implement `filterRespectsPredicate` law
- [x] 2.9 Implement `noArbitraryComposition` laws (map and filter identity)

## 3. Test Infrastructure
- [x] 3.1 Create `test/arbitrary-laws.test.ts` test file
- [x] 3.2 Create arbitrary registry for systematic testing
- [x] 3.3 Add helper for running all laws against an arbitrary (`arbitraryLaws.check`)
- [x] 3.4 Add descriptive failure messages with law identification

## 4. Law Verification
- [x] 4.1 Verify laws pass for `integer` arbitrary
- [x] 4.2 Verify laws pass for `real` arbitrary
- [x] 4.3 Verify laws pass for `boolean` arbitrary
- [x] 4.4 Verify laws pass for `string` arbitrary
- [x] 4.5 Verify laws pass for `array` arbitrary
- [x] 4.6 Verify laws pass for `set` arbitrary
- [x] 4.7 Verify laws pass for `tuple` arbitrary
- [x] 4.8 Verify laws pass for `oneof` arbitrary
- [x] 4.9 Verify laws pass for `union` arbitrary
- [x] 4.10 Verify laws pass for `constant` arbitrary
- [x] 4.11 Verify laws pass for `record` arbitrary
- [x] 4.12 Verify laws pass for filtered arbitraries
- [x] 4.13 Verify laws pass for mapped arbitraries
- [x] 4.14 Verify laws pass for chained arbitraries
- [x] 4.15 Verify NoArbitrary satisfies applicable laws

## 5. Refactoring
- [x] 5.1 Identify duplicated tests in existing test files (noted but not removed - laws complement existing tests)
- [x] 5.2 Laws provide systematic coverage; existing tests remain for specific behaviors
- [x] 5.3 Existing tests kept for backwards compatibility and specific edge cases

## 6. Documentation & Export
- [x] 6.1 Export laws from `src/arbitraries/index.ts`
- [x] 6.2 Add JSDoc documentation to all law functions
- [x] 6.3 Design.md updated with hybrid approach decision

## 7. Validation
- [x] 7.1 Run full test suite (488 tests passing)
- [x] 7.2 Run `openspec validate add-arbitrary-laws --strict`
