# Change: Refactor Fluent Strategy to Lazy Execution

## Why

The current strategy integration tightly couples `FluentCheck` node construction
with a live `FluentStrategy` instance:

- Each quantifier node (`forall` / `exists`) calls `this.strategy.addArbitrary(name, a)` in its constructor.
- The `strategy` object is threaded through the entire `FluentCheck` chain and
  mutated during chaining (e.g. `.config()`, `.withGenerator()`).
- The type-level story tries to keep `FluentStrategy<Rec>` in sync with the
  evolving fluent record `Rec`, which introduces casts and generic complexity.

Conceptually, though:

- The **builder phase** (chaining `given` / `when` / `forall` / `exists` /
  `then`) only needs to record *what* should happen.
- The **execution phase** (`check()` / `assert()`) is the only place where
  we actually need a concrete strategy instance, an RNG, and a
  name → `FluentStrategyArbitrary<A>` map.

Tying a mutable `FluentStrategy` object to every `FluentCheck` node:

- Makes it harder to express the evolving `Rec`/bindings relationship at the
  type level without resorting to assertions.
- Forces the type system to reason about a single mutable strategy object
  whose "logical" generic parameter changes as the chain grows.
- Obscures the conceptual separation between:
  - **what to generate** (the fluent scenario description), and
  - **how to execute** (the strategy, RNG, shrinking, etc.).

We want a design where:

- Builder nodes are **pure descriptions** (names, arbitraries, derived values,
  and config), with no live strategy state.
- `check()` is responsible for instantiating the strategy, initializing the
  RNG, registering arbitraries, and driving execution.
- Type-level precision about `Rec` lives in `FluentCheck` and its helper
  classes, while the strategy remains a runtime engine that is configured
  just-in-time.

## What Changes

### 1. Separate Builder and Execution Phases

Refactor `FluentCheck` so that:

- The builder phase (`scenario()`, `given`, `when`, `forall`, `exists`,
  `then`, `withGenerator`, `config`) **does not require** a live
  `FluentStrategy` instance.
- Each `FluentCheck` node stores:
  - Its structural role (root, given, when, quantifier, assert, generator).
  - Any associated data:
    - `given`: name, constant/factory.
    - `when`: side-effect function.
    - quantifier: name, `Arbitrary<A>`, quantifier kind (universal/existential).
    - `withGenerator`: RNG builder + optional seed.
    - `config`: strategy factory preset.
- The `strategy` field becomes an **execution-time concern**:
  - Either removed from individual nodes, or replaced by a minimal
    `ExecutionContext` that is only constructed in `check()`.

### 2. Introduce an Execution Context

Define an internal execution context responsible for:

- Holding the concrete `FluentStrategy` instance.
- Holding the concrete `FluentRandomGenerator` (with seed).
- Providing helpers to:
  - Register arbitraries by walking the quantifier nodes.
  - Configure/initialize shrinking and caches.
  - Run quantifier loops (`configArbitrary` / `hasInput` / `getInput`) and
    propagate `FluentResult` up the chain.

Shape (high-level sketch):

```ts
type ExecutionConfig = {
  strategyFactory: FluentStrategyFactory
  rngBuilder: (seed: number) => () => number
  seed?: number
}

class ExecutionContext<Rec extends {}> {
  constructor(
    public readonly config: ExecutionConfig,
    public readonly strategy: FluentStrategy,
    public readonly rng: FluentRandomGenerator
  ) {}

  registerQuantifiers(path: FluentCheck<any, any>[]): void
  run(root: FluentCheck<Rec, any>): FluentResult<Rec>
}
```

Key ideas:

- The context is created **once** at the root `check()` call, using the final
  `Rec` type and resolved strategy/RNG configuration from the chain.
- Quantifier nodes no longer call `addArbitrary` in their constructors; they
  expose their `(name, arbitrary)` pairs to the context.

### 3. Make Quantifier Nodes Strategy-Agnostic in Construction

Refactor `FluentCheckQuantifier` and its subclasses so that:

- Constructors take only:

  ```ts
  constructor(
    parent: FluentCheck<ParentRec, any>,
    name: K,
    a: Arbitrary<A>
  ) { /* ... */ }
  ```

- They **do not** capture a `FluentStrategy` instance or mutate it in the
  constructor.
- Instead, they provide:
  - A way for the execution context to discover which arbitraries to register:

    ```ts
    getQuantifierBinding(): { name: K, arbitrary: Arbitrary<A>, kind: 'forall' | 'exists' }
    ```

  - A `runWithStrategy` method that accepts a `FluentStrategy` and
    `FluentRandomGenerator` at execution time:

    ```ts
    protected runWithStrategy(
      strategy: FluentStrategy,
      rng: FluentRandomGenerator,
      testCase: WrapFluentPick<Rec>,
      callback: (arg: WrapFluentPick<Rec>) => FluentResult,
      partial?: FluentResult,
      depth = 0,
      accumulatedSkips = 0
    ): FluentResult
    ```

- The existing quantifier loop logic (configArbitrary / hasInput / getInput /
  shrink integration) moves into `runWithStrategy`, called from the root
  `check()` via the execution context.

### 4. Resolve Strategy Factory and RNG at the Root

Refactor `FluentCheck.check()` to:

1. Walk `pathFromRoot()` to:
   - Collect the last `config(strategyFactory)` call, if any.
   - Collect the last `withGenerator(rngBuilder, seed)` call, if any.
   - Collect quantifier nodes in order.
2. Build the concrete `FluentStrategy` and RNG:

   ```ts
   const factory = resolvedStrategyFactory ?? new FluentStrategyFactory()
   const strategy = factory.defaultStrategy().build()
   const rng = resolvedRngBuilder
     ? new FluentRandomGenerator(resolvedRngBuilder, resolvedSeed)
     : new FluentRandomGenerator()
   strategy.randomGenerator = rng
   ```

3. Register quantifiers in the strategy by iterating the quantifier nodes
   (using their `getQuantifierBinding()`).
4. Execute the chain by:
   - Starting from the root `FluentCheck` node.
   - Calling a new `execute(context, initialTestCase)` method on each node
     instead of the old `run(...)` that implicitly captured `this.strategy`.

Public behaviour remains unchanged:

- `fc.scenario().config(fc.strategies.default)` continues to work.
- `withGenerator()` still sets a deterministic RNG for the whole chain.
- Shrinking/caching/dedup/bias semantics are preserved.

### 5. Keep Public API and Type Inference Stable

Ensure that:

- The external `FluentCheck` generics remain:

  ```ts
  export class FluentCheck<Rec extends ParentRec, ParentRec extends {} = {}> { /* ... */ }
  ```

- The following signatures are unchanged for users:
  - `scenario(): FluentCheck<{}, {}>`
  - `forall` / `exists` return types.
  - `given` / `when` / `then` chaining and their `Rec` inference.
  - `withGenerator` and `.config(fc.strategies.*)` usage.
- Any additional types introduced for execution (e.g. `ExecutionContext`) are
  internal and not exported from `dist`.

## Impact

- **Affected specs:**
  - `specs/strategies/spec.md` (strategy lifecycle and execution model)
  - `specs/fluent-api/spec.md` (if it mentions strategy binding semantics)

- **Affected code:**
  - `src/FluentCheck.ts`
  - `src/strategies/FluentStrategy.ts`
  - `src/strategies/FluentStrategyFactory.ts`
  - `src/strategies/FluentStrategyMixins.ts`
  - `src/strategies/presets.ts`

- **Behavioural intent:**
  - No user-visible API changes.
  - No runtime semantic changes for sampling, shrinking, caching, or bias.
  - The change is primarily architectural and type-structural.

- **Type-level impact:**
  - Simplifies the relationship between `Rec` and strategy types by pushing
    strategy instantiation to execution time.
  - Reduces or eliminates the need for cross-node type assertions
    (`as unknown as`), concentrating any unavoidable assertions into
    small, well-documented internal helpers.

