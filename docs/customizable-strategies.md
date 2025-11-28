# Customizable Testing Strategies

FluentCheck provides a powerful system for customizing test strategies, giving users fine-grained control over how tests are generated, executed, and evaluated.

## Design Philosophy

Different testing scenarios require different approaches to test generation and execution. FluentCheck addresses this by abstracting the testing strategy from the property definition, allowing users to:

1. **Configure test parameters**: Control iteration counts, seeds, and confidence levels
2. **Define sampling methods**: Customize how values are sampled from arbitraries
3. **Implement specialized strategies**: Create domain-specific testing approaches
4. **Reuse strategies**: Apply the same strategy across multiple tests

## Implementation Details

FluentCheck implements strategies through a flexible class hierarchy with mixin-based composition:

### Base Strategy

```typescript
export type FluentConfig = { sampleSize?: number, shrinkSize?: number }

export interface FluentStrategyInterface {
  hasInput: <K extends string>(arbitraryName: K) => boolean
  getInput: <K extends string, A>(arbitraryName: K) => FluentPick<A>
  handleResult: () => void
}

export class FluentStrategy implements FluentStrategyInterface {
  public arbitraries: StrategyArbitraries = {}
  public randomGenerator = new FluentRandomGenerator()
  
  constructor(public readonly configuration: FluentConfig) {
    this.configuration.sampleSize = this.configuration.sampleSize ?? 1000;
    this.configuration.shrinkSize = this.configuration.shrinkSize ?? 500;
  }
  
  addArbitrary<K extends string, A>(arbitraryName: K, a: Arbitrary<A>) {
    this.arbitraries[arbitraryName] = {arbitrary: a, pickNum: 0, collection: []}
    this.setArbitraryCache(arbitraryName)
  }

  configArbitrary<K extends string>(arbitraryName: K, partial: FluentResult | undefined, depth: number) {
    // Configure arbitrary for testing, including shrinking on subsequent iterations
  }

  buildArbitraryCollection<A>(arbitrary: Arbitrary<A>, sampleSize?: number): FluentPick<A>[]
  isDedupable(): boolean { return false }
  setArbitraryCache<K extends string>(_arbitraryName: K) {}
  shrink<K extends string>(_name: K, _partial: FluentResult | undefined) {}
}
```

### Mixin-Based Composition

FluentCheck uses TypeScript mixins to compose strategy behaviors:

```typescript
// Random sampling mixin
export function Random<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base implements FluentStrategyInterface {
    hasInput<K extends string>(arbitraryName: K): boolean {
      return this.arbitraries[arbitraryName] !== undefined &&
        this.arbitraries[arbitraryName].pickNum < this.arbitraries[arbitraryName].collection.length
    }

    getInput<K extends string, A>(arbitraryName: K): FluentPick<A> {
      return this.arbitraries[arbitraryName].collection[this.arbitraries[arbitraryName].pickNum++]
    }

    handleResult() {}
  }
}

// Shrinking mixin
export function Shrinkable<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    shrink<K extends string>(arbitraryName: K, partial: FluentResult) {
      const shrinkedArbitrary = this.arbitraries[arbitraryName].arbitrary.shrink(partial.example[arbitraryName])
      this.arbitraries[arbitraryName].collection = this.buildArbitraryCollection(shrinkedArbitrary,
        this.configuration.shrinkSize!)
    }
  }
}

// Deduplication mixin
export function Dedupable<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    isDedupable() { return true }
  }
}

// Caching mixin
export function Cached<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    setArbitraryCache<K extends string>(arbitraryName: K) {
      this.arbitraries[arbitraryName].cache = this.buildArbitraryCollection(this.arbitraries[arbitraryName].arbitrary)
    }
  }
}

// Biased sampling mixin
export function Biased<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    buildArbitraryCollection<A>(arbitrary: Arbitrary<A>, sampleSize?: number): FluentPick<A>[] {
      return this.isDedupable() ? 
        arbitrary.sampleUniqueWithBias(sampleSize!, this.randomGenerator.generator) :
        arbitrary.sampleWithBias(sampleSize!, this.randomGenerator.generator)
    }
  }
}
```

### Factory Pattern

The factory composes these mixins to build strategies:

```typescript
export class FluentStrategyFactory {
  private strategy: new (config: FluentConfig) => FluentStrategy = FluentStrategy
  public configuration: FluentConfig = {sampleSize: 1000}

  withSampleSize(sampleSize: number) {
    this.configuration = {...this.configuration, sampleSize}
    return this
  }

  withoutReplacement() {
    this.strategy = Dedupable(this.strategy)
    return this
  }

  withBias() {
    this.strategy = Biased(this.strategy)
    return this
  }

  usingCache() {
    this.strategy = Cached(this.strategy)
    return this
  }

  withRandomSampling() {
    this.strategy = Random(this.strategy)
    return this
  }

  withShrinking(shrinkSize = 500) {
    this.configuration = {...this.configuration, shrinkSize}
    this.strategy = Shrinkable(this.strategy)
    return this
  }

  defaultStrategy() {
    this.configuration = {...this.configuration, shrinkSize: 500}
    this.strategy = Shrinkable(Cached(Biased(Dedupable(Random(this.strategy)))))
    return this
  }

  build(): FluentStrategy {
    return new this.strategy(this.configuration)
  }
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

  initialize() {
    this.prng = defaultGenerator(this.seed)
  }

  get generator(): () => number {
    return this.prng
  }

  private getRandomSeed(): number {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
  }
}
```

This allows users to:
- Use a deterministic seed for reproducibility
- Provide a custom random number generator
- Control the distribution of random values

## Strategy Integration with FluentCheck

Strategies are integrated directly into the FluentCheck main class:

```typescript
export class FluentCheck<Rec extends ParentRec, ParentRec extends {}> {
  constructor(
    public strategy: FluentStrategy = new FluentStrategyFactory().defaultStrategy().build(),
    protected readonly parent: FluentCheck<ParentRec, any> | undefined = undefined) {
    // ...
  }

  config(strategy: FluentStrategyFactory) {
    this.strategy = strategy.build()
    return this
  }
  
  // ...
}
```

This allows strategies to be configured at the scenario level.

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

## Available Strategy Mixins

FluentCheck provides these composable strategy mixins:

| Mixin | Method | Description |
|-------|--------|-------------|
| **Random** | `withRandomSampling()` | Basic random sampling from arbitraries |
| **Dedupable** | `withoutReplacement()` | Avoids testing duplicate values |
| **Biased** | `withBias()` | Prioritizes corner cases in sampling |
| **Cached** | `usingCache()` | Caches generated samples for reuse |
| **Shrinkable** | `withShrinking(n)` | Enables shrinking with configurable sample size |

The **default strategy** combines all these mixins for comprehensive testing.

## Advanced Strategy Features

FluentCheck's strategy system includes:

1. **Adaptive sampling**: Focusing on more promising or problematic regions of the input space
2. **Coverage-guided testing**: Adjusting strategies based on code coverage
3. **Parallel execution**: Distributing test execution across multiple threads
4. **Custom generators**: Supporting alternative random number generators

## Custom Strategy Implementation

Users can create entirely custom strategies by implementing the `FluentStrategyInterface` or extending existing strategies:

```typescript
class MyCustomStrategy extends FluentStrategy {
  hasInput<K extends string>(arbitraryName: K): boolean {
    // Custom logic for determining when to stop generating test cases
    return this.customStoppingCondition();
  }

  getInput<K extends string, A>(arbitraryName: K): FluentPick<A> {
    // Custom logic for generating test cases
    return this.customGenerationLogic(arbitraryName);
  }

  handleResult() {
    // Custom logic for processing test results
    this.customResultHandling();
  }
}
```

## Comparison with Other Frameworks

While most property testing frameworks offer basic configuration options, FluentCheck's strategy system provides a more comprehensive and extensible approach to test strategy customization, allowing for domain-specific testing approaches and sophisticated test generation algorithms. 

For example, while FastCheck allows setting maximum test count and seed, FluentCheck's strategies can implement complex decision logic about:
- When to stop testing
- How to prioritize different parts of the input space
- How to adapt testing based on previous results 