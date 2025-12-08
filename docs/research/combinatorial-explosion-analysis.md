# Combinatorial Explosion in Property Testing: First Principles Analysis

## Problem Statement

When a property test has multiple `forall` quantifiers, even small arbitraries can lead to extremely long test runs. This is exacerbated by:
1. Shrinking generating unions that expand the search space
2. `exists` quantifiers creating nested search requirements
3. Recursive shrinking loops that can create feedback effects

## First Principles: Search Space Multiplication

### Basic Combinatorics

For a property with `n` independent `forall` quantifiers, each with arbitrary size `s_i`:

```
Total Search Space = s₁ × s₂ × ... × sₙ
```

**Example: 10 `forall` statements, each with size 10**
- Total combinations: 10¹⁰ = 10,000,000,000 (10 billion)
- Even with `sampleSize: 1000`, we're only testing 0.00001% of the space

### Current Implementation Behavior

**Recent Change:** The implementation now builds the strategy at `.check()` time with full scenario visibility. This is a key step toward enabling holistic optimizations.

**Strategy Construction** (`src/FluentCheck.ts:283-326`):

```typescript
check(
  child: (testCase: WrapFluentPick<any>) => FluentResult<Record<string, unknown>> = () => new FluentResult(true)
): FluentResult<Rec> {
  const path = this.pathFromRoot()
  const root = path[0] as FluentCheck<any, any>

  const {strategyFactory, rngBuilder, seed} = root.#resolveExecutionConfig(path)

  const factory: FluentStrategyFactory<Rec> =
    (strategyFactory as FluentStrategyFactory<Rec> | undefined) ??
    new FluentStrategyFactory<Rec>().defaultStrategy()
  const strategy = factory.build()

  strategy.randomGenerator = rngBuilder !== undefined
    ? new FluentRandomGenerator(rngBuilder, seed)
    : new FluentRandomGenerator()

  // Attach strategy and register quantifiers AFTER strategy is built
  for (const node of path) {
    node.strategy = strategy
    if (node instanceof FluentCheckQuantifier) {
      node.registerArbitrary()  // Deferred registration!
    }
  }

  strategy.randomGenerator.initialize()

  // Build callback chain from leaf to root
  let callback = child
  for (let i = path.length - 1; i > 0; i -= 1) {
    const node = path[i] as FluentCheck<any, any>
    const prev = callback
    callback = (testCase) => node.run(testCase as any, prev)
  }

  const r = root.run({} as any, callback)
  return new FluentResult<Rec>(...)
}
```

**Key architectural change:** Quantifiers no longer register their arbitraries in the constructor. Instead, `registerArbitrary()` is called during `check()` after the full path is known:

```typescript
// FluentCheckQuantifier (src/FluentCheck.ts:437-483)
abstract class FluentCheckQuantifier<K, A, Rec, ParentRec> extends FluentCheck<Rec, ParentRec> {
  constructor(parent, public readonly name: K, public readonly a: Arbitrary<A>) {
    super(parent)
    // Note: NO strategy.addArbitrary() here anymore!
  }

  registerArbitrary() {
    this.strategy.addArbitrary(this.name, this.a as Arbitrary<Rec[K]>)
  }
  // ...
}
```

This means the strategy now has access to all quantifiers via `pathFromRoot()` before execution begins, enabling future holistic optimizations.

**However**, the quantifier execution still uses nested loops (`src/FluentCheck.ts:452-476`):

```typescript
protected override run(
  testCase: WrapFluentPick<Rec>,
  callback: (arg: WrapFluentPick<Rec>) => FluentResult,
  partial: FluentResult | undefined = undefined,
  depth = 0,
  accumulatedSkips = 0): FluentResult {

  this.strategy.configArbitrary(this.name, partial, depth)

  let totalSkipped = accumulatedSkips

  while (this.strategy.hasInput(this.name)) {
    testCase[this.name] = this.strategy.getInput(this.name) as FluentPick<Rec[K]>
    const result = callback(testCase)
    totalSkipped += result.skipped
    if (result.satisfiable === this.breakValue) {
      result.addExample(this.name, testCase[this.name])
      return this.run(testCase, callback, result, depth + 1, totalSkipped)
    }
  }

  const finalResult = partial ?? new FluentResult(!this.breakValue)
  finalResult.skipped = totalSkipped
  return finalResult
}
```

**Current behavior:** Each `forall` still creates a nested loop. For 10 `forall` statements:
- Outer loop: 1000 samples (default `sampleSize`)
- For each sample, inner loop: 1000 samples
- For each of those, next inner loop: 1000 samples
- ... and so on

**Actual test executions:** 1000¹⁰ = 10³⁰ (if fully nested)

The strategy pre-builds each arbitrary's sample collection once at depth 0 (see `configArbitrary` in `FluentStrategy.ts:65-75`), so the nested loops reuse the same samples. This means the full 10³⁰ iterations DO occur unless the test terminates early (property fails, timeout, etc.).

## Shrinking Amplifies the Problem

### How Shrinking Creates Unions

When shrinking composite types (tuples, records), the system creates unions:

**Tuple Shrinking** (`src/arbitraries/ArbitraryTuple.ts:53-62`):
```typescript
override shrink(initial: FluentPick<A>): Arbitrary<A> {
  const value = initial.value as unknown[]
  const original = initial.original as unknown[]
  return fc.union(...this.arbitraries.map((_, selected) =>
    fc.tuple(...this.arbitraries.map((arbitrary, i) =>
      selected === i ?
        arbitrary.shrink({value: value[i], original: original[i]}) :
        fc.constant(value[i])
    )))) as Arbitrary<A>
}
```

For a tuple of 10 elements:
- Creates a union of 10 arbitraries
- Each arbitrary might itself be a union from nested shrinking
- **Result:** Union size grows multiplicatively

**Record Shrinking** (`src/arbitraries/ArbitraryRecord.ts:90-116`):
```typescript
override shrink(initial: FluentPick<UnwrapSchema<S>>): Arbitrary<UnwrapSchema<S>> {
  if (this.#keys.length === 0) return fc.empty()

  const value = initial.value as Record<string, unknown>
  const original = (initial.original ?? value) as Record<string, unknown>

  // Create a union of records where one property is shrunk at a time
  const shrunkArbitraries = this.#keys.map(selectedKey => {
    const newSchema: Record<string, Arbitrary<unknown>> = {}

    for (const key of this.#keys) {
      const arbitrary = this.getArbitrary(key)
      if (key === selectedKey) {
        newSchema[key as string] = arbitrary.shrink({
          value: value[key as string],
          original: original[key as string]
        })
      } else {
        newSchema[key as string] = fc.constant(value[key as string])
      }
    }

    return fc.record(newSchema)
  })

  return fc.union(...shrunkArbitraries) as Arbitrary<UnwrapSchema<S>>
}
```

Same pattern: one union member per property.

**Composite Shrinking** (`src/arbitraries/ArbitraryComposite.ts:63-68`):
```typescript
override shrink(initial: FluentPick<A>) {
  const filtered = this.arbitraries.filter(a => a.canGenerate(initial))
  if (filtered.length === 0) return fc.empty()
  const arbitraries = filtered.map(a => a.shrink(initial))
  return fc.union(...arbitraries)  // Union of unions!
}
```

### The Shrinking Feedback Loop

1. **Initial failure:** Property fails with counterexample `(a₁, a₂, ..., a₁₀)`
2. **Shrinking triggered:** Creates union of 10 shrunk arbitraries
3. **Union size:** Each shrunk arbitrary might have size 100-1000
4. **Total candidates:** 10 × 1000 = 10,000 candidates to test
5. **New failure found:** Triggers another shrinking round
6. **Recursive expansion:** Each round can create more unions

**Worst case:** If shrinking creates unions that themselves shrink into unions:
- Round 1: 10 candidates
- Round 2: 10 × 10 = 100 candidates  
- Round 3: 100 × 10 = 1,000 candidates
- Round 4: 1,000 × 10 = 10,000 candidates
- ...

### Size Calculation for Unions

`ArbitraryComposite.size()` (`src/arbitraries/ArbitraryComposite.ts:27-39`):
```typescript
override size(): ArbitrarySize {
  let value = 0
  let isEstimated = false

  for (const a of this.arbitraries) {
    const size = a.size()
    if (size.type === 'estimated') isEstimated = true
    value += size.value  // Sum, not product
  }

  return isEstimated ? estimatedSize(value, [value, value]) : exactSize(value)
}
```

**Key insight:** Union size is the *sum* of constituent sizes, and when used in shrinking:
- The `shrinkSize` (default 500) limits total candidates sampled from the union
- Sampling is weighted by each member's size (see `ArbitraryComposite.pick()`)
- However, if each union member is itself large, we only explore a fraction of each
- The shrunk arbitrary replaces the original, so each shrink round samples 500 new candidates

## Existential Quantifiers Make It Worse

### Nested Quantifier Semantics

For `exists` followed by `forall`:
```typescript
fc.scenario()
  .exists('a', fc.integer(0, 100))      // Must find ONE witness
  .forall('b', fc.integer(0, 100))     // Must hold for ALL b
  .then(({a, b}) => a + b === b)
```

**Semantics:** "There exists an `a` such that for all `b`, the property holds"

**Search behavior:**
1. Try `a = 0`: Test with all `b` values (1000 samples)
2. If any `b` fails, try `a = 1`: Test with all `b` values again
3. Continue until finding an `a` that works for all `b`

**Complexity:** O(|A| × |B|) where |A| and |B| are arbitrary sizes

### Multiple Existential Quantifiers

```typescript
fc.scenario()
  .exists('a', fc.integer(0, 10))
  .exists('b', fc.integer(0, 10))
  .forall('c', fc.integer(0, 10))
  .then(({a, b, c}) => ...)
```

**Semantics:** "There exist `a` and `b` such that for all `c`, the property holds"

**Search behavior:**
- Try all combinations of `(a, b)`: 10 × 10 = 100 combinations
- For each combination, test all `c`: 10 values
- **Total:** 100 × 10 = 1,000 tests minimum

With `sampleSize: 1000`:
- `exists` might try 1000 different `a` values
- For each `a`, try 1000 different `b` values  
- For each `(a, b)`, test 1000 different `c` values
- **Worst case:** 1000³ = 1 billion tests

## Real-World Examples

### Example 1: Multiple foralls via fc.prop

Consider a property with 10 arbitraries via `fc.prop()`, which internally creates 10 `forall` statements:

```typescript
// fc.prop internally chains: forall('arg0', ...).forall('arg1', ...)...
fc.prop(
  fc.integer(0, 10),
  fc.integer(0, 10),
  fc.integer(0, 10),
  fc.integer(0, 10),
  fc.integer(0, 10),
  // ... (up to 10 arbitraries, though typed overloads only support up to 5)
  (a, b, c, d, e /*, ... */) => {
    // Some property
  }
).check()
```

**Search space calculation:**
- Each arbitrary size: ~11 (0-10 inclusive)
- Total combinations: 11¹⁰ ≈ 25.9 billion
- With `sampleSize: 1000`: Testing 0.000004% of space

**If property fails and shrinking is enabled:**
- Initial counterexample: `{arg0: 5, arg1: 3, arg2: 7, ...}`
- Each forall shrinks its own integer arbitrary independently
- Each shrunk integer arbitrary has ~5 candidates (values smaller than the failure)
- Shrinking re-runs the nested loops with `shrinkSize: 500` samples per forall
- **Total shrink tests per round:** 500¹⁰ potential (limited by strategy iteration)

### Example 2: Tuple of 10 elements

```typescript
fc.scenario()
  .forall('data', fc.tuple(
    fc.integer(0, 10),
    fc.integer(0, 10),
    // ... 8 more elements
  ))
  .then(({data}) => /* property */)
  .check()
```

**If property fails with tuple shrinking:**
- Initial counterexample: `(5, 3, 7, 2, 9, 1, 4, 6, 8, 0)`
- Tuple shrinking creates union of 10 arbitraries (one per position)
- Each shrunk arbitrary might have size ~5 (smaller integers)
- Total union size: ~50 candidates
- With `shrinkSize: 500`, all candidates are tested per shrink round

## Mitigation Strategies

### 0. Holistic Strategy Approach (Recommended)

The nested loop problem occurs because each quantifier iterates through its full sample set for every iteration of outer quantifiers.

**Core Insight:** Instead of building strategy behavior incrementally as quantifiers are added, defer strategy configuration until `.check()` is called, at which point we have complete knowledge of the scenario structure.

#### ✅ IMPLEMENTED: Deferred Registration

The first step is already implemented. Quantifiers no longer register arbitraries in their constructor:

```
forall('a', arbA)  →  stores (name, arbitrary) only - NO strategy interaction
forall('b', arbB)  →  stores (name, arbitrary) only
forall('c', arbC)  →  stores (name, arbitrary) only
.check()           →  pathFromRoot() collects all nodes
                   →  strategy.build()
                   →  for each quantifier: registerArbitrary()
                   →  execution begins
```

This architectural change means the strategy now has access to all quantifiers before any samples are generated.

#### 🔲 NEXT: Holistic Planning

The next step is to add a planning phase that uses this visibility:

```
.check()           →  pathFromRoot() collects all nodes
                   →  strategy.build()
                   →  strategy.planExecution(quantifiers)  ← NEW
                   →  for each quantifier: registerArbitrary()
                   →  execution with budget-aware sampling
```

#### Key Design Elements

**1. Scenario Descriptor**

At `.check()` time, `pathFromRoot()` already collects all nodes. We can extract a scenario descriptor:

```typescript
interface QuantifierDescriptor {
  name: string
  arbitrary: Arbitrary<unknown>
  type: 'forall' | 'exists'
  estimatedSize: ArbitrarySize
}

interface ScenarioDescriptor {
  quantifiers: QuantifierDescriptor[]
  totalSearchSpace: number  // Product of all sizes
  quantifierCount: number
  hasExistential: boolean
}
```

**2. Budget-Based Planning**

Given a total test budget (e.g., 10,000 property evaluations), the holistic strategy distributes samples intelligently:

```typescript
interface ExecutionPlan {
  // Instead of nested loops, generate test cases as tuples
  testCaseSampler: () => TestCase
  totalBudget: number
  shrinkBudget: number
}

function planExecution(scenario: ScenarioDescriptor, config: FluentConfig): ExecutionPlan {
  const totalBudget = config.sampleSize ?? 1000

  // Option A: Tuple sampling - sample from cartesian product directly
  // Option B: Adaptive nesting - reduce inner sample sizes
  // Option C: Hybrid - use heuristics based on scenario structure

  if (scenario.quantifierCount > 3 && !scenario.hasExistential) {
    // For pure forall scenarios, tuple sampling is more efficient
    return tupleSamplingPlan(scenario, totalBudget)
  } else {
    // For mixed scenarios, use adaptive nesting
    return adaptiveNestingPlan(scenario, totalBudget)
  }
}
```

**3. Tuple Sampling Plan**

For scenarios with only `forall` quantifiers, convert to tuple sampling:

```typescript
function tupleSamplingPlan(scenario: ScenarioDescriptor, budget: number): ExecutionPlan {
  // Create a composite arbitrary from all quantifiers
  const tupleArbitrary = fc.tuple(
    ...scenario.quantifiers.map(q => q.arbitrary)
  )

  // Sample tuples directly - O(budget) instead of O(budget^n)
  const samples = tupleArbitrary.sampleWithBias(budget, generator)

  return {
    testCaseSampler: createSamplerFromTuples(samples, scenario.quantifiers),
    totalBudget: budget,
    shrinkBudget: Math.floor(budget / 2)
  }
}
```

**4. Adaptive Nesting Plan**

For scenarios with `exists` quantifiers (which require semantic nesting):

```typescript
function adaptiveNestingPlan(scenario: ScenarioDescriptor, budget: number): ExecutionPlan {
  // Calculate sample sizes per quantifier to stay within budget
  // Budget = s₁ × s₂ × ... × sₙ ≤ totalBudget
  // Solution: sᵢ = budget^(1/n) for uniform distribution

  const n = scenario.quantifierCount
  const samplesPerQuantifier = Math.floor(Math.pow(budget, 1/n))

  // Adjust for exists quantifiers (they may need more samples to find witness)
  const adjustedSamples = scenario.quantifiers.map(q =>
    q.type === 'exists'
      ? Math.min(q.estimatedSize.value, samplesPerQuantifier * 2)
      : samplesPerQuantifier
  )

  return {
    sampleSizes: adjustedSamples,
    totalBudget: budget,
    shrinkBudget: Math.floor(budget / 2)
  }
}
```

**5. Implementation Hooks**

The holistic approach requires minimal changes to the existing architecture:

```typescript
// In FluentCheck.check()
check(child: ...) {
  if (this.parent !== undefined) {
    return this.parent.check(testCase => this.run(testCase, child))
  } else {
    // NEW: Build scenario descriptor before execution
    const scenario = this.buildScenarioDescriptor()

    // NEW: Let strategy plan based on full scenario
    this.strategy.planExecution(scenario)

    this.strategy.randomGenerator.initialize()
    const r = this.run({} as Rec, child)
    return new FluentResult<Rec>(...)
  }
}

// New method to extract scenario structure
private buildScenarioDescriptor(): ScenarioDescriptor {
  const path = this.pathFromRoot()
  const quantifiers = path
    .filter(node => node instanceof FluentCheckQuantifier)
    .map(node => ({
      name: node.name,
      arbitrary: node.a,
      type: node instanceof FluentCheckUniversal ? 'forall' : 'exists',
      estimatedSize: node.a.size()
    }))

  return {
    quantifiers,
    totalSearchSpace: quantifiers.reduce((acc, q) => acc * q.estimatedSize.value, 1),
    quantifierCount: quantifiers.length,
    hasExistential: quantifiers.some(q => q.type === 'exists')
  }
}
```

**6. Benefits of Holistic Approach**

| Aspect | Current (Per-Arbitrary) | Holistic |
|--------|------------------------|----------|
| Sample count | Fixed per quantifier | Budget-distributed |
| Complexity | O(sampleSize^n) | O(budget) for pure forall |
| Awareness | None | Full scenario visibility |
| Adaptability | None | Can choose optimal strategy |
| Shrinking | Per-arbitrary | Can coordinate across quantifiers |

**7. Shrinking with Holistic Awareness**

Shrinking interacts subtly with the holistic approach. There's a semantic tension:

| Approach | Discovery Semantics | Shrinking Goal |
|----------|---------------------|----------------|
| Nested foralls | "∀a ∀b ∀c: property holds" | Find minimal `a` such that ∀b,c property fails |
| Tuple sampling | "For sampled (a,b,c)" | Find minimal tuple that fails |

**The Problem:** With tuple sampling, we find ONE failing `(a,b,c)`. But we don't know if `a` alone "causes" the failure, or if it's the specific combination. Shrinking `a` to `a'` requires verifying the property still fails - but for which `b,c`?

**Solution: Two-Phase Shrinking**

```typescript
interface HolisticConfig {
  discoveryBudget: number   // For finding counterexample (default: 1000)
  shrinkBudget: number      // For minimizing counterexample (default: 500)
  shrinkRounds: number      // Max shrink iterations (default: 10)
}
```

**Phase 1 - Discovery:** Use tuple sampling to find ANY counterexample in O(budget) time.

**Phase 2 - Shrinking:** Switch to bounded nested verification:

```typescript
function shrinkWithSemantics(
  counterexample: TestCase,
  scenario: ScenarioDescriptor,
  config: HolisticConfig
): TestCase {
  const n = scenario.quantifierCount
  // Key: distribute shrink budget across quantifiers
  const samplesPerQuantifier = Math.floor(Math.pow(config.shrinkBudget, 1/n))

  let current = counterexample

  for (let round = 0; round < config.shrinkRounds; round++) {
    let improved = false

    // Try shrinking each quantifier (outermost first for better minimization)
    for (const q of scenario.quantifiers) {
      const shrunkArb = q.arbitrary.shrink(current[q.name])

      for (const candidate of shrunkArb.sample(samplesPerQuantifier)) {
        const testCase = {...current, [q.name]: candidate.value}

        // Verify failure still occurs with inner quantifiers
        if (failsForSomeInner(testCase, scenario, q, samplesPerQuantifier)) {
          current[q.name] = candidate
          improved = true
          break
        }
      }
    }

    if (!improved) break  // No progress, stop early
  }

  return current
}

// Check if property fails for at least one combination of inner quantifiers
function failsForSomeInner(
  partialCase: TestCase,
  scenario: ScenarioDescriptor,
  currentQ: QuantifierDescriptor,
  samplesPerInner: number
): boolean {
  const innerQs = scenario.quantifiers.slice(
    scenario.quantifiers.indexOf(currentQ) + 1
  )

  if (innerQs.length === 0) {
    return !property(partialCase)
  }

  // Sample inner quantifiers as tuple
  const innerTuple = fc.tuple(...innerQs.map(q => q.arbitrary))
  for (const inner of innerTuple.sample(samplesPerInner)) {
    const full = {...partialCase}
    innerQs.forEach((q, i) => full[q.name] = inner[i])
    if (!property(full)) return true
  }

  return false
}
```

**Complexity Analysis:**

For `n` quantifiers with `shrinkBudget = 500` and `shrinkRounds = 10`:
- `samplesPerQuantifier = 500^(1/n)`
- Per round worst case: `n × samplesPerQuantifier × samplesPerQuantifier^(n-1) = n × 500`
- Total: `10 × n × 500 = 5000n` tests

This is **O(rounds × n × budget)** - linear in quantifier count, not exponential.

**Trade-off:** This "optimistic" shrinking may not find the globally minimal counterexample (it finds a locally minimal one). For most practical cases, this is acceptable - users want *a* small counterexample, not necessarily *the* smallest.

---

### 1. Adaptive Sample Size Reduction (Simpler Alternative)

For properties with many quantifiers, automatically reduce `sampleSize`:

```typescript
// Pseudo-code
function calculateAdaptiveSampleSize(quantifierCount: number): number {
  const baseSampleSize = 1000
  // Reduce exponentially with quantifier count
  return Math.max(10, Math.floor(baseSampleSize / Math.pow(2, quantifierCount - 1)))
}
```

**Example:**
- 1 quantifier: 1000 samples
- 2 quantifiers: 500 samples each
- 3 quantifiers: 250 samples each
- 10 quantifiers: ~2 samples each

### 2. Limit Shrinking Depth

Prevent recursive shrinking from going too deep:

```typescript
const MAX_SHRINK_DEPTH = 5
if (depth >= MAX_SHRINK_DEPTH) {
  return partial  // Stop shrinking
}
```

### 3. Limit Union Size in Shrinking

When creating unions for shrinking, limit the number of candidates:

```typescript
override shrink(initial: FluentPick<A>): Arbitrary<A> {
  const candidates = this.arbitraries.map(...)
  // Limit to first N candidates
  const limited = candidates.slice(0, MAX_SHRINK_UNION_SIZE)
  return fc.union(...limited)
}
```

### 4. Early Termination for Exists

For `exists` quantifiers, stop as soon as a witness is found (already implemented via `breakValue = true`).

### 5. Smart Sampling for Multiple Foralls

Instead of nested loops, use cartesian product sampling:

```typescript
// Current: Nested loops
for (a in arbitraryA) {
  for (b in arbitraryB) {
    for (c in arbitraryC) {
      test(a, b, c)
    }
  }
}

// Better: Sample tuples directly
const tuples = fc.tuple(arbitraryA, arbitraryB, arbitraryC)
for (tuple in tuples.sample(1000)) {
  test(tuple[0], tuple[1], tuple[2])
}
```

This reduces complexity from O(n₁ × n₂ × n₃) to O(min(n₁, n₂, n₃, sampleSize)).

### 6. Warn Users About Large Search Spaces

Detect when search space exceeds a threshold and warn:

```typescript
function estimateSearchSpace(quantifiers: Quantifier[]): number {
  return quantifiers.reduce((acc, q) => acc * q.arbitrary.size().value, 1)
}

if (estimateSearchSpace(quantifiers) > 1_000_000) {
  console.warn(`Large search space detected: ${space}. Consider reducing arbitrary sizes or sample size.`)
}
```

## Recommendations

### Primary: Holistic Strategy

1. **✅ Phase 0 - Deferred Registration:** Strategy is now built at `.check()` time with full path visibility. Quantifiers register arbitraries after the strategy is constructed, not in their constructor. **(COMPLETED)**

2. **🔲 Phase 1 - Scenario Descriptor:** Add `buildScenarioDescriptor()` to extract quantifier metadata (names, types, sizes) from the path. This enables informed planning decisions.

3. **🔲 Phase 2 - Budget Planning:** Add `planExecution(scenario)` to `FluentStrategy` that calculates optimal sample distribution based on quantifier count and types.

4. **🔲 Phase 3 - Tuple Sampling:** For pure `forall` scenarios with 3+ quantifiers, switch from nested loops to direct tuple sampling. This eliminates the exponential blowup entirely.

5. **🔲 Phase 4 - Holistic Shrinking:** Coordinate shrinking across all quantifiers as a unit rather than sequentially per-arbitrary.

### Fallback: Incremental Improvements

If holistic approach is too invasive:

1. **Quick win:** Add adaptive sample size reduction (strategy 1) - can be implemented in `configArbitrary()` by tracking quantifier depth
2. **Safety net:** Limit shrinking depth to 5 (strategy 2)
3. **User guidance:** Warn when estimated search space exceeds threshold (strategy 6)

### Implementation Priority

| Priority | Change | Status | Effort | Impact |
|----------|--------|--------|--------|--------|
| P0 | Deferred registration | ✅ Done | Low | Enables all other changes |
| P0 | Scenario descriptor | 🔲 Next | Low | Enables planning |
| P1 | Tuple sampling for pure forall | 🔲 | Medium | Eliminates exponential blowup |
| P1 | Adaptive sample sizes | 🔲 | Low | Quick mitigation |
| P2 | Budget-based planning | 🔲 | Medium | Intelligent distribution |
| P2 | Search space warnings | 🔲 | Low | User awareness |
| P3 | Holistic shrinking | 🔲 | High | Optimal counterexamples |

## Conclusion

The combinatorial explosion is a fundamental mathematical property of multiple quantifiers. The current per-arbitrary execution model doesn't account for this, leading to:
- Extremely long test runs
- Memory pressure from large unions
- Timeout issues
- Poor user experience

The **holistic strategy approach** addresses this at the architectural level by:
1. ✅ Deferring strategy construction until full scenario is known (DONE)
2. 🔲 Treating test budget as a finite resource to distribute
3. 🔲 Converting nested loops to tuple sampling where semantically valid
4. 🔲 Coordinating shrinking across all quantifiers

**Progress:** The foundational architectural change (Phase 0) is complete. The strategy is now built at `.check()` time with full visibility into the scenario structure via `pathFromRoot()`. This enables all subsequent optimizations without further architectural changes.

**Next step:** Refactor the architecture to properly separate concerns as described in the Appendix below.

---

## Appendix: Domain-Driven Architecture for Property Checking

The current `FluentStrategy` conflates three distinct concerns: sampling, exploration, and shrinking. A cleaner architecture separates these into independent, composable components.

### Domain Analysis

Property-based testing has these core domain concepts:

1. **Scenario** - A logical statement with quantifiers and predicates ("for all x, for all y, P(x,y) holds")
2. **Search Space** - The domain of possible values (defined by arbitraries)
3. **Exploration** - Navigating the search space to find counterexamples
4. **Shrinking** - Given a counterexample, finding a smaller one in a reduced search space
5. **Sampling** - How to pick concrete values from a search space

These are genuinely different concerns that are currently entangled in `FluentStrategy`.

### Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User API                                │
│  fc.scenario().forall('x', ...).then(...).check()              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Scenario (AST)                             │
│  Pure data: quantifiers, predicates, filters                    │
│  No behavior, just structure                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PropertyChecker                             │
│  Orchestrates: exploration → shrinking → result                 │
│  Configured with: Explorer, Shrinker, Sampler                   │
└─────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Explorer     │  │    Shrinker     │  │    Sampler      │
│                 │  │                 │  │                 │
│ How to traverse │  │ How to minimize │  │ How to pick     │
│ the scenario    │  │ counterexamples │  │ from arbitrary  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 1. Scenario (Pure AST)

The fluent chain becomes a builder that produces immutable, pure data:

```typescript
// Immutable, pure data - no behavior
type ScenarioNode =
  | { type: 'forall'; name: string; arbitrary: Arbitrary<unknown> }
  | { type: 'exists'; name: string; arbitrary: Arbitrary<unknown> }
  | { type: 'given'; predicate: (ctx: Context) => boolean }
  | { type: 'then'; predicate: (ctx: Context) => boolean }

interface Scenario<Rec extends Record<string, unknown>> {
  readonly nodes: readonly ScenarioNode[]

  // Derived queries (no mutation)
  readonly quantifiers: readonly QuantifierNode[]
  readonly hasExistential: boolean
  readonly searchSpaceSize: number
}
```

`FluentCheck` becomes a **builder** that produces a `Scenario`:

```typescript
class FluentCheck<Rec> {
  // Fluent API builds the AST
  forall<K, A>(name: K, arb: Arbitrary<A>): FluentCheck<Rec & {[k in K]: A}>
  exists<K, A>(name: K, arb: Arbitrary<A>): FluentCheck<Rec & {[k in K]: A}>
  given(pred: (r: Rec) => boolean): FluentCheck<Rec>
  then(pred: (r: Rec) => boolean): FluentCheck<Rec>

  // Terminal: builds scenario and delegates to checker
  check(): FluentResult<Rec> {
    const scenario = this.buildScenario()
    const checker = this.resolveChecker()
    return checker.check(scenario)
  }

  // Configuration
  config(checker: PropertyChecker<Rec>): FluentCheck<Rec>
}
```

### 2. Sampler (Value Generation)

This is what the current "strategy mixins" actually do - they control **how values are picked**:

```typescript
interface Sampler {
  // Core: generate samples from an arbitrary
  sample<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[]

  // Variations
  sampleUnique<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[]
  sampleWithBias<A>(arbitrary: Arbitrary<A>, count: number): FluentPick<A>[]
}

// Implementations compose via decoration, not mixins
class RandomSampler implements Sampler { ... }
class BiasedSampler implements Sampler { ... }       // wraps another sampler
class CachedSampler implements Sampler { ... }       // wraps another sampler
class DedupingSampler implements Sampler { ... }     // wraps another sampler

// Example composition
const sampler = new CachedSampler(
  new DedupingSampler(
    new BiasedSampler(
      new RandomSampler(rng)
    )
  )
)
```

### 3. Explorer (Search Space Navigation)

This is the **new** concept - how we traverse the scenario:

```typescript
interface Explorer<Rec> {
  /**
   * Explore a scenario looking for counterexamples.
   * Returns either success (all tests passed) or a counterexample.
   */
  explore(
    scenario: Scenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ExplorationBudget
  ): ExplorationResult<Rec>
}

interface ExplorationBudget {
  maxTests: number        // Total property evaluations allowed
  maxTime?: number        // Optional time limit
}

type ExplorationResult<Rec> =
  | { outcome: 'passed'; testsRun: number }
  | { outcome: 'failed'; counterexample: Rec; testsRun: number }
  | { outcome: 'exhausted'; testsRun: number }  // Ran out of budget
```

Different explorers implement different traversal strategies:

```typescript
// Current behavior: nested loops
class NestedLoopExplorer<Rec> implements Explorer<Rec> {
  explore(scenario, property, sampler, budget) {
    // For each quantifier, iterate through samples
    // Nested loops: O(samples^n) - current behavior
  }
}

// New: tuple sampling for pure-forall scenarios
class TupleSamplingExplorer<Rec> implements Explorer<Rec> {
  explore(scenario, property, sampler, budget) {
    // Combine all quantifiers into tuple, sample once
    // Flat iteration: O(budget) - solves exponential blowup
  }
}

// Future: smart explorer that picks strategy based on scenario
class AdaptiveExplorer<Rec> implements Explorer<Rec> {
  explore(scenario, property, sampler, budget) {
    if (scenario.hasExistential) {
      return new NestedLoopExplorer().explore(...)
    } else if (scenario.quantifiers.length > 3) {
      return new TupleSamplingExplorer().explore(...)
    } else {
      return new NestedLoopExplorer().explore(...)
    }
  }
}
```

### 4. Shrinker (Counterexample Minimization)

Completely separate concern - given a counterexample, make it smaller:

```typescript
interface Shrinker<Rec> {
  /**
   * Shrink a counterexample to find a smaller one that still fails.
   */
  shrink(
    counterexample: Rec,
    scenario: Scenario<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ShrinkBudget
  ): ShrinkResult<Rec>
}

interface ShrinkBudget {
  maxAttempts: number     // How many shrink candidates to try
  maxRounds: number       // How many shrink iterations
}

interface ShrinkResult<Rec> {
  shrunk: Rec             // The minimized counterexample
  attempts: number        // How many candidates were tested
  rounds: number          // How many shrink iterations occurred
}
```

Different shrinkers:

```typescript
// Current behavior: shrink each arbitrary independently
class PerArbitraryShrinker<Rec> implements Shrinker<Rec> {
  shrink(counterexample, scenario, property, sampler, budget) {
    // For each quantifier, try shrinking its value
    // Re-run property to verify it still fails
  }
}

// New: shrink the tuple as a whole
class TupleShrinker<Rec> implements Shrinker<Rec> {
  shrink(counterexample, scenario, property, sampler, budget) {
    // Create tuple from counterexample
    // Use ArbitraryTuple.shrink()
    // Sample from shrunk tuple
  }
}

// Future: binary search shrinking, delta debugging, etc.
class BinarySearchShrinker<Rec> implements Shrinker<Rec> { ... }
```

### 5. PropertyChecker (Orchestrator)

This is what the user configures. It composes the other components:

```typescript
interface PropertyChecker<Rec> {
  check(scenario: Scenario<Rec>): FluentResult<Rec>
}

class DefaultPropertyChecker<Rec> implements PropertyChecker<Rec> {
  constructor(
    private explorer: Explorer<Rec>,
    private shrinker: Shrinker<Rec>,
    private sampler: Sampler,
    private config: CheckerConfig
  ) {}

  check(scenario: Scenario<Rec>): FluentResult<Rec> {
    // 1. Explore to find counterexample
    const exploration = this.explorer.explore(
      scenario,
      this.evaluateProperty.bind(this),
      this.sampler,
      { maxTests: this.config.sampleSize }
    )

    if (exploration.outcome === 'passed') {
      return FluentResult.success()
    }

    // 2. Shrink the counterexample
    const shrunk = this.shrinker.shrink(
      exploration.counterexample,
      scenario,
      this.evaluateProperty.bind(this),
      this.sampler,
      { maxAttempts: this.config.shrinkSize, maxRounds: 10 }
    )

    return FluentResult.failure(shrunk.shrunk)
  }
}
```

### 6. CheckerFactory (Configuration API)

Replaces `FluentStrategyFactory` with cleaner separation:

```typescript
class CheckerFactory<Rec> {
  private samplerBuilder: () => Sampler = () => new RandomSampler()
  private explorerBuilder: () => Explorer<Rec> = () => new NestedLoopExplorer()
  private shrinkerBuilder: () => Shrinker<Rec> = () => new PerArbitraryShrinker()
  private config: CheckerConfig = { sampleSize: 1000, shrinkSize: 500 }

  // Sampler configuration
  withBias(): this { /* wrap sampler */ }
  withDeduplication(): this { /* wrap sampler */ }
  withCaching(): this { /* wrap sampler */ }

  // Explorer configuration
  withNestedExploration(): this { this.explorerBuilder = () => new NestedLoopExplorer() }
  withTupleExploration(): this { this.explorerBuilder = () => new TupleSamplingExplorer() }
  withAdaptiveExploration(): this { this.explorerBuilder = () => new AdaptiveExplorer() }

  // Shrinker configuration
  withPerArbitraryShrinking(): this { ... }
  withTupleShrinking(): this { ... }
  withoutShrinking(): this { ... }

  // Budget configuration
  withSampleSize(n: number): this { ... }
  withShrinkSize(n: number): this { ... }

  build(): PropertyChecker<Rec> {
    return new DefaultPropertyChecker(
      this.explorerBuilder(),
      this.shrinkerBuilder(),
      this.samplerBuilder(),
      this.config
    )
  }
}
```

### 7. Presets

```typescript
export const checkers = {
  // Current default behavior
  get default(): CheckerFactory {
    return new CheckerFactory()
      .withBias()
      .withDeduplication()
      .withCaching()
      .withNestedExploration()
      .withPerArbitraryShrinking()
  },

  // Fast: minimal features
  get fast(): CheckerFactory {
    return new CheckerFactory()
      .withNestedExploration()
      .withoutShrinking()
  },

  // Holistic: avoids exponential blowup
  get holistic(): CheckerFactory {
    return new CheckerFactory()
      .withBias()
      .withDeduplication()
      .withTupleExploration()      // Key difference
      .withTupleShrinking()        // Key difference
  },

  // Adaptive: picks best approach per scenario
  get smart(): CheckerFactory {
    return new CheckerFactory()
      .withBias()
      .withDeduplication()
      .withCaching()
      .withAdaptiveExploration()   // Chooses at runtime
      .withPerArbitraryShrinking()
  }
}
```

### Architecture Comparison

| Component | Responsibility | Current Location | Proposed Location |
|-----------|---------------|------------------|-------------------|
| Scenario | AST of the property | `FluentCheck` chain (mixed with behavior) | `Scenario` (pure data) |
| Sampler | Pick values from arbitrary | `FluentStrategy` mixins | `Sampler` interface |
| Explorer | Navigate search space | `FluentCheckQuantifier.run()` | `Explorer` interface |
| Shrinker | Minimize counterexamples | `FluentStrategy.shrink()` + `configArbitrary()` | `Shrinker` interface |
| Orchestrator | Compose everything | `FluentCheck.check()` | `PropertyChecker` interface |
| Configuration | User-facing API | `FluentStrategyFactory` | `CheckerFactory` |

### Benefits of This Design

1. **Single Responsibility** - Each component does one thing well
2. **Open/Closed** - Add new explorers/shrinkers without modifying existing code
3. **Composable** - Mix and match components independently
4. **Testable** - Each component can be unit tested in isolation
5. **No Type Tags** - No boolean flags or `if/else` branching based on strategy type
6. **Domain Alignment** - Code structure mirrors domain concepts

### Migration Path

1. **Phase 1**: Extract `Scenario` as pure data from `FluentCheck` chain
2. **Phase 2**: Extract `Sampler` interface from current mixin behavior
3. **Phase 3**: Extract `Explorer` interface, implement `NestedLoopExplorer` (current behavior)
4. **Phase 4**: Extract `Shrinker` interface from current shrinking logic
5. **Phase 5**: Implement `PropertyChecker` orchestrator
6. **Phase 6**: Add `TupleSamplingExplorer` and `TupleShrinker` for holistic mode
7. **Phase 7**: Add `AdaptiveExplorer` for automatic strategy selection

Each phase can be done incrementally with full backward compatibility.
