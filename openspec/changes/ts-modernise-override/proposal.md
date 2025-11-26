# Change: Add Explicit `override` Keyword to Overridden Methods

> **GitHub Issue:** [#381](https://github.com/fluent-check/fluent-check/issues/381)

## Why
When a subclass overrides a parent method, TypeScript doesn't require any marker by default. If the parent method is renamed or removed, the child method silently becomes a new method instead of an override. The `override` keyword (TypeScript 4.3+) makes this explicit, and with `noImplicitOverride: true`, the compiler catches accidental non-overrides.

## What Changes
- Add `override` keyword to all methods that override parent class methods
- Enable `noImplicitOverride: true` in `tsconfig.json` (part of strict-mode proposal)
- Primary targets: All `Arbitrary` subclasses overriding `size()`, `pick()`, `shrink()`, `canGenerate()`, `cornerCases()`
- Secondary targets: `FluentCheck` subclass methods

## Impact
- Affected specs: None (compile-time safety improvement)
- Affected code: All files in `src/arbitraries/` extending `Arbitrary`, `src/FluentCheck.ts` subclasses
- Breaking: None (keyword is additive, no runtime changes)

## Example

**Before:**
```typescript
class ArbitraryInteger extends Arbitrary<number> {
  size(): ArbitrarySize {
    // Implicitly overrides Arbitrary.size()
  }
  
  pick(generator: () => number) {
    // Implicitly overrides Arbitrary.pick()
  }
}
```

**After:**
```typescript
class ArbitraryInteger extends Arbitrary<number> {
  override size(): ArbitrarySize {
    // Explicitly overrides Arbitrary.size()
  }
  
  override pick(generator: () => number) {
    // Explicitly overrides Arbitrary.pick()
  }
}
```

## Affected Classes
- `ArbitraryInteger`, `ArbitraryReal`, `ArbitraryBoolean`
- `ArbitraryArray`, `ArbitrarySet`, `ArbitraryTuple`
- `ArbitraryComposite`, `ArbitraryConstant`
- `MappedArbitrary`, `FilteredArbitrary`, `ChainedArbitrary`, `WrappedArbitrary`
- `FluentCheckWhen`, `FluentCheckGiven*`, `FluentCheckQuantifier`, `FluentCheckAssert`, `FluentCheckGenerator`
