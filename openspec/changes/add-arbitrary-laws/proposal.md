# Change: Add Arbitrary Laws for Universal Property Testing

> **GitHub Issue:** [#448](https://github.com/fluent-check/fluent-check/issues/448)

## Why

Currently, tests for arbitrary implementations are duplicated across each arbitrary type. For example, `canGenerate`, `size()`, `cornerCases()`, `sample()`, `shrink()`, and other core behaviors are tested separately for `integer`, `string`, `boolean`, `array`, `tuple`, `set`, `oneof`, `constant`, `filter`, `map`, etc.

This creates several problems:
1. **Test duplication** - The same properties (e.g., "samples should be generatable") are written repeatedly
2. **Inconsistent coverage** - New arbitraries may miss testing certain laws
3. **Maintenance burden** - Changes to expected behavior require updates across many test files
4. **Hidden assumptions** - Universal properties that ALL arbitraries should satisfy are scattered and implicit

Property-based testing frameworks like QuickCheck and ScalaCheck solve this by defining "laws" - universal properties that any instance of a typeclass should satisfy. We can apply the same pattern to test that any `Arbitrary<T>` implementation satisfies the core contracts.

## What Changes

- Add a new `ArbitraryLaws` test utility that defines universal properties any arbitrary must satisfy
- Create a registry of law-checking functions that can be run against any `Arbitrary<T>`
- Refactor existing arbitrary tests to use the laws where applicable, reducing duplication
- Document the laws as a specification of arbitrary behavior

### Laws to be defined:

1. **Sample validity** - All sampled values should pass `canGenerate`
2. **Size consistency** - `sample(n).length <= n` (bounded by arbitrary size)
3. **Corner case inclusion** - `sampleWithBias` includes corner cases when size allows
4. **Unique sample uniqueness** - `sampleUnique` returns distinct values
5. **Shrink produces smaller values** - Shrunk arbitraries generate values "smaller" than the original
6. **Shrink terminates** - Shrinking eventually produces NoArbitrary
7. **Filter respects predicate** - Filtered values always satisfy the filter predicate
8. **Map applies transformation** - Mapped values are transformations of base values
9. **NoArbitrary composition** - Operations on NoArbitrary return NoArbitrary

## Impact

- Affected specs: `arbitraries` (documenting laws), potentially new `arbitrary-laws` capability
- Affected code: `test/arbitrary.test.ts`, new `test/arbitrary-laws.test.ts` or `src/arbitraries/laws.ts`
- Breaking changes: None - purely additive for testing
