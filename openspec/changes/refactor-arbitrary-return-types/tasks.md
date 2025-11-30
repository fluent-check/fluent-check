## 1. Type Definitions

- [x] 1.1 Add `ExactSizeArbitrary<A>` type to `types.ts` (with `size()`, `map()`, `filter()`, `suchThat()` signatures)
- [x] 1.2 Add `EstimatedSizeArbitrary<A>` type to `types.ts` (with `size()`, `map()`, `filter()`, `suchThat()` signatures)
- [x] 1.3 Export new types from `index.ts`
- [x] 1.4 Update `NoArbitrary` type declaration to `ExactSizeArbitrary<never>` (already returns `ExactSize` at runtime)

## 2. Base Class Updates

- [x] 2.1 ~~Update `Arbitrary.filter()` return type to `EstimatedSizeArbitrary<A>`~~ (kept as `Arbitrary<A>` - narrowing via type assertions)
- [x] 2.2 ~~Update `Arbitrary.suchThat()` return type to `EstimatedSizeArbitrary<A>`~~ (kept as `Arbitrary<A>` - narrowing via type assertions)

Note: The base class methods retain `Arbitrary<A>` return types. The specific interface types (`ExactSizeArbitrary`, `EstimatedSizeArbitrary`) are applied via type assertions at factory boundaries. This is necessary because TypeScript's intersection types don't override base class method return types.

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
- [x] 3.10 Update `oneof()` to return `ExactSizeArbitrary<A[number]>` (uses `integer().map()`)

## 4. Preset Factory Return Types

- [x] 4.1 Update `positiveInt()`, `negativeInt()`, `byte()` return types (`nonZeroInt()` uses `union()` so stays `Arbitrary`)
- [x] 4.2 Update `nonEmptyString()` return type
- [x] 4.3 Update `nonEmptyArray()` return type (`pair()` uses `tuple()` so stays `Arbitrary`)
- [x] 4.4 `nullable()`, `optional()` use `union()` so stay `Arbitrary` (by design)

## 5. Type Tests

- [x] 5.1 Update `discriminated-unions.types.ts` to test specific return types
- [x] 5.2 Add tests verifying `filter()` returns `EstimatedSizeArbitrary`
- [x] 5.3 Add tests verifying `map()` preserves size type (ExactSize → ExactSize, EstimatedSize → EstimatedSize)
- [x] 5.4 Add tests verifying `oneof()` returns `ExactSizeArbitrary`
- [x] 5.5 Add tests verifying `NoArbitrary` is assignable to `ExactSizeArbitrary<never>`
- [x] 5.6 Add tests verifying chained transformations: `integer().map().filter().map()` type flow
- [x] 5.7 Run `npx tsc --noEmit` and verify all tests pass

## 6. Validation

- [x] 6.1 Run `npm test` to verify no runtime regressions (266 tests passing)
- [x] 6.2 Run `npm run lint` to verify no lint errors (0 errors, pre-existing warnings only)

## Implementation Notes

The implementation uses **type assertions at factory boundaries** rather than changing base class return types. This is because:

1. TypeScript's intersection types (`ArbitraryBase<A> & { ... }`) don't override base class method signatures
2. The runtime implementations already return correct types (e.g., `FilteredArbitrary.size()` returns `EstimatedSize`)
3. Type assertions are safe because they document what the runtime already does

Helper function `asExact<A>()` is used in `index.ts` and `string.ts` to apply the type assertion cleanly.
