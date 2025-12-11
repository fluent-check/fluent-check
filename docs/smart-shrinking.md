# Smart Shrinking Capabilities

FluentCheck implements an advanced shrinking system that finds simpler counterexamples when a property test fails, making debugging easier and more efficient.

## Design Philosophy

When a property test fails, the initial counterexample is often complex and contains irrelevant details. Shrinking aims to find the simplest possible counterexample that still fails the property. FluentCheck's shrinking system is:

1. **Type-aware**: Shrinking respects the type structure of values
2. **Composable**: Shrinking works across composed arbitraries
3. **Customizable**: Users can implement custom shrinking logic
4. **Nested quantifier aware**: Re-verifies nested existential/universal quantifiers during shrinking
5. **Budget-controlled**: Configurable limits on shrinking attempts and rounds

## Architecture Overview

FluentCheck separates shrinking into two layers:

1. **Arbitrary-level shrinking**: Each `Arbitrary<A>` implements a `shrink` method that returns candidate values
2. **Strategy-level shrinking**: The `Shrinker` interface orchestrates the shrinking process across quantifiers

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHRINKER INTERFACE                           │
│  - Orchestrates shrinking across quantifiers                    │
│  - Re-verifies nested quantifiers using Explorer                │
│  - Budget control (maxAttempts, maxRounds)                      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                 EXECUTABLE QUANTIFIER                           │
│  - shrink(pick, sampler, count) → FluentPick<A>[]               │
│  - isShrunken(candidate, current) → boolean                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                    ARBITRARY.shrink()                           │
│  - Returns new Arbitrary with simpler values                    │
│  - Type-specific shrinking strategies                           │
└─────────────────────────────────────────────────────────────────┘
```

## Shrinker Interface

The `Shrinker` interface handles counterexample and witness minimization:

```typescript
export interface Shrinker<Rec extends {}> {
  /**
   * Shrinks a counterexample to a minimal form.
   * Finds smaller values that still FAIL the property.
   */
  shrink(
    counterexample: BoundTestCase<Rec>,
    scenario: ExecutableScenario<Rec>,
    explorer: Explorer<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ShrinkBudget
  ): ShrinkResult<Rec>

  /**
   * Shrinks a witness to a minimal form.
   * Finds smaller values that still PASS the property.
   */
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
  readonly maxAttempts: number  // Max shrink candidates to test
  readonly maxRounds: number    // Max successful shrink rounds
}

export interface ShrinkResult<Rec extends {}> {
  readonly minimized: BoundTestCase<Rec>
  readonly attempts: number
  readonly rounds: number
}
```

## Available Shrinkers

### PerArbitraryShrinker

The default shrinker that shrinks each quantifier's value independently:

```typescript
export class PerArbitraryShrinker<Rec extends {}> implements Shrinker<Rec> {
  shrink(counterexample, scenario, explorer, property, sampler, budget) {
    // For each quantifier:
    //   1. Get shrink candidates via quantifier.shrink()
    //   2. Build partial scenario (bind previous quantifiers to constants)
    //   3. Re-explore with candidate value (via explorer)
    //   4. Accept if property still fails
    //   5. Continue until no smaller value found or budget exhausted
  }
}
```

### NoOpShrinker

A no-op shrinker for faster test execution when shrinking is not needed:

```typescript
export class NoOpShrinker<Rec extends {}> implements Shrinker<Rec> {
  shrink(counterexample, ...) {
    return { minimized: counterexample, attempts: 0, rounds: 0 }
  }
}
```

## Arbitrary-Level Shrinking

Each arbitrary type implements its own shrinking strategy via the `shrink` method:

```typescript
export abstract class Arbitrary<A> {
  /**
   * Returns a new arbitrary with simpler cases to be tested.
   */
  shrink<B extends A>(_initial: FluentPick<B>): Arbitrary<A> {
    return NoArbitrary
  }
}
```

**Shrinking strategies by type:**

1. **Numbers**: Shrink toward 0 or other "simple" values
2. **Strings**: Shrink by reducing length or complexity
3. **Arrays**: Shrink by removing elements or shrinking individual elements
4. **Tuples**: Shrink each element while maintaining the structure

Tests show that shrinking works for complex, composed arbitraries:

```typescript
it('should allow shrinking of mapped arbitraries', () => {
  expect(fc.scenario()
    .exists('n', fc.integer(0, 25).map(x => x + 25).map(x => x * 2))
    .forall('a', fc.integer(0, 10))
    .then(({n, a}) => a <= n)
    .check()
  ).to.deep.include({satisfiable: true, example: {n: 50}})
})

it('should allow shrinking of mapped tupples', () => {
  expect(fc.scenario()
    .exists('point', fc.tuple(
      fc.integer(50, 1000).filter(x => x > 100),
      fc.string(1, 10, fc.char('a')).filter(x => x.length > 2))
      .map(([a, b]) => [a * 2, '_'.concat(b)]))
    .check())
    .to.deep.include({satisfiable: true, example: {point: [202, '_aaa']}})
})
```

The shrinking process is guided by the observation that failing counterexamples often form connected regions in the input space. This allows FluentCheck to perform a binary search-like process to find the "boundary" of the failing region.

## Maintaining Invariants During Shrinking

An important aspect of FluentCheck's shrinking is that it maintains invariants established by filters:

```typescript
it('filters should exclude corner cases, even after shrinking', () => {
  expect(fc.scenario()
    .exists('a', fc.integer(-20, 20).filter(a => a !== 0))
    .then(({a}) => a % 11 === 0 && a !== 11 && a !== -11)
    .check()
  ).to.have.property('satisfiable', false)
})
```

Here, even after shrinking, the constraint `a !== 0` is preserved, preventing the shrinking process from producing invalid test cases.

## Practical Applications

Smart shrinking is particularly valuable for:

1. **Complex data structures**: Finding minimal examples of failing nested structures
2. **Edge cases**: Identifying boundary conditions that cause failures
3. **Regression testing**: Documenting the simplest case that fails
4. **Bug reporting**: Providing concise examples for bug reports

## Usage Example

```typescript
// This property will fail for arrays with more than 10 elements
const result = fc.scenario()
  .forall('arr', fc.array(fc.integer()))
  .then(({arr}) => arr.length <= 10)
  .check();

// The shrunk counterexample will likely be an array of exactly 11 elements,
// with each element being the simplest possible value (often 0)
console.log(result.example.arr);  // Something like [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
```

## Size Reduction During Shrinking

The shrinking process can significantly reduce the size of the counterexample:

```typescript
// From arbitrary.test.ts
it('should return the correct size of shrinked integer arbitraries', () => {
  expect(fc.integer(0, 10).shrink({value: 5}).size()).to.have.property('value', 5)
})
```

This test shows that when shrinking from a value of 5, the resulting arbitrary has a size of 5 (representing values 0 through 4), which is exactly what we'd expect - all values less than the original failure point.

## Nested Quantifier Re-verification

A key feature of FluentCheck's shrinking is its handling of nested quantifiers. When shrinking a counterexample for a scenario like `∀a: ∃b: P(a,b)`:

1. When shrinking `a` to candidate `a'`:
   - Build a partial scenario with `∃b: P(a',b)`
   - Re-explore to verify a witness exists for new `a'`
   - Accept only if the witness still exists

This is implemented via the `buildPartialExecutableScenario` helper:

```typescript
// Build partial scenario where earlier quantifiers are bound to constants
const partialScenario = buildPartialExecutableScenario(scenario, quantifier.name, testCase)

// Re-explore with the Explorer to verify nested quantifiers
const result = explorer.explore(partialScenario, property, sampler, {
  maxTests: Math.min(100, budget.maxAttempts - attempts)
})
```

## Budget Control

Shrinking is controlled by configurable budgets:

```typescript
export interface ShrinkBudget {
  readonly maxAttempts: number  // Max shrink candidates to test
  readonly maxRounds: number    // Max successful shrink rounds
}
```

Configure shrinking budget via the strategy factory:

```typescript
// Default: 500 attempts and rounds
fc.scenario()
  .config(new FluentStrategyFactory().withShrinking(500))
  .forall('x', fc.integer())
  .then(({x}) => x < 100)
  .check()

// Faster but potentially larger counterexamples
fc.scenario()
  .config(new FluentStrategyFactory().withShrinking(100))
  .forall('x', fc.integer())
  .then(({x}) => x < 100)
  .check()

// Disable shrinking entirely
fc.scenario()
  .config(new FluentStrategyFactory().withoutShrinking())
  .forall('x', fc.integer())
  .then(({x}) => x < 100)
  .check()
```

## Advanced Shrinking Features

FluentCheck's shrinking system includes:

1. **Multi-step shrinking**: Performing multiple rounds to find the simplest example
2. **Structural preservation**: Maintaining invariants during shrinking
3. **Nested quantifier re-verification**: Using the Explorer to verify nested quantifiers
4. **Shrinking with constraints**: Respecting filter preconditions during shrinking
5. **Witness shrinking**: Minimizing witnesses for existential quantifiers

This is illustrated in the handling of tuple arbitraries, where each component is shrunk while preserving the tuple structure.

## Custom Shrinker Implementation

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

  shrinkWitness(/* same parameters */): ShrinkResult<Rec> {
    // Shrink witnesses for existential quantifiers
  }
}

// Use with factory
const strategy = new FluentStrategyFactory()
  .withShrinker(() => new MyCustomShrinker())
  .build()
```

## Comparison with Other Frameworks

FluentCheck's shrinking architecture provides several advantages:

| Feature | FluentCheck | Other Frameworks |
|---------|-------------|------------------|
| **Arbitrary-level shrinking** | Composable, type-aware | Often similar |
| **Strategy-level orchestration** | Separate `Shrinker` interface | Usually coupled |
| **Nested quantifier handling** | Re-verifies via Explorer | Often unsupported |
| **Witness shrinking** | First-class support | Rarely available |
| **Budget control** | Configurable attempts/rounds | Often fixed |
| **Custom shrinkers** | Pluggable interface | Difficult to extend |

The separation between arbitrary-level shrinking and strategy-level orchestration enables independent testing, easy algorithm replacement, and proper handling of complex quantifier nesting.