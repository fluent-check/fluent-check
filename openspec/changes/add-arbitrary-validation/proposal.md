# Change: Add Arbitrary Validation with Fail-Fast Error Handling

> **GitHub Issue:** [#118](https://github.com/fluent-check/fluent-check/issues/118)

## Why

Currently, invalid arbitrary constructions (e.g., `fc.integer(10, 0)` with inverted bounds) silently return `NoArbitrary`. While mathematically correct (vacuous truth for universal quantification over an empty set), this behavior can be confusing for users who may not realize their tests are passing for the wrong reasons.

As discussed in issue #118, there are different levels of "invalid":
1. **Semantically meaningless** - e.g., array of size -5 (no interpretation possible)
2. **Empty range** - e.g., `fc.integer(10, 0)` where min > max
3. **Intersectable** - e.g., `fc.nat(-3, 10)` which can be corrected to `fc.nat(0, 10)`

The current implementation handles case 3 correctly but silently degrades cases 1 and 2 to `NoArbitrary`, which can mask configuration errors in tests.

## What Changes

### Public API Validation
- **BREAKING**: `fc.integer(min, max)` SHALL throw `RangeError` when `min > max`
- **BREAKING**: `fc.real(min, max)` SHALL throw `RangeError` when `min > max`
- **BREAKING**: `fc.nat(min, max)` SHALL throw `RangeError` when `max < 0`
- **BREAKING**: `fc.array(arb, min, max)` SHALL throw `RangeError` when `min > max` or `min < 0`
- **BREAKING**: `fc.set(elements, min, max)` SHALL throw `RangeError` when `min > max`, `min < 0`, or `min > elements.length`
- **BREAKING**: `fc.oneof(elements)` SHALL throw `RangeError` when `elements` is empty

### Internal Unsafe Variants
- Add `{ unsafe: true }` option parameter to factory functions
- When `unsafe: true`, return `NoArbitrary` instead of throwing (for shrinking)
- Update all `shrink()` methods to use `unsafe: true`

### Warning Mode (Optional Enhancement)
- Add optional `fc.configure({ warnOnEmpty: true })` to emit warnings when `NoArbitrary` is used in propositions
- Helps detect vacuous truth scenarios without breaking execution

## Impact

- **Affected specs**: `arbitraries`
- **Affected code**: `src/arbitraries/index.ts`, all arbitrary classes with `shrink()` methods
- **Breaking**: Yes - code relying on silent `NoArbitrary` return will now throw
- **Migration**: Users must fix invalid arbitrary configurations or explicitly use `fc.empty()`

## Rationale

1. **Fail-fast principle**: Configuration errors should surface immediately, not produce mysterious test results
2. **Preserve shrinking**: Internal shrinking operations naturally narrow ranges and must not throw
3. **Explicit intent**: Users who want empty arbitraries can use `fc.empty()` explicitly
4. **IDE analogy**: Similar to IDE warnings for always-true/false conditions - catches logic errors early
