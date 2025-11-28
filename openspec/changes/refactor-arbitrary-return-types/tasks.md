## 1. Type Definitions

- [ ] 1.1 Add `ExactSizeArbitrary<A>` interface to `types.ts` (with `size()`, `map()`, `filter()`, `suchThat()` signatures)
- [ ] 1.2 Add `EstimatedSizeArbitrary<A>` interface to `types.ts` (with `size()`, `map()`, `filter()`, `suchThat()` signatures)
- [ ] 1.3 Export new interfaces from `index.ts`
- [ ] 1.4 Update `NoArbitrary` type declaration to `ExactSizeArbitrary<never>` (already returns `ExactSize` at runtime)

## 2. Base Class Updates

- [ ] 2.1 Update `Arbitrary.filter()` return type to `EstimatedSizeArbitrary<A>`
- [ ] 2.2 Update `Arbitrary.suchThat()` return type to `EstimatedSizeArbitrary<A>`

Note: `map()` return types are defined in the interface signatures (1.1, 1.2), not on the base class. The base class `map()` returns `Arbitrary<B>` which is the fallback when the specific interface isn't in scope.

## 3. Factory Return Types

- [ ] 3.1 Update `integer()` to return `ExactSizeArbitrary<number>`
- [ ] 3.2 Update `real()` to return `ExactSizeArbitrary<number>`
- [ ] 3.3 Update `nat()` to return `ExactSizeArbitrary<number>`
- [ ] 3.4 Update `boolean()` to return `ExactSizeArbitrary<boolean>`
- [ ] 3.5 Update `constant()` to return `ExactSizeArbitrary<A>`
- [ ] 3.6 Update `array()` to return `ExactSizeArbitrary<A[]>`
- [ ] 3.7 Update `set()` to return `ExactSizeArbitrary<A[number][]>`
- [ ] 3.8 Update `char()`, `ascii()`, `hex()`, `base64()`, `unicode()` return types
- [ ] 3.9 Update `string()` return type
- [ ] 3.10 Update `oneof()` to return `ExactSizeArbitrary<A[number]>` (uses `integer().map()`)

## 4. Preset Factory Return Types

- [ ] 4.1 Update `positiveInt()`, `negativeInt()`, `nonZeroInt()`, `byte()` return types
- [ ] 4.2 Update `nonEmptyString()` return type
- [ ] 4.3 Update `nonEmptyArray()`, `pair()` return types
- [ ] 4.4 Update `nullable()`, `optional()` return types

## 5. Type Tests

- [ ] 5.1 Update `discriminated-unions.types.ts` to test specific return types
- [ ] 5.2 Add tests verifying `filter()` returns `EstimatedSizeArbitrary`
- [ ] 5.3 Add tests verifying `map()` preserves size type (ExactSize → ExactSize, EstimatedSize → EstimatedSize)
- [ ] 5.4 Add tests verifying `oneof()` returns `ExactSizeArbitrary`
- [ ] 5.5 Add tests verifying `NoArbitrary` is assignable to `ExactSizeArbitrary<never>`
- [ ] 5.6 Add tests verifying chained transformations: `integer().map().filter().map()` type flow
- [ ] 5.7 Run `npm run test:types` and verify all tests pass

## 6. Validation

- [ ] 6.1 Run `npm test` to verify no runtime regressions
- [ ] 6.2 Run `npm run lint` to verify no lint errors
