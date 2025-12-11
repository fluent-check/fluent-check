# Customizable Testing Strategies

FluentCheck provides a powerful system for customizing test strategies, giving users fine-grained control over how tests are generated, executed, and evaluated.

## Design Philosophy

Different testing scenarios require different approaches to test generation and execution. FluentCheck addresses this by abstracting the testing strategy from the property definition, allowing users to:

1. **Configure test parameters**: Control iteration counts, seeds, and confidence levels
2. **Define sampling methods**: Customize how values are sampled from arbitraries
3. **Implement specialized strategies**: Create domain-specific testing approaches
4. **Reuse strategies**: Apply the same strategy across multiple tests

## Architecture Overview

FluentCheck's strategy system is built on a modular, component-based architecture that separates concerns into distinct layers:

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
┌───────▼────────┐  ┌──────────▼────────┐  ┌────────▼─────────┐
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
```

## Core Components

### Sampler Interface

The `Sampler` interface separates value generation from execution control, enabling composable sampling strategies through the decorator pattern:

```typescript
export interface Sampler {
  sample<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[]
  sampleWithBias<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[]
  sampleUnique<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[]
  getGenerator(): () => number
}
```

**Base Implementation:**

```typescript
export class RandomSampler implements Sampler {
  constructor(config: SamplerConfig = {}) {
    this.generator = resolveGenerator(config)
  }

  sample<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return arbitrary.sample(count, this.generator)
  }

  sampleWithBias<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return arbitrary.sampleWithBias(count, this.generator)
  }

  sampleUnique<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return arbitrary.sampleUnique(count, [], this.generator)
  }
}
```

**Sampler Decorators:**

FluentCheck uses the decorator pattern to compose sampling behaviors:

```typescript
// Bias toward corner cases
export class BiasedSampler implements Sampler {
  constructor(private readonly baseSampler: Sampler) {}

  sample<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return this.baseSampler.sampleWithBias(arbitrary, count)
  }
  // ...
}

// Cache samples for reuse
export class CachedSampler implements Sampler {
  private readonly cache = new Map<Arbitrary<unknown>, FluentPick<unknown>[]>()
  constructor(private readonly baseSampler: Sampler) {}
  // ...
}

// Ensure unique samples
export class DedupingSampler implements Sampler {
  constructor(private readonly baseSampler: Sampler) {}

  sample<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return this.baseSampler.sampleUnique(arbitrary, count)
  }
  // ...
}
```

### Explorer Interface

The `Explorer` interface handles search space traversal with pluggable quantifier semantics:

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
  | ExplorationPassed<Rec>
  | ExplorationFailed<Rec>
  | ExplorationExhausted
```

**NestedLoopExplorer** implements the traditional property testing approach:

```typescript
export class NestedLoopExplorer<Rec extends {}> extends AbstractExplorer<Rec> {
  protected quantifierSemantics(): QuantifierSemantics<Rec> {
    return new NestedLoopSemantics<Rec>()
  }
}
```

### Shrinker Interface

The `Shrinker` interface handles counterexample minimization, with the Explorer dependency allowing re-verification of nested quantifiers:

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

**Available Shrinkers:**

- `PerArbitraryShrinker`: Shrinks each quantifier's value independently (default when enabled)
- `NoOpShrinker`: Performs no shrinking (for faster execution)

### Scenario AST

The `Scenario` type represents an immutable AST of a property test:

```typescript
export interface Scenario<Rec extends {} = {}> {
  readonly nodes: readonly ScenarioNode<Rec>[]
  readonly quantifiers: readonly QuantifierNode[]
  readonly hasExistential: boolean
  readonly searchSpaceSize: number
}

export type ScenarioNode<Rec extends {} = {}> =
  | QuantifierNode       // forall or exists
  | GivenNode<Rec>       // derived values
  | WhenNode<Rec>        // side effects
  | ThenNode<Rec>        // assertions
```

**ExecutableScenario** is the compiled, runtime-ready form:

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

## Factory Pattern

The `FluentStrategyFactory` composes all components:

```typescript
export class FluentStrategyFactory<Rec extends StrategyBindings = StrategyBindings> {
  public configuration: FluentConfig = {sampleSize: 1000}

  // Sampler configuration
  private samplerConfig = {
    deduping: false,
    biased: false,
    cached: false
  }

  // Component factories
  private explorerFactory: <R>() => Explorer<R> = () => new NestedLoopExplorer()
  private shrinkerFactory: <R>() => Shrinker<R> = () => new NoOpShrinker()

  withSampleSize(sampleSize: number) { /* ... */ }
  withoutReplacement() { this.samplerConfig.deduping = true; return this }
  withBias() { this.samplerConfig.biased = true; return this }
  usingCache() { this.samplerConfig.cached = true; return this }

  withShrinking(shrinkSize = 500) {
    this.configuration = {...this.configuration, shrinkSize}
    this.enableShrinking = true
    this.shrinkerFactory = () => new PerArbitraryShrinker()
    return this
  }

  withExplorer(factory: <R>() => Explorer<R>) {
    this.explorerFactory = factory
    return this
  }

  withShrinker(factory: <R>() => Shrinker<R>) {
    this.shrinkerFactory = factory
    this.enableShrinking = true
    return this
  }

  defaultStrategy() {
    this.samplerConfig = { deduping: true, biased: true, cached: true }
    this.withPerArbitraryShrinking(500)
    return this
  }

  // Build composed sampler using decorator pattern
  private buildSampler(randomGenerator: FluentRandomGenerator): Sampler {
    let sampler: Sampler = new RandomSampler({generator: randomGenerator.generator})
    if (this.samplerConfig.deduping) sampler = new DedupingSampler(sampler)
    if (this.samplerConfig.biased) sampler = new BiasedSampler(sampler)
    if (this.samplerConfig.cached) sampler = new CachedSampler(sampler)
    return sampler
  }

  build(): FluentStrategy<Rec> { /* ... */ }
  buildExplorer(): Explorer<Rec> { return this.explorerFactory() }
  buildShrinker(): Shrinker<Rec> { return this.shrinkerFactory() }
}
```

## Random Number Generation

FluentCheck allows customization of the random number generator used for sampling:

```typescript
export class FluentRandomGenerator {
  public seed: number
  private prng: () => number

  constructor(
    rngBuilder: (seed: number) => (() => number) = defaultGenerator,
    seed?: number) {
    this.seed = seed ?? this.getRandomSeed()
    this.prng = rngBuilder(this.seed)
  }

  get generator(): () => number {
    return this.prng
  }
}
```

This allows users to:
- Use a deterministic seed for reproducibility
- Provide a custom random number generator
- Control the distribution of random values

## Lazy Strategy Execution

Strategies are configured at the **scenario level**, but components are created lazily when the scenario is executed via `.check()` or `.assert()`.

### Execution Flow

1. **Builder Phase** - constructing a description of the scenario:
   - Quantifiers (`name`, `Arbitrary<A>`, kind)
   - Givens / whens / assertions
   - Configuration (`config`, `withGenerator`)

2. **Execution Phase** - when `check()` is called:
   - Resolve execution configuration (last `strategyFactory`, RNG settings)
   - Build concrete instances:
     - `Sampler` with configured decorators
     - `Explorer` for search space traversal
     - `Shrinker` for counterexample minimization
   - Compile `Scenario` AST into `ExecutableScenario`
   - Execute exploration and shrinking

### Key Benefits

- **Separation of concerns**: Scenario definition is decoupled from execution
- **Single source of truth**: Strategy components share the same RNG instance
- **Flexibility**: Multiple execution strategies can interpret the same scenario

## Strategy Presets

FluentCheck provides pre-configured strategy presets for common testing scenarios. These presets simplify strategy configuration by offering sensible defaults while maintaining access to full customization.

### Available Presets

```typescript
import * as fc from 'fluent-check';

// Default - balanced speed and coverage (recommended for most tests)
fc.scenario()
  .config(fc.strategies.default)
  .forall('x', fc.integer())
  .then(({x}) => x + 0 === x)
  .check();

// Fast - quick feedback during development
fc.prop(fc.integer(), x => x >= 0)
  .config(fc.strategies.fast)
  .assert();

// Thorough - comprehensive coverage for critical code
fc.scenario()
  .config(fc.strategies.thorough)
  .forall('list', fc.array(fc.integer()))
  .then(({list}) => isSorted(sort(list)))
  .check();

// Minimal - for debugging with only 10 samples
fc.prop(fc.integer(), x => x + 0 === x)
  .config(fc.strategies.minimal)
  .assert();
```

### Preset Comparison

| Preset | Sample Size | Random | Dedup | Bias | Cache | Shrink | Use Case |
|--------|-------------|--------|-------|------|-------|--------|----------|
| `default` | 1000 | ✅ | ✅ | ✅ | ✅ | ✅ | General-purpose testing, CI pipelines |
| `fast` | 1000 | ✅ | ❌ | ❌ | ❌ | ❌ | Quick iteration during development |
| `thorough` | 1000 | ✅ | ✅ | ❌ | ✅ | ✅ | Critical code paths, pre-release testing |
| `minimal` | 10 | ✅ | ❌ | ❌ | ❌ | ❌ | Debugging, test setup verification |

### Customizing Presets

Presets return `FluentStrategyFactory` instances, allowing further customization:

```typescript
// Start with a preset, then customize
fc.scenario()
  .config(fc.strategies.thorough.withSampleSize(5000))
  .forall('x', fc.integer())
  .then(({x}) => x + 0 === x)
  .check();

// Add shrinking to the fast preset
fc.scenario()
  .config(fc.strategies.fast.withShrinking())
  .forall('x', fc.integer())
  .then(({x}) => x > 0)
  .check();
```

### When to Use Each Preset

- **`strategies.default`**: Use for most tests. Good balance of speed and coverage with all features enabled.
- **`strategies.fast`**: Use during development for quick feedback. Sacrifices coverage for speed.
- **`strategies.thorough`**: Use for critical code paths where finding minimal counterexamples matters.
- **`strategies.minimal`**: Use for debugging test setup or quickly verifying a property works.

## Usage Examples

Basic strategy configuration using the factory:

```typescript
// Create a custom strategy using the factory
const strategy = new FluentStrategyFactory()
  .withSampleSize(500)
  .withBias()
  .withShrinking(200)
  .withoutReplacement()
  .withRandomSampling()
  .usingCache()

fc.scenario()
  .config(strategy)
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()
```

Using the default strategy (recommended for most cases):

```typescript
// The default strategy includes all mixins: Random, Dedupable, Biased, Cached, Shrinkable
const strategy = new FluentStrategyFactory()
  .defaultStrategy()

fc.scenario()
  .config(strategy)
  .forall('a', fc.integer(-10, 10))
  .forall('b', fc.integer(-10, 10))
  .then(({a, b}) => a + b === b + a)
  .check()
```

Minimal strategy for simple tests:

```typescript
// Just random sampling without other features
const minimalStrategy = new FluentStrategyFactory()
  .withSampleSize(100)
  .withRandomSampling()

fc.scenario()
  .config(minimalStrategy)
  .forall('x', fc.boolean())
  .then(({x}) => x === true || x === false)
  .check()
```

## Deterministic Testing

FluentCheck allows using custom random number generators for deterministic testing:

```typescript
// Using withGenerator for reproducible tests
fc.scenario()
  .withGenerator((seed) => {
    // Custom PRNG - this example uses a simple LCG
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }, 12345)  // Fixed seed
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()
```

The `FluentRandomGenerator` class handles random number generation:

```typescript
export class FluentRandomGenerator {
  public seed: number
  private prng: () => number

  constructor(
    rngBuilder: (seed: number) => (() => number) = defaultGenerator,
    seed?: number) {
    this.seed = seed ?? this.getRandomSeed()
    this.prng = rngBuilder(this.seed)
  }
}
```

This is particularly valuable for:
- Reproducing test failures using the seed reported in results
- Ensuring consistent test behavior across environments
- Debugging property tests

## Available Configuration Options

FluentCheck provides these composable strategy configurations:

### Sampler Decorators

| Decorator | Method | Description |
|-----------|--------|-------------|
| **DedupingSampler** | `withoutReplacement()` | Avoids testing duplicate values |
| **BiasedSampler** | `withBias()` | Prioritizes corner cases in sampling |
| **CachedSampler** | `usingCache()` | Caches generated samples for reuse |

### Explorer Options

| Explorer | Method | Description |
|----------|--------|-------------|
| **NestedLoopExplorer** | `withNestedExploration()` | Traditional nested-loop traversal (default) |
| Custom | `withExplorer(factory)` | Plug in custom exploration strategy |

### Shrinker Options

| Shrinker | Method | Description |
|----------|--------|-------------|
| **PerArbitraryShrinker** | `withShrinking(n)` | Shrinks each quantifier independently |
| **NoOpShrinker** | `withoutShrinking()` | Disables shrinking for speed |
| Custom | `withShrinker(factory)` | Plug in custom shrinking strategy |

The **default strategy** combines deduping, biased sampling, caching, and per-arbitrary shrinking.

## Advanced Strategy Features

FluentCheck's modular strategy system enables:

1. **Pluggable exploration**: Replace the default `NestedLoopExplorer` with custom exploration strategies
2. **Custom shrinking**: Implement alternative shrinking algorithms (e.g., delta debugging)
3. **Quantifier semantics**: The `QuantifierSemantics` policy pattern allows different handling of `forall`/`exists`
4. **Budget control**: Configure test limits (`maxTests`) and time limits (`maxTime`) for exploration
5. **Custom generators**: Support alternative random number generators for specialized distributions

## Custom Component Implementation

### Custom Explorer

Implement the `Explorer` interface to create custom exploration strategies:

```typescript
export class MyCustomExplorer<Rec extends {}> implements Explorer<Rec> {
  explore(
    scenario: ExecutableScenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ExplorationBudget
  ): ExplorationResult<Rec> {
    // Custom exploration logic
    // Use sampler to generate values from quantifiers
    // Return ExplorationPassed, ExplorationFailed, or ExplorationExhausted
  }
}

// Use with factory
const strategy = new FluentStrategyFactory()
  .withExplorer(() => new MyCustomExplorer())
  .build()
```

### Custom Shrinker

Implement the `Shrinker` interface to create custom shrinking strategies:

```typescript
export class MyCustomShrinker<Rec extends {}> implements Shrinker<Rec> {
  shrink(
    counterexample: BoundTestCase<Rec>,
    scenario: ExecutableScenario<Rec>,
    explorer: Explorer<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ShrinkBudget
  ): ShrinkResult<Rec> {
    // Custom shrinking logic
    // Use explorer to re-verify nested quantifiers
    // Return ShrinkResult with minimized counterexample
  }

  shrinkWitness(/* ... */): ShrinkResult<Rec> {
    // Shrink witnesses for existential quantifiers
  }
}

// Use with factory
const strategy = new FluentStrategyFactory()
  .withShrinker(() => new MyCustomShrinker())
  .build()
```

### Custom Sampler Decorator

Create a new sampler decorator by implementing the `Sampler` interface:

```typescript
export class MyCustomSampler implements Sampler {
  constructor(private readonly baseSampler: Sampler) {}

  sample<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    // Custom sampling logic
    // Can delegate to baseSampler and modify results
    return this.baseSampler.sample(arbitrary, count)
  }

  sampleWithBias<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return this.baseSampler.sampleWithBias(arbitrary, count)
  }

  sampleUnique<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[] {
    return this.baseSampler.sampleUnique(arbitrary, count)
  }

  getGenerator(): () => number {
    return this.baseSampler.getGenerator()
  }
}
```

## Comparison with Other Frameworks

FluentCheck's component-based architecture provides advantages over monolithic strategy systems:

| Feature | FluentCheck | Other Frameworks |
|---------|-------------|------------------|
| **Sampling** | Composable decorators | Often fixed algorithms |
| **Exploration** | Pluggable `Explorer` interface | Usually hard-coded |
| **Shrinking** | Separate `Shrinker` with Explorer re-verification | Often coupled to generation |
| **Scenario AST** | Immutable, inspectable structure | Usually hidden implementation |
| **Quantifiers** | First-class `forall`/`exists` with nested semantics | Often limited to single quantifier |

This separation of concerns enables:
- Independent testing of each component
- Easy addition of new exploration or shrinking algorithms
- Holistic scenario analysis before execution
- Clear responsibility boundaries
