## 1. Type Definitions

- [x] 1.1 Add `ExactSizeArbitrary<A>` interface to `types.ts`
- [x] 1.2 Add `EstimatedSizeArbitrary<A>` interface to `types.ts`
- [x] 1.3 Export new interfaces from `index.ts`

## 2. Base Class Updates

- [x] 2.1 Update `Arbitrary.filter()` return type to `EstimatedSizeArbitrary<A>`
- [x] 2.2 Update `Arbitrary.suchThat()` return type to `EstimatedSizeArbitrary<A>`
- [x] 2.3 Add method overloads for `map()` in interface definitions

## 3. Factory Return Types

- [x] 3.1 Update `integer()` to return `ExactSizeArbitrary<number>`
- [x] 3.2 Update `real()` to return `ExactSizeArbitrary<number>`
- [x] 3.3 Update `nat()` to return `ExactSizeArbitrary<number>`
- [x] 3.4 Update `boolean()` to return `ExactSizeArbitrary<boolean>`
- [x] 3.5 Update `constant()` to return `ExactSizeArbitrary<A>`
- [x] 3.6 Update `array()` to return `ExactSizeArbitrary<A[]>`
- [x] 3.7 Update `set()` to return `ExactSizeArbitrary<A[number][]>`
- [x] 3.8 Update `char()`, `ascii()`, `hex()`, `base64()`, `unicode()` return types
- [x] 3.9 Update `string()` return type

## 4. Preset Factory Return Types

- [x] 4.1 Update `positiveInt()`, `negativeInt()`, `nonZeroInt()`, `byte()` return types
- [x] 4.2 Update `nonEmptyString()` return type
- [x] 4.3 Update `nonEmptyArray()`, `pair()` return types
- [x] 4.4 Update `nullable()`, `optional()` return types (kept as `Arbitrary` since union results in non-deterministic size)

## 5. Type Tests

- [x] 5.1 Update `discriminated-unions.types.ts` to test specific return types
- [x] 5.2 Add tests verifying `filter()` returns `EstimatedSizeArbitrary`
- [x] 5.3 Add tests verifying `map()` preserves size type
- [x] 5.4 Run `npm run test:types` and verify all tests pass

## 6. Validation

- [x] 6.1 Run `npm test` to verify no runtime regressions (755 tests passing)
- [x] 6.2 Run `npm run lint` to verify no lint errors (only pre-existing warnings)
