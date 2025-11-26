# Change: Use `NoInfer<T>` for Controlled Type Inference

> **GitHub Issue:** [#380](https://github.com/fluent-check/fluent-check/issues/380)

## Why

TypeScript 5.4 introduced `NoInfer<T>` to prevent type inference from specific positions. This addresses a common problem in FluentCheck's API where type parameters appear in multiple positions, leading to:

1. **Inference conflicts** - When `V` appears in both constant and callback positions, TypeScript may unify them incorrectly
2. **Unexpected literal types** - Passing `5` might infer `V = 5` instead of `V = number`
3. **Poor error messages** - When inference fails, errors point to the wrong location
4. **Reduced IDE assistance** - Autocomplete and hover types become unpredictable

## What Changes

### Primary Candidates (see `analysis.md` for detailed reasoning)

1. **`given()` method** in `FluentCheck.ts:31`:
   ```typescript
   // Before
   given<K extends string, V>(name: K, v: V | ((args: Rec) => V))
   // V is inferred from BOTH positions, causing potential conflicts
   
   // After  
   given<K extends string, V>(name: K, v: NoInfer<V> | ((args: Rec) => V))
   // V is inferred ONLY from callback return type
   ```
   
   **Rationale**: Analysis of test suite shows 100% callback usage, zero constant usage. Callback return type is the explicit type specification, while constants risk literal type inference (`5` instead of `number`).

2. **`and()` method** in `FluentCheck.ts:113` (same pattern as `given()`):
   ```typescript
   // Before
   and<NK extends string, V>(name: NK, f: ((args: Rec) => V) | V)
   
   // After
   and<NK extends string, V>(name: NK, f: ((args: Rec) => V) | NoInfer<V>)
   ```
   
   **Rationale**: Identical API structure to `given()`, same inference issues apply.

3. **`map()` shrinkHelper** in `Arbitrary.ts:119`:
   ```typescript
   // Before
   map<B>(f: (a: A) => B, shrinkHelper?: XOR<{inverseMap: (b: B) => A[]}, {canGenerate: ...}>)
   // B could be inferred from shrinkHelper instead of f
   
   // After
   map<B>(f: (a: A) => B, shrinkHelper?: XOR<{inverseMap: (b: NoInfer<B>) => A[]}, {canGenerate: (pick: FluentPick<NoInfer<B>>) => boolean}>)
   // B is always inferred from f's return type
   ```
   
   **Rationale**: `f` is required and defines the transformation; `shrinkHelper` is optional and semantically depends on `B` that `f` produces. 90%+ of usage omits `shrinkHelper`. The helper should consume the type, not define it.

### Secondary Candidates (evaluate during implementation)

- `oneof<A>(elements: A[])` in `index.ts` - may benefit from explicit type parameter guidance
- Factory functions with default parameters where inference should be explicit

## Benefits

| Benefit | Description |
|---------|-------------|
| **Clearer Type Contracts** | `NoInfer` documents which parameter drives type inference |
| **Better Error Messages** | Type errors point to the correct inference source |
| **Predictable IDE Support** | Autocomplete works consistently regardless of call style |
| **Reduced Type Annotations** | Users need fewer explicit type parameters when API behaves predictably |
| **Self-Documenting API** | The type signature itself explains the inference behavior |

## Impact

- **Affected specs**: None (type-level improvement only)
- **Affected code**: 
  - `src/FluentCheck.ts` - `given()`, `and()` methods
  - `src/arbitraries/Arbitrary.ts` - `map()` method
  - `src/arbitraries/index.ts` - factory functions (if applicable)
- **Breaking**: Potentially breaking for users who:
  - Rely on current inference behavior with constants
  - Have explicit type parameters that conflict with new inference
- **TypeScript requirement**: TS 5.4+ (current project uses TS 5.9.3 ✓)

## Example: The Problem Today

```typescript
// User wants V to be inferred as `Stack<number>` from the callback
fc.scenario()
  .given('stack', () => new Stack<number>())  // V should be Stack<number>
  
// But if using .and() with a constant later:
  .and('count', 0)  // V is now inferred as `number`... or is it `0`?
  
// With NoInfer, the callback always wins for inference:
  .and('initial', (args) => args.stack.size())  // V clearly from callback return
```

## Evaluation Criteria

Apply `NoInfer<T>` when:
- ✅ Multiple positions could infer the same type parameter
- ✅ One position is clearly the "primary" inference source
- ✅ The secondary position typically receives derived or transformed values

Do NOT apply `NoInfer<T>` when:
- ❌ Both positions should equally contribute to inference
- ❌ It would require users to add explicit type annotations where they currently don't need them
- ❌ The change would break common usage patterns without clear benefit

## Notes

This change requires careful evaluation of each use case. `NoInfer<T>` should only be applied where it genuinely improves the developer experience. Implementation should include type-level tests to verify the inference behavior changes as expected.

## References

- [TypeScript 5.4 Release Notes - NoInfer](https://devblogs.microsoft.com/typescript/announcing-typescript-5-4/#the-noinfer-utility-type)
- [TypeScript Handbook - Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html)
- See `analysis.md` for detailed usage analysis and inference source justification
