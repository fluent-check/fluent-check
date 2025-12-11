# Change: Migrate to Native ES2022 Private Fields

> **GitHub Issue:** [#382](https://github.com/fluent-check/fluent-check/issues/382)

## Why
The codebase uses TypeScript's `private` keyword for class field privacy, which is only enforced at compile-time. ES2022 native private fields (`#field`) provide true runtime privacy, preventing access even through type assertions or at runtime. This aligns with modern JavaScript best practices and provides stronger encapsulation.

## What Changes
- Replace `private` keyword with `#` prefix for truly private fields
- Replace `private` methods with `#` methods where appropriate
- Update internal references from `this.field` to `this.#field`
- Maintain TypeScript `private` for protected-like visibility where subclass access is needed

## Impact
- Affected specs: None (internal implementation detail)
- Affected code: All class files in `src/`
- Breaking: None for public API; private fields were already inaccessible to consumers

## Example

**Before:**
```typescript
class FluentCheckAssert {
  private runPreliminaries<T>(testCase: ValueResult<T>): Rec {
    // TypeScript-only privacy
  }
}
```

**After:**
```typescript
class FluentCheckAssert {
  #runPreliminaries<T>(testCase: ValueResult<T>): Rec {
    // True runtime privacy
  }
}
```

## Considerations
- Private fields cannot be accessed via `this['fieldName']` (intentional)
- Slightly different semantics for inheritance (private fields are per-class, not inherited)
- May require TypeScript target ES2022 or later (already configured)
