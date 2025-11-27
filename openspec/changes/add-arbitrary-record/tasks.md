## 1. Implementation

- [x] 1.1 Create `src/arbitraries/ArbitraryRecord.ts` with `ArbitraryRecord<S>` class
- [x] 1.2 Implement `size()` method (product of all property arbitrary sizes)
- [x] 1.3 Implement `pick(generator)` method to generate objects
- [x] 1.4 Implement `canGenerate(pick)` method
- [x] 1.5 Implement `shrink(initial)` method (shrink one property at a time)
- [x] 1.6 Implement `cornerCases()` method (combinations of property corner cases)
- [x] 1.7 Add `ArbitraryRecord` export to `src/arbitraries/internal.ts`

## 2. Factory Function

- [x] 2.1 Add `record<S>(schema)` factory function to `src/arbitraries/index.ts`
- [x] 2.2 Return `NoArbitrary` if any property arbitrary is `NoArbitrary`
- [x] 2.3 Ensure proper type inference from schema to output type

## 3. Testing

- [x] 3.1 Create `test/record.test.ts`
- [x] 3.2 Test basic record generation with primitive arbitraries
- [x] 3.3 Test nested records
- [x] 3.4 Test empty schema returns empty object
- [x] 3.5 Test shrinking behavior
- [x] 3.6 Test corner cases generation
- [x] 3.7 Test type inference (compile-time check)

## 4. Validation

- [x] 4.1 Run `npm test` to verify all tests pass
- [x] 4.2 Run `npm run lint` to verify code style
- [x] 4.3 Run `openspec validate add-arbitrary-record --strict`
