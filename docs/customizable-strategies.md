# Customizable Testing Strategies

FluentCheck provides a powerful system for customizing test strategies, giving users fine-grained control over how tests are generated, executed, and evaluated.

## Design Philosophy

Different testing scenarios require different approaches to test generation and execution. FluentCheck addresses this by abstracting the testing strategy from the property definition, allowing users to:

1. **Configure test parameters**: Control iteration counts, seeds, and confidence levels
2. **Define sampling methods**: Customize how values are sampled from arbitraries
3. **Implement specialized strategies**: Create domain-specific testing approaches
4. **Reuse strategies**: Apply the same strategy across multiple tests

## Implementation Details

FluentCheck implements strategies through a flexible class hierarchy:

```typescript
export class FluentStrategy implements FluentStrategyInterface {
  public arbitraries: StrategyArbitraries = {}
  public randomGenerator = new FluentRandomGenerator()
  
  constructor(public readonly configuration: FluentConfig) {
    // Initialize configuration with defaults
    this.configuration.sampleSize = this.configuration.sampleSize ?? 1000;
    this.configuration.shrinkSize = this.configuration.shrinkSize ?? 500;
  }
  
  // Methods for manipulating arbitraries and generating values
  addArbitrary<K extends string, A>(arbitraryName: K, a: Arbitrary<A>) { /* ... */ }
  configArbitrary<K extends string>(arbitraryName: K, partial: FluentResult | undefined, depth: number) { /* ... */ }
  // ...
}
```

The `FluentStrategyInterface` defines the core operations that any strategy must implement:

```typescript
export interface FluentStrategyInterface {
  hasInput: <K extends string>(arbitraryName: K) => boolean
  getInput: <K extends string, A>(arbitraryName: K) => FluentPick<A>
  handleResult: () => void
}
```

These methods control:
- Whether more test cases should be generated
- How to generate the next test case
- What to do after a test completes

A factory pattern is used to create and configure strategies:

```typescript
export class FluentStrategyFactory {
  // Configuration methods
  withMaxIterations(iterations: number): FluentStrategyFactory { /* ... */ }
  withSeed(seed: number): FluentStrategyFactory { /* ... */ }
  withConfidence(confidence: number): FluentStrategyFactory { /* ... */ }
  // ...
  
  // Build the final strategy
  build(): FluentStrategy { /* ... */ }
}
```

The factory pattern allows for method chaining and separates the configuration from the implementation:

```typescript
// From FluentStrategyFactory.ts
export class FluentStrategyFactory {
  private iterations?: number
  private seed?: number
  private _confidence?: number
  // ...

  withMaxIterations(iterations: number): FluentStrategyFactory {
    this.iterations = iterations
    return this
  }

  withSeed(seed: number): FluentStrategyFactory {
    this.seed = seed
    return this
  }

  withConfidence(confidence: number): FluentStrategyFactory {
    this._confidence = confidence
    return this
  }

  // ...
  build(): FluentStrategy {
    return new FluentStrategy({
      sampleSize: this.iterations,
      shrinkSize: this.iterations ? Math.floor(this.iterations / 2) : undefined,
      // other configuration properties...
    })
  }
}
```

Extension points are provided through mixins:

```typescript
export const withMaxResults = 
  <TBase extends Constructor<FluentStrategyFactory>>(Base: TBase) => {
    return class extends Base {
      // Add methods to the factory
    };
  };
```

This mixin pattern allows for composable strategy extensions without complex inheritance hierarchies.

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

## Usage Examples

Basic strategy configuration:

```typescript
fc.scenario()
  .config(fc.strategy()
    .withMaxIterations(1000)
    .withSeed(42)
    .withConfidence(0.99))
  .forall('x', fc.integer())
  .then(({x}) => x * x >= 0)
  .check()
```

Creating a custom strategy for performance testing:

```typescript
const performanceStrategy = fc.strategy()
  .withMaxIterations(100)
  .withTimeout(5000)  // milliseconds
  .withPerformanceThreshold(100);  // milliseconds

fc.scenario()
  .config(performanceStrategy)
  .forall('data', fc.array(fc.integer(), 1000, 10000))
  .then(({data}) => {
    const startTime = performance.now();
    sortAlgorithm(data);
    const endTime = performance.now();
    return (endTime - startTime) < 100;  // Test performance constraint
  })
  .check()
```

## Deterministic Testing

One key benefit of customizable strategies is the ability to make tests deterministic:

```typescript
// Using a fixed seed ensures the test behaves the same way every time
const deterministicStrategy = fc.strategy()
  .withSeed(12345)
  .withMaxIterations(500);

fc.scenario()
  .config(deterministicStrategy)
  // ...
```

This is particularly valuable for:
- Reproducing test failures
- Ensuring consistent test behavior across environments
- Debugging property tests

## Built-in Strategy Builders

FluentCheck includes several built-in strategy factories for common use cases:

1. **Default strategy**: Balanced approach for general testing
2. **Thorough strategy**: Extensive testing with high iteration counts
3. **Quick strategy**: Fast feedback with fewer iterations
4. **Statistical strategy**: Runs until a specified confidence level is achieved

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