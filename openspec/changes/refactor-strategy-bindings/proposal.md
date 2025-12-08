# Change: Refactor Strategy Bindings to Typed Map

## Why

The fluent API builds up test context as an **intersection of records**:

- `fc.scenario()` starts with an empty record type.
- Each `forall` / `exists` quantifier extends the record type by `Record<K, A>`.
- Each `given` extends it by `Record<K, V>`.

Property callbacks therefore see a strongly-typed `Rec` that reflects all bound names and their value types.

However, when quantifiers register arbitraries with the execution strategy, this type information is **erased**:

- `FluentCheckQuantifier` calls `this.strategy.addArbitrary(name, a)`.
- `FluentStrategy` stores these in `public arbitraries: StrategyArbitraries = {}`.
- `StrategyArbitraries` is currently `Record<string, FluentStrategyArbitrary<unknown>>` at best (historically `any`).

This means:

- The strategy cannot express, at the type level, that `"x"` is bound to `Arbitrary<number>` and `"user"` to `Arbitrary<User>`.
- Mixins (`Random`, `Shrinkable`, `Cached`, `Biased`) operate over an existential `unknown` rather than a precise mapping.
- We lose the connection between the **fluent intersection-of-records** and the **internal strategy bindings**, forcing `unknown`/casts where type-level guarantees are available.

This is at odds with the project’s core principle of **type-level first** and the strict-mode refactors that remove unnecessary runtime checks.

## What Changes

### 1. Introduce Strategy Bindings Type

Define an explicit type for strategy bindings: a mapping from arbitrary names to their value types:

```ts
type StrategyBindings = Record<string, unknown>
```

This represents the subset of the fluent record that corresponds to *arbitrary-backed* entries (quantifiers), not givens/derived values.

### 2. Make FluentStrategy Generic Over Bindings

Refactor `FluentStrategy` to be generic over its bindings map:

```ts
export class FluentStrategy<B extends StrategyBindings = {}> implements FluentStrategyInterface<B> {
  public arbitraries: StrategyArbitraries<B> = {}
  public randomGenerator = new FluentRandomGenerator()
  // ...
}
```

Update `StrategyArbitraries` to be parameterized:

```ts
export type StrategyArbitraries<B extends StrategyBindings> = {
  [K in keyof B]: FluentStrategyArbitrary<B[K]>
}
```

Key ideas:

- Each binding name `K` maps to a `FluentStrategyArbitrary<B[K]>`, preserving the value type for that arbitrary.
- The runtime shape of `arbitraries` stays the same; only the compile-time representation becomes precise.

### 3. Link FluentCheck and Strategy Bindings

Extend `FluentCheck` with a third type parameter that tracks **strategy bindings** alongside the fluent record:

```ts
export class FluentCheck<
  Rec extends ParentRec,
  ParentRec extends {},
  Binds extends StrategyBindings = {}
> {
  constructor(
    public strategy: FluentStrategy<Binds> = new FluentStrategyFactory<Binds>().defaultStrategy().build(),
    protected readonly parent: FluentCheck<ParentRec, any, any> | undefined = undefined
  ) { /* ... */ }
}
```

Quantifiers refine both the fluent record and the strategy bindings:

```ts
forall<K extends string, A>(
  name: K,
  a: Arbitrary<A>
): FluentCheck<
  Rec & Record<K, A>,         // extend fluent record
  Rec,
  Binds & Record<K, A>        // extend strategy bindings
>
```

Similarly for `exists`:

```ts
exists<K extends string, A>(
  name: K,
  a: Arbitrary<A>
): FluentCheck<
  Rec & Record<K, A>,
  Rec,
  Binds & Record<K, A>
>
```

This keeps the **intersection-of-records story** intact:

- `Rec` tracks all names visible to the property callback (givens + quantifiers).
- `Binds` tracks the subset of names that correspond to arbitraries and are stored in the strategy.
- For each quantifier, both `Rec` and `Binds` grow in lockstep at the type level.

### 4. Type-Safe Access in FluentStrategy and Mixins

With generic bindings, `FluentStrategy` methods can be expressed in terms of `Binds`:

```ts
getArbitraryState<K extends keyof Binds>(arbitraryName: K): FluentStrategyArbitrary<Binds[K]> {
  return this.arbitraries[arbitraryName]
}

hasInput<K extends keyof Binds>(arbitraryName: K): boolean { /* ... */ }

getInput<K extends keyof Binds>(arbitraryName: K): FluentPick<Binds[K]> { /* ... */ }
```

Strategy mixins (`Random`, `Shrinkable`, `Cached`, `Biased`) will:

- Constrain their base type parameter to `MixinConstructor<FluentStrategy<any>>` as today.
- Use `getArbitraryState<K extends keyof Binds>(name)` so the compiler knows the value type for each arbitrary name.
- Avoid `unknown`/`any` when reading from `arbitraries`, relying instead on `Binds[K]`.

No runtime behavior changes:

- `arbitraries` is still a map from names to state objects.
- `addArbitrary` still mutates `arbitraries` at runtime.
- Only the type system now enforces that `getInput<'x'>()` returns `FluentPick<A>` when `forall<'x', A>` was used.

### 5. Generic FluentStrategyFactory and Presets

Make the strategy factory generic and propagate bindings through presets:

```ts
export class FluentStrategyFactory<B extends StrategyBindings = {}> {
  #strategy: new (config: FluentConfig) => FluentStrategy<B> = FluentStrategy<B>

  build(): FluentStrategy<B> {
    return new this.#strategy(this.configuration)
  }

  // Presets like default/fast/thorough remain, but keep B generic:
  defaultStrategy(): FluentStrategyFactory<B> { /* ... */ }
}
```

The `fc.strategies.*` presets remain non-generic at the top-level API (for ease of use), but internally their factories and resulting strategies carry `B` through:

- `fc.strategies.default` returns a `FluentStrategyFactory<{}>`.
- As quantifiers are added, `FluentCheck` refines the strategy type parameter from `{}` to `Binds & Record<K, A>`.

### 6. Keep Runtime Semantics and Public API Stable

The intent is a **purely type-level refactor**:

- No new runtime checks added.
- No changes to the shape of runtime objects (`FluentStrategy`, `FluentStrategyFactory`, mixins, or presets).
- No changes to the external API of `fc.scenario()`, `fc.strategy()`, or `fc.strategies.*`.

Publicly exposed types may gain additional generic parameters, but with sensible defaults so existing user code continues to compile.

## Impact

- **Affected specs:** `specs/strategies/spec.md`
- **Affected code:**
  - `src/strategies/FluentStrategyTypes.ts`
  - `src/strategies/FluentStrategy.ts`
  - `src/strategies/FluentStrategyMixins.ts`
  - `src/strategies/FluentStrategyFactory.ts`
  - `src/FluentCheck.ts` (to thread bindings generics)
  - `docs/customizable-strategies.md` (to document typed bindings)
- **Breaking:** No intentional runtime behavior changes; type-level changes may surface previously-hidden type mismatches.
- **Performance:** No runtime impact; generics only.
- **Documentation:** Update strategies spec and customizable-strategies docs to describe type-safe strategy bindings.

