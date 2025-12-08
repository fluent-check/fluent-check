# Change: Track Original Types in Fluent Picks

> **GitHub Issue:** (TBD)

## Why

`FluentPick<V>` is the core wrapper used throughout the engine to carry generated values and their provenance. Today it is defined as:

```ts
export type FluentPick<V> = {
  value: V
  original?: any
}
```

This uses `any` for the `original` field, which has several drawbacks:

- **Type erasure:** The type system cannot distinguish between:
  - Picks where `original` is the same type as `value` (most base arbitraries).
  - Picks where `original` reflects a **different** type (e.g., `MappedArbitrary`, chained/shrunk values).
- **Lost debugging power:** We cannot express, at the type level, that a particular value was derived from a specific original type, which makes shrinking/debugging tooling less precise.
- **Inconsistent with strict-mode goals:** Recent strict-mode refactors (utility types, mapped types, known structures) all move toward expressing invariants in the type system rather than in `any`/`unknown`.

At the same time:

- The `Arbitrary<A>` hierarchy currently only has **one** type parameter (the generated value).
- Several arbitraries (`MappedArbitrary`, `ArbitraryArray`, etc.) already **treat `original` differently**, but the type system does not encode that distinction.

We want to:

- Make the **original type explicit** at the type level.
- Preserve the existing fluent API (`fc.integer()`, `fc.array()`, `fc.tuple()`, `fc.scenario()`) without breaking user code.
- Avoid introducing runtime changes; this is a type-level enhancement.

## What Changes

### 1. Introduce a Generic FluentPick with Original Type

Redefine `FluentPick` in `src/arbitraries/types.ts` as:

```ts
// Instead of `original?: any`, track the original type
export type FluentPick<V, Original = V> = {
  value: V
  original?: Original
  // Future: could add `shrinkPath?: ShrinkStep<Original, V>[]` for debugging
}

// For mapped arbitraries where Original ≠ V
export type MappedPick<V, Original> = FluentPick<V, Original>

// Utility helpers
export type PickValue<P> = P extends FluentPick<infer V, any> ? V : never
export type PickOriginal<P> = P extends FluentPick<any, infer O> ? O : never
```

Key points:

- `Original` defaults to `V`, so existing call sites that don’t care about original types remain valid.
- `MappedPick` is a convenience alias for arbitraries where `value` and `original` intentionally differ.
- `PickValue` / `PickOriginal` allow future tooling (debugging, shrinking traces) to introspect pick types.

### 2. Generalize Arbitrary to Track Original Types

Extend the `Arbitrary` class to carry both the **value type** and **original type**:

```ts
export abstract class Arbitrary<V, Original = V> {
  abstract size(): ArbitrarySize

  abstract pick(generator: () => number): FluentPick<V, Original> | undefined

  abstract canGenerate<B extends V>(pick: FluentPick<B, Original>): boolean

  // Default shrinking keeps the same Original type parameter
  shrink<B extends V>(_initial: FluentPick<B, Original>): Arbitrary<V, Original> {
    return NoArbitrary as Arbitrary<V, Original>
  }

  // map/filter/chain will be updated as described below
}
```

For most existing arbitraries, `Original = V` remains the correct choice. For mapped/transformed arbitraries, `Original` expresses the provenance of the value.

### 3. Adapt Core Arbitraries to the New Signature

Update all core arbitraries to the new generic shape:

- Base/primitive arbitraries (no transformation):
  - `ArbitraryInteger`, `ArbitraryReal`, `ArbitraryBoolean`, `ArbitrarySet`, `ArbitraryArray`, `ArbitraryTuple`, `ArbitraryRecord`, `datetime` primitives, etc.:
    ```ts
    export class ArbitraryInteger extends Arbitrary<number> { /* ... */ }
    ```
    - `pick` returns `FluentPick<number>` (i.e. `FluentPick<number, number>`).
    - `original` remains `number` (or structured arrays/records where appropriate).

- Mapped arbitraries:
  - `MappedArbitrary<A, B>` becomes `Arbitrary<B, A>`:
    ```ts
    export class MappedArbitrary<A, B> extends Arbitrary<B, A> {
      constructor(
        public readonly baseArbitrary: Arbitrary<A>, // produces FluentPick<A, A>
        public readonly f: (a: A) => B,
        public readonly shrinkHelper?: XOR<{
          inverseMap: (b: B) => A[]
        }, {
          canGenerate: (pick: FluentPick<B, A>) => boolean
        }>
      ) { /* ... */ }

      mapFluentPick(p: FluentPick<A, any>): FluentPick<B, A> {
        const original: A = p.original ?? p.value
        return { value: this.f(p.value), original }
      }

      override pick(generator: () => number): FluentPick<B, A> | undefined { /* ... */ }

      override cornerCases(): FluentPick<B, A>[] { /* ... */ }

      override shrink(initial: FluentPick<B, A>): Arbitrary<B, A> { /* ... */ }

      override canGenerate(pick: FluentPick<B, A>) { /* ... */ }
    }
    ```
    - Note: `shrinkHelper.canGenerate` now sees a typed `FluentPick<B, A>`.

- Chained arbitraries:
  - `ChainedArbitrary<A, B>` remains `Arbitrary<B>` value-wise, but original type follows the chained arbitrary:
    ```ts
    export class ChainedArbitrary<A, B> extends Arbitrary<B> {
      // baseArbitrary: Arbitrary<A>
      // f: (a: A) => Arbitrary<B>
      override pick(generator: () => number): FluentPick<B> | undefined {
        const pick = this.baseArbitrary.pick(generator)
        return pick === undefined ? undefined : this.f(pick.value).pick(generator)
      }
      // original is whatever the chained arbitrary defines; we do not override it here
    }
    ```
    - This class does not introduce a new provenance level; it simply delegates.

- Composite/collection arbitraries:
  - `ArbitraryArray<A>`:
    - `value: A[]`
    - `original: (OriginalOf<A>)[]` (effectively `unknown[]` until we refine more).
    - Initial implementation can keep `Original[]` as `unknown[]` and be tightened later as we propagate original types more deeply.

The initial focus is on making the **top-level `Original` parameter exist and be correct for mapped cases**, then improving internal composites as a follow-up.

### 4. Update Map/Filter/Chain Signatures

Refine combinators in `Arbitrary` to respect and propagate original types:

```ts
map<B>(
  f: (a: V) => B,
  shrinkHelper?: XOR<{
    inverseMap: (b: NoInfer<B>) => V[]
  }, {
    canGenerate: (pick: FluentPick<NoInfer<B>, V>) => boolean
  }>
): Arbitrary<B, V> { /* returns MappedArbitrary<V, B> */ }

filter(f: (a: V) => boolean): Arbitrary<V, Original> { /* preserves Original */ }

chain<B>(f: (a: V) => Arbitrary<B>): Arbitrary<B> { /* Original of the chained arbitrary dominates */ }
```

This ensures:

- Mapping from `V` to `B` records `V` as the original type for `B`.
- Filtering does not change provenance, only which values are kept.
- Chaining hands control of `Original` to the returned arbitrary from `f`.

### 5. Surface Types and Compatibility

Public APIs like:

```ts
export const integer = (min?: number, max?: number): Arbitrary<number> => { /* ... */ }
export const array = <A>(arb: Arbitrary<A>, min?: number, max?: number): Arbitrary<A[]> => { /* ... */ }
```

remain source-compatible because:

- `Arbitrary<A>` is now an alias for `Arbitrary<A, A>` at call sites that don’t mention the second parameter.
- All exported functions can continue to elide the `Original` type, relying on defaults, while internally the engine gains more type information.

No change is required to:

- `fc.scenario()`, `fc.prop()`, or templates.
- User code that only mentions the first type parameter of `Arbitrary<T>`.

## Impact

- **Affected specs:**
  - `specs/arbitraries/spec.md` (document provenance/original type tracking in arbitraries)
  - `specs/shrinking/spec.md` (how original values are used in shrinking)
- **Affected code:**
  - `src/arbitraries/types.ts` – new `FluentPick<V, Original>` and helpers.
  - `src/arbitraries/Arbitrary.ts` – generic `Arbitrary<V, Original>` and updated combinators.
  - All `src/arbitraries/*` implementations that construct or consume `FluentPick`.
  - Potential small adjustments in `FluentCheck` / `FluentResult` sites that assume `FluentPick<V>` only.
- **Breaking:** No intentional runtime behavior changes; type-level changes may surface previously-silent type mismatches.
- **Performance:** No runtime impact; changes are purely at the type level.
- **Documentation:**
  - Update `docs/chained-type-inference.md` to describe `FluentPick<V, Original>` and provenance.
  - Add examples showing how original types are tracked through `map`, `filter`, and `chain`.

