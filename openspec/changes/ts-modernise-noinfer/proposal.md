# Change: Use `NoInfer<T>` for Controlled Type Inference

## Why
TypeScript 5.4 introduced `NoInfer<T>` to prevent type inference from specific positions. This is useful when a function has multiple parameters of the same type parameter but inference should only come from one position. Currently, some FluentCheck APIs may infer types from unintended positions.

## What Changes
- Apply `NoInfer<T>` to parameters where inference should be blocked
- Primary candidates:
  - `given()` method in `FluentCheck.ts` - prevent inference from callback return
  - Factory functions where explicit types are preferred over inference
- Evaluate and apply judiciously to avoid over-engineering

## Impact
- Affected specs: None (type-level improvement)
- Affected code: `src/FluentCheck.ts`, potentially `src/arbitraries/index.ts`
- Breaking: Potentially breaking for users relying on current inference behavior

## Example

**Before:**
```typescript
given<K extends string, V>(name: K, v: V | ((args: Rec) => V)): FluentCheckGiven<K, V, ...>
// V is inferred from both the constant value and callback return
```

**After:**
```typescript
given<K extends string, V>(name: K, v: NoInfer<V> | ((args: Rec) => V)): FluentCheckGiven<K, V, ...>
// V is inferred only from callback return, preventing accidental widening
```

## Notes
This change requires careful evaluation of each use case. `NoInfer<T>` should only be applied where it genuinely improves the developer experience.
