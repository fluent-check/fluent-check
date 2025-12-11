# FluentCheck Architecture

This document describes the high-level architecture of FluentCheck, a property-based testing framework for TypeScript.

## Overview

FluentCheck is built on a modular, layered architecture that separates concerns into distinct components:

```
┌─────────────────────────────────────────────────────────────────┐
│                     PUBLIC API LAYER                            │
│  (FluentCheck, scenario(), prop(), FluentProperty)              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                    AST & SCENARIO LAYER                         │
│  (Scenario, ScenarioNode, ExecutableScenario, Quantifier)       │
│  - Immutable declarative structure                              │
│  - Compiled into executable form                                │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                   STRATEGY ORCHESTRATION LAYER                  │
│         (FluentStrategy, FluentStrategyFactory)                 │
│  - Composition of Sampler, Explorer, Shrinker                   │
│  - Configuration and factory pattern                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼─────────┐  ┌─────────▼────────┐  ┌──────────▼───────┐
│   EXPLORATION   │  │    SAMPLING      │  │   SHRINKING      │
│   (Explorer)    │  │  (Sampler +      │  │  (Shrinker)      │
│                 │  │  Decorators)     │  │                  │
│ - NestedLoop    │  │                  │  │ - PerArbitrary   │
│   Explorer      │  │ Base:            │  │ - NoOp           │
│                 │  │ - RandomSampler  │  │                  │
│ - Search space  │  │                  │  │ - Budget-based   │
│   traversal     │  │ Decorators:      │  │   iteration      │
│ - Quantifier    │  │ - BiasedSampler  │  │ - Re-verifies    │
│   semantics     │  │ - CachedSampler  │  │   nested         │
│ - Budget        │  │ - Deduping       │  │   quantifiers    │
│   control       │  │   Sampler        │  │                  │
└─────────────────┘  └──────────────────┘  └──────────────────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│              ARBITRARY & VALUE GENERATION LAYER                 │
│    (Arbitrary, ArbitraryInteger, ArbitraryString, etc.)         │
│  - Corner case generation (cornerCases())                       │
│  - Biased sampling                                              │
│  - Shrinking trees                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Scenario AST

The `Scenario` type represents an immutable AST (Abstract Syntax Tree) of a property test:

```typescript
export interface Scenario<Rec extends {} = {}> {
  readonly nodes: readonly ScenarioNode<Rec>[]
  readonly quantifiers: readonly QuantifierNode[]
  readonly hasExistential: boolean
  readonly searchSpaceSize: number
}
```

**Node types:**

| Type | Description |
|------|-------------|
| `ForallNode` | Universal quantifier - property must hold for ALL values |
| `ExistsNode` | Existential quantifier - property must hold for SOME value |
| `GivenNode` | Derived value setup (constant or factory function) |
| `WhenNode` | Side effect execution before assertions |
| `ThenNode` | Assertion predicate |

**Benefits:**

- Clean separation of scenario definition from execution
- Multiple execution strategies can interpret the same scenario
- Scenario analysis and inspection before execution
- Foundation for holistic strategies that analyze full scenarios

### 2. ExecutableScenario

The compiled, runtime-ready form of a Scenario:

```typescript
export interface ExecutableScenario<Rec extends {} = {}> {
  readonly nodes: readonly ScenarioNode<Rec>[]
  readonly quantifiers: readonly ExecutableQuantifier[]
  readonly hasExistential: boolean
  readonly searchSpaceSize: number
}

export interface ExecutableQuantifier<A = unknown> {
  readonly name: string
  readonly type: 'forall' | 'exists'
  sample(sampler: Sampler, count: number): FluentPick<A>[]
  sampleWithBias(sampler: Sampler, count: number): FluentPick<A>[]
  shrink(pick: FluentPick<A>, sampler: Sampler, count: number): FluentPick<A>[]
  isShrunken(candidate: FluentPick<A>, current: FluentPick<A>): boolean
}
```

The compilation step (`createExecutableScenario`) extracts quantifier operations from Arbitraries, creating a runtime-ready form.

### 3. Sampler

The `Sampler` interface separates value generation from execution control:

```typescript
export interface Sampler {
  sample<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[]
  sampleWithBias<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[]
  sampleUnique<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[]
  getGenerator(): () => number
}
```

**Implementations:**

| Sampler | Description |
|---------|-------------|
| `RandomSampler` | Base implementation using random generation |
| `BiasedSampler` | Decorator that prioritizes corner cases |
| `CachedSampler` | Decorator that caches samples for reuse |
| `DedupingSampler` | Decorator that ensures unique samples |

**Decorator Pattern:**

Samplers are composed using the decorator pattern:

```typescript
let sampler: Sampler = new RandomSampler({generator})
if (deduping) sampler = new DedupingSampler(sampler)
if (biased) sampler = new BiasedSampler(sampler)
if (cached) sampler = new CachedSampler(sampler)
```

### 4. Explorer

The `Explorer` interface handles search space traversal:

```typescript
export interface Explorer<Rec extends {}> {
  explore(
    scenario: ExecutableScenario<Rec> | Scenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ExplorationBudget
  ): ExplorationResult<Rec>
}

export interface ExplorationBudget {
  readonly maxTests: number
  readonly maxTime?: number
}

export type ExplorationResult<Rec extends {}> =
  | ExplorationPassed<Rec>   // All tests passed (with optional witness)
  | ExplorationFailed<Rec>   // Counterexample found
  | ExplorationExhausted     // Budget exhausted
```

**Implementations:**

| Explorer | Description |
|----------|-------------|
| `NestedLoopExplorer` | Traditional nested-loop traversal with quantifier semantics |

**Quantifier Semantics:**

The `NestedLoopExplorer` uses a policy pattern for quantifier handling:

```typescript
interface QuantifierSemantics<Rec extends {}> {
  exists(frame: QuantifierFrame<Rec>, next: TraverseNext<Rec>): TraversalOutcome<Rec>
  forall(frame: QuantifierFrame<Rec>, next: TraverseNext<Rec>): TraversalOutcome<Rec>
}
```

- `forall`: All samples must pass the property
- `exists`: At least one sample must pass the property

### 5. Shrinker

The `Shrinker` interface handles counterexample minimization:

```typescript
export interface Shrinker<Rec extends {}> {
  shrink(
    counterexample: BoundTestCase<Rec>,
    scenario: ExecutableScenario<Rec>,
    explorer: Explorer<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ShrinkBudget
  ): ShrinkResult<Rec>

  shrinkWitness(
    witness: BoundTestCase<Rec>,
    scenario: ExecutableScenario<Rec>,
    explorer: Explorer<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ShrinkBudget
  ): ShrinkResult<Rec>
}

export interface ShrinkBudget {
  readonly maxAttempts: number
  readonly maxRounds: number
}
```

**Implementations:**

| Shrinker | Description |
|----------|-------------|
| `PerArbitraryShrinker` | Shrinks each quantifier independently |
| `NoOpShrinker` | Performs no shrinking (for speed) |

**Key Feature: Nested Quantifier Re-verification**

When shrinking, the `PerArbitraryShrinker` uses the Explorer to re-verify nested quantifiers. For example, when shrinking `∀a: ∃b: P(a,b)`:

1. For candidate `a'`, build partial scenario `∃b: P(a',b)`
2. Re-explore to verify witness exists for new `a'`
3. Accept only if witness still exists

### 6. FluentStrategyFactory

The factory composes all components:

```typescript
export class FluentStrategyFactory<Rec extends StrategyBindings = StrategyBindings> {
  // Configuration
  public configuration: FluentConfig = {sampleSize: 1000}

  // Sampler flags
  private samplerConfig = {
    deduping: false,
    biased: false,
    cached: false
  }

  // Component factories
  private explorerFactory: <R>() => Explorer<R>
  private shrinkerFactory: <R>() => Shrinker<R>

  // Configuration methods
  withSampleSize(sampleSize: number): this
  withoutReplacement(): this
  withBias(): this
  usingCache(): this
  withShrinking(shrinkSize?: number): this
  withExplorer(factory: <R>() => Explorer<R>): this
  withShrinker(factory: <R>() => Shrinker<R>): this

  // Build methods
  build(): FluentStrategy<Rec>
  buildExplorer(): Explorer<Rec>
  buildShrinker(): Shrinker<Rec>
  buildShrinkBudget(): ShrinkBudget
}
```

## Execution Flow

```
User Code (FluentCheck API)
    ↓
    .forall('x', fc.integer())
    .forall('y', fc.integer())
    .then(({x, y}) => x + y === y + x)
    .check()
    ↓
────────────────────────────────────────────────────────
│ PHASE 1: AST CONSTRUCTION                            │
────────────────────────────────────────────────────────
│ buildScenario() traverses FluentCheck chain          │
│ → Creates ScenarioNode[] (quantifiers, assertions)   │
│ → Wraps in Scenario with metadata                    │
│ → Result: Immutable test specification               │
────────────────────────────────────────────────────────
│ PHASE 2: COMPILATION                                │
────────────────────────────────────────────────────────
│ createExecutableScenario(scenario)                   │
│ → Extracts quantifier methods from Arbitraries       │
│ → Compiles into ExecutableQuantifier[]               │
│ → Result: Runtime-ready form                        │
────────────────────────────────────────────────────────
│ PHASE 3: STRATEGY SETUP                             │
────────────────────────────────────────────────────────
│ FluentStrategyFactory builds components:            │
│ 1. RandomSampler (+ decorators: Dedupe, Bias, Cache)
│ 2. NestedLoopExplorer                               │
│ 3. PerArbitraryShrinker (if enabled)                │
│ → Wrapped in FluentStrategy                         │
────────────────────────────────────────────────────────
│ PHASE 4: EXPLORATION                                │
────────────────────────────────────────────────────────
│ explorer.explore(scenario, property, sampler, ...)  │
│ 1. sampler generates values for each quantifier     │
│                                                      │
│ 2. Traverse quantifier space:                       │
│    for each x in samples['x']:                      │
│      for each y in samples['y']:                    │
│        evaluate property(x, y)                      │
│                                                      │
│ 3. Result: ExplorationResult<Rec>                   │
│    - 'passed': all property evaluations succeeded   │
│    - 'failed': property failed, counterexample found│
│    - 'exhausted': budget exhausted                  │
├─────────────────────────────────────────────────────┤
│ PHASE 5: SHRINKING (if exploration failed)          │
├─────────────────────────────────────────────────────┤
│ shrinker.shrink(counterexample, scenario, explorer..│
│                                                      │
│ For each quantifier in scenario:                    │
│   1. Get shrink candidates via shrinking tree       │
│   2. Build partial scenario (bind previous as const)│
│   3. Re-explore with candidate value                │
│   4. Accept if property still fails                 │
│   5. Continue to next round if accepted             │
│                                                      │
│ Result: ShrinkResult<Rec>                           │
│   - minimized: BoundTestCase with smallest counter..│
│   - attempts: Number of candidates tested          │
│   - rounds: Number of successful shrinks            │
────────────────────────────────────────────────────────
│ PHASE 6: RESULT REPORTING                           │
────────────────────────────────────────────────────────
│ FluentResult<Rec>:                                  │
│ - satisfiable: boolean                              │
│ - example: Rec (raw values from counterexample)    │
│ - skipped: Count of skipped tests (preconditions)  │
│ - seed: RNG seed for reproducibility                │
────────────────────────────────────────────────────────
```

## Design Patterns

| Pattern | Where | Purpose |
|---------|-------|---------|
| **Decorator** | Sampler (Biased, Cached, Deduping) | Composable sampling strategies |
| **Strategy** | Explorer, Shrinker | Pluggable algorithms |
| **Factory** | FluentStrategyFactory | Configure strategy composition |
| **Policy** | QuantifierSemantics in Explorer | Different forall/exists behavior |
| **Builder** | FluentCheck | Fluent API for test construction |
| **Interpreter** | Explorer traversal | Execute Scenario AST |

## Type System

Key types that flow through the system:

```typescript
// FluentPick maintains both value and metadata for shrinking
type FluentPick<A> = {
  value: A
  original?: A
  preMapValue?: unknown
}

// BoundTestCase maps quantifier names to their FluentPick values
type BoundTestCase<Rec> = {
  [K in keyof Rec]: FluentPick<Rec[K]>
}
```

## Extensibility Points

The architecture supports extension at multiple levels:

1. **Custom Explorers**: Implement `Explorer<Rec>` for alternative traversal strategies
2. **Custom Shrinkers**: Implement `Shrinker<Rec>` for alternative minimization algorithms
3. **Custom Sampler Decorators**: Implement `Sampler` to wrap existing samplers
4. **Custom Arbitraries**: Extend `Arbitrary<A>` for domain-specific value generation

## Key Architectural Decisions

1. **Separation of Concerns**: AST layer (what to test) independent of execution (how to test)
2. **Lazy Execution**: Strategy components built at `check()` time, not during chain construction
3. **Decorator Pattern for Sampling**: Enables composable, testable sampling behaviors
4. **Explorer/Shrinker Dependency**: Shrinker uses Explorer to re-verify nested quantifiers
5. **Budget Control**: Configurable limits for both exploration and shrinking
6. **Type Safety**: Generic type parameters flow through the entire system
