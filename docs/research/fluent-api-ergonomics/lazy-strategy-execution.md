# Lazy Strategy Execution in FluentCheck

This note documents the internal change to make strategy instantiation and
arbitrary registration **lazy**, driven by `check()` rather than by fluent
chaining.

## Motivation

Historically:

- Each `FluentCheck` node held a concrete `FluentStrategy` instance.
- Quantifier nodes called `this.strategy.addArbitrary(name, arbitrary)` in
  their constructors.
- `.config()` immediately rebuilt the strategy on the current node.

This tightly coupled the *builder* phase with a live strategy object and
made it difficult to express the evolving record type at the strategy level
without casts.

The new model separates:

- **Builder phase** – constructing a description of the scenario:
  - quantifiers (`name`, `Arbitrary<A>`, kind),
  - givens / whens / assertions,
  - configuration (`config`, `withGenerator`).
- **Execution phase** – constructing the concrete strategy and driving it
  when `check()` is called.

## Execution Flow

At a high level, `check()` now does the following:

1. Compute `path = this.pathFromRoot()` (from root `FluentCheck` to leaf).
2. Resolve execution configuration:
   - Last `strategyFactory` seen along the path.
   - Last RNG builder/seed from any `FluentCheckGenerator` node.
3. Build concrete instances:
   - `FluentStrategy<Record<string, unknown>>` from the resolved factory
     (or a default one if none is configured).
   - `FluentRandomGenerator` from the resolved RNG settings.
4. Attach the strategy to all nodes and register arbitraries:
   - For each `FluentCheck` node in `path`:
     - `node.strategy = strategy`
     - If `node instanceof FluentCheckQuantifier`, call
       `node.registerArbitrary()` (which delegates to `strategy.addArbitrary`).
5. Initialize RNG and run the chain:
   - Build a callback chain from leaf to root using each node’s `run(...)`.
   - Call `root.run(initialTestCase, callback)` and wrap the resulting
     `FluentResult` with the final example and seed.

## Node Responsibilities

- `FluentCheck` (root and structural nodes)
  - Stores `strategyFactory?` and parent pointer.
  - Exposes `check()` and `pathFromRoot()`.
  - Default `run(...)` just forwards to the next callback.

- `FluentCheckQuantifier`
  - Stores `(name, arbitrary)` and quantifier kind (`forall`/`exists`).
  - Has `registerArbitrary()` which calls
    `this.strategy.addArbitrary(this.name, this.a)`.
  - Implements the quantifier loop in `run(...)` using `strategy` and RNG.

- `FluentCheckGiven*`, `FluentCheckWhen`, `FluentCheckAssert`
  - No longer touch the strategy in their constructors.
  - Only use `strategy` during execution once it has been attached by
    `check()`.

- `FluentCheckGenerator`
  - Stores RNG builder and optional seed.
  - Configuration is resolved by the root’s `#resolveExecutionConfig`.

## Public API Impact

The public API is intentionally unchanged:

- `fc.scenario()`, `.config(fc.strategies.*)`, `.withGenerator(...)`,
  `.forall`, `.exists`, `.given`, `.when`, `.then`, `.check()` all keep
  their existing signatures and type behaviour.
- The only change is *when* the strategy is instantiated and configured:
  - Before: during fluent construction.
  - After: once at `check()` time, based on the final chain.

This design keeps strategy concerns internal while improving the separation
between describing tests and executing them.

