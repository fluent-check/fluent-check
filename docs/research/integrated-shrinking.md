# Integrated Shrinking: Research and Feasibility for FluentCheck

## Executive Summary

This document examines **integrated shrinking** (also called **internal shrinking**, **choice shrinking**, or **provenance shrinking**), a modern approach to property-based testing pioneered by Hypothesis (Python) and later adopted by Hedgehog (Haskell) and Falsify (Haskell). We analyze what makes this approach novel, how it works mechanically, its advantages and disadvantages, and how it could be incorporated into FluentCheck.

**Terminology note**: We use "choice shrinking" and "provenance shrinking" interchangeably—both refer to shrinking the random choices (provenance/origin) that generated values rather than the values themselves.

**Key insight**: Choice shrinking improves **composability** and reduces **value fragility** by shrinking the random choices that generated values rather than the values themselves. This makes shrinking automatic for composed generators and eliminates the need for manual metadata preservation.

**Implementation note**: While Hypothesis uses a byte stream internally, this document uses normalized floats `[0, 1)` in examples for conceptual clarity. The principles are identical—both represent a sequence of random choices that can be shrunk independently of the generated values.

## 1. What is Integrated Shrinking?

### 1.1 Traditional Shrinking (QuickCheck-style)

Traditional property-based testing, as implemented in QuickCheck and currently in FluentCheck, uses a two-phase approach:

1. **Generation Phase**: Random values are generated according to an `Arbitrary` definition
2. **Shrinking Phase**: When a counterexample is found, a separate `shrink` function attempts to find a simpler failing case

```typescript
// FluentCheck's current approach
class ArbitraryInteger {
  pick(generator) { /* generate random integer */ }
  shrink(initial) { /* return Arbitrary of smaller integers */ }
}
```

### 1.2 Integrated Shrinking (Hypothesis-style)

Integrated shrinking unifies generation and shrinking by treating test case generation as a sequence of **random choices** (often called a "byte stream" or "choice sequence"). Shrinking operates on this choice sequence rather than the generated values.

```
Traditional:    Generator → Value → Shrinker → Smaller Value
Integrated:     Choices → Generator → Value
                   ↓
                Shrink Choices → Generator → Smaller Value
```

## 2. How Integrated Shrinking Works

### 2.1 The Choice Sequence Model

In integrated shrinking, every random decision during generation is recorded:

```python
# Conceptual model
def generate_pair():
    x = draw(integers(0, 100))  # Choice 1: pick a number
    y = draw(integers(x, 100))  # Choice 2: pick a number >= x
    return (x, y)
```

The generator draws from a sequence of random bytes/choices. If the sequence is `[42, 75]`, we might get `(42, 75)`. The key insight: **shrinking operates on the choice sequence, not the pair**.

### 2.2 Shrinking the Choices

When a failure is found with choices `[42, 75]`:

1. Try smaller choice sequences: `[42, 74]`, `[41, 75]`, `[41, 74]`, ...
2. **Re-run the generator** with each candidate sequence
3. The generator's constraints are automatically respected

If we try `[42, 74]`:
- `x = 42` (from choice 1)
- `y = integers(42, 100)` draws from choice 2 → gets 74
- Valid because 74 ≥ 42 ✓

If we try `[20, 15]`:
- `x = 20` (from choice 1)  
- `y = integers(20, 100)` draws from choice 2 → but 15 < 20!
- Invalid! Re-interpret or skip

### 2.3 The Byte Stream Approach (Hypothesis)

Hypothesis represents all choices as a byte stream. Each generator operation consumes bytes and interprets them:

```
Byte Stream: [0xAB, 0x3F, 0x00, 0x7C, ...]
                ↓
Integer generator reads 4 bytes → produces value
                ↓
String generator reads N bytes → produces characters
```

Shrinking tries:
1. **Deletion**: Remove bytes from the stream
2. **Zeroing**: Replace bytes with zeros
3. **Minimization**: Reduce byte values

The generator is re-run with each candidate stream. Invalid interpretations are automatically rejected.

## 3. Understanding "Choice/Provenance Shrinking"

### 3.1 What is "Provenance"?

**Provenance** means the origin or history of something. In property-based testing:
- **Value shrinking**: Shrinks the final generated value directly
- **Provenance shrinking**: Shrinks the history/origin (the random choices) that produced the value

Think of it like a recipe:
- **Value shrinking**: You have a cake and try to make it smaller by removing frosting, layers, etc.
- **Provenance shrinking**: You modify the recipe (less sugar, smaller pan), then bake a new cake

The key insight: By modifying the recipe and re-baking, you automatically respect all constraints (oven temperature, baking time, ingredient ratios). With value shrinking, you might accidentally create an invalid cake (too much frosting for the base, wrong proportions).

### 3.2 Why "Compositional"?

**Compositional** means that when you combine generators, shrinking "just works" without special handling.

#### Example: Even Numbers (The Fragility Problem)

```typescript
const evenNumbers = fc.integer(0, 100).map(x => x * 2)
```

**With value shrinking (fragile):**
- Generated: `84` (from base value `42`)
- To shrink `84`, you need to **invert** the map: `84 / 2 = 42`
- Shrink `42` → `21`, `10`, `5`...
- **Re-apply** the map: `21 * 2 = 42`, `10 * 2 = 20`...
- **Problem**: For arbitrary maps, inversion is impossible!

```typescript
const weird = fc.integer(0, 100).map(x => Math.sin(x) * 1000)
// How do you invert sin(x) * 1000? You can't!
```

**FluentCheck's workaround** (src/arbitraries/MappedArbitrary.ts:15):
```typescript
mapFluentPick(p: FluentPick<A>): FluentPick<B> {
  const value = this.f(p.value)
  // CRUCIAL: Preserve pre-mapped value for shrinking
  return {value, original, preMapValue: p.value}
}

override shrink(initial: FluentPick<B>): Arbitrary<B> {
  // Extract the base value, shrink it, re-apply map
  const baseValue = (withBase.preMapValue ?? withBase.original ?? initial.value) as A
  return this.baseArbitrary.shrink(basePick).map(v => this.f(v))
}
```

**Why this is "fragile":**
1. Every transformation must manually preserve metadata (`preMapValue`, `original`)
2. If you forget, shrinking breaks silently
3. Requires explicit shrink logic for every combinator

**With choice shrinking (robust):**
- Choices that produced `84`: `[0x2A]` (represents 42)
- Shrink the **choice**: `0x2A` → `0x15` → `0x0A` (42 → 21 → 10)
- **Re-run** `integer().map(x => x * 2)` with each shrunk choice
- Choice `0x0A` → integer `10` → map `10 * 2 = 20`
- **No inversion needed! No metadata preservation!** Just re-run the generator.

#### Example: Nested Maps (Composition Complexity)

```typescript
const value = fc.integer(0, 100)
  .map(x => x * 2)
  .map(x => x + 10)
  .map(x => x.toString())
```

**With value shrinking:**
- Must preserve `preMapValue` through EVERY map
- Each `MappedArbitrary` wraps the previous one
- Shrinking: string → number → subtract 10 → divide 2 → shrink → re-apply all
- Complex and error-prone!

**With choice shrinking:**
- Choices: `[42]`
- Shrink: `[42]` → `[21]` → `[10]`
- Re-run entire chain: `10 * 2 + 10 → "30"`
- **Automatic composition!**

### 3.3 Why "Less Value Fragile"?

**"Value fragile"** means shrinking breaks when you transform or compose generators.

**FluentCheck's current fragility** (src/strategies/Shrinker.ts:153):
```typescript
// Every Arbitrary must correctly:
// 1. Implement shrink()
// 2. Preserve original and preMapValue metadata
// 3. Compose shrinking logic manually

// If ANY step is forgotten, shrinking silently breaks!
```

**The fragility contract**:
- `MappedArbitrary`: Must preserve `preMapValue`
- `FilteredArbitrary`: Must delegate to base then re-filter
- `ArbitraryTuple`: Must compose shrinks via union
- `ChainedArbitrary`: **Currently has NO shrinking** (falls back to `NoArbitrary`)

**With choice shrinking**: No contract! Choices contain all information. Just re-run the generator.

### 3.4 Automatic Constraint Preservation

**Problem with traditional shrinking**: Shrunk values can violate implicit constraints.

```typescript
// Traditional: generate sorted pair
const sortedPair = tuple(integer(), integer())
  .filter(([a, b]) => a <= b);

// If (10, 20) fails, traditional shrinking might try:
// (5, 20), (10, 10), (0, 20)...
// But it might also accidentally try invalid pairs!
```

**Integrated shrinking**: The constraint `a <= b` is embedded in the choice sequence interpretation. Shrinking choices and re-running the generator **always** produces valid pairs.

### 3.5 No Separate Shrink Functions

Traditional approach requires writing `shrink` for every data type:

```typescript
// QuickCheck-style: tedious and error-prone
class ArbitraryBinaryTree {
  shrink(tree) {
    // Complex logic to shrink tree while maintaining invariants
    // Easy to get wrong!
  }
}
```

Integrated shrinking eliminates this entirely. The generator IS the shrinker.

### 3.6 Compositional Shrinking

Composite generators automatically shrink correctly:

```typescript
// With integrated shrinking, this automatically shrinks well:
const userArb = record({
  name: string(),
  email: email(),
  age: integer(0, 150).filter(x => x >= 18)
});
```

Traditional shrinking requires composing shrink functions, which is error-prone.

## 4. Concrete Examples

### 4.1 Filtered Generators: NOT Solved by Integrated Shrinking

**Important Clarification**: Integrated shrinking does NOT solve filter rejection problems. Even Hypothesis documentation warns: "Excessive filtering can lead to Hypothesis discarding many generated examples."

**Scenario**: Testing with even integers only.

```typescript
const evenInt = integer(0, 1000).filter(x => x % 2 === 0);
```

**Traditional shrinking**:
- Counterexample found: `500`
- Shrinker tries: `250` (even ✓), `125` (odd ✗), `62` (even ✓)...
- ~50% rejection rate

**Integrated shrinking**:
- Choices that produced `500`: `[0x01, 0xF4]` (conceptually)
- Shrink choices → re-run through generator → filter applied
- If filter rejects, discard this choice sequence and try another
- **Still ~50% rejection rate!**

**The filter is opaque in both approaches** - neither can avoid testing candidates.

**The solution is to avoid filters when possible:**
```typescript
// Bad: 50% rejection rate
const evenInt = integer(0, 500).filter(x => x % 2 === 0);

// Good: 0% rejection rate  
const evenInt = integer(0, 500).map(x => x * 2);
```

### 4.2 Advantage: Dependent Generators (THE KILLER FEATURE)

**Scenario**: Generate a list and an index into that list.

```typescript
const listAndIndex = fc.integer(1, 10).chain(len =>
  fc.tuple(
    fc.array(fc.integer(), len, len),
    fc.integer(0, len - 1)
  )
);
// Produces: ([1, 4, 2, 7, 9], 3) - 5 elements, index 3
```

**FluentCheck's current problem**:
- `ChainedArbitrary` (src/arbitraries/ChainedArbitrary.ts) **doesn't implement shrinking at all**
- Falls back to `NoArbitrary`—no shrinking happens!
- Even if we tried to shrink:
  - Shrink list: `[1, 4, 2, 7, 9]` → `[1, 4, 2]` (3 elements)
  - But index `3` is now **out of bounds**!
  - Violates constraint `index < length`

**Why this is hard with value shrinking:**
- The dependency is `integer(0, len - 1)` where `len` is from the first generator
- To shrink, you'd need to:
  1. Shrink `len`: `5 → 3`
  2. Re-generate the array with length 3
  3. Re-generate the index with bound `0..2`
  4. But we're supposed to be shrinking VALUES, not re-generating!
- Complex coordination required between dependent shrinkers

**With choice shrinking (how Hypothesis solves this):**
```typescript
Choices: [5, <bytes for array>, 3]
         ↑                       ↑
      length=5               index=3

Shrink: [3, <bytes for array>, ?]
         ↑
      length=3

Re-interpret with shrunk choices:
  1. len = 3 (from choice 1)
  2. array = generate 3 elements (from subsequent choices)
  3. index = integer(0, len-1) = integer(0, 2)
     - Even if choice says "3", the generator code says "max = len-1 = 2"
     - So the choice gets clamped/modulo to valid range
  4. Result: ([a, b, c], 0/1/2) - ALWAYS VALID!
```

**The constraint is embedded in the generator code** (`integer(0, len-1)`), so re-running with shrunk choices automatically maintains it!

**This is THE reason to implement choice shrinking**: It makes dependent generators (`.chain()`) shrink correctly without any special logic.

### 4.3 Advantage: Complex Data Structures

**Scenario**: Valid binary search tree.

```typescript
// BST where all left children < parent < all right children
const bst = /* complex dependent generation */
```

**Traditional shrinking**: 
- Must shrink tree while maintaining BST invariant
- Extremely complex shrink function
- Often produces invalid trees that must be rejected

**Integrated shrinking**:
- Generator encodes BST constraints
- Shrinking choices and re-running always produces valid BSTs
- No special shrink logic needed

### 4.4 Disadvantage: Less Control Over Shrink Direction

**Scenario**: Shrinking toward specific "interesting" values.

```typescript
// We want counterexamples shrunk toward 0
const integer = new ArbitraryInteger(-1000, 1000);
```

**Traditional shrinking advantage**:
- Can encode domain knowledge: "shrink toward 0"
- Custom shrink strategy: `shrink(42) → [21, 10, 5, 2, 1, 0]`

**Integrated shrinking limitation**:
- Shrinks choices, not values
- May not find the "most informative" shrink
- Example: `[0xFF, 0xFF]` → might shrink to `[0x00, 0x00]` (value 0), or might shrink to `[0x00, 0xFF]` first (value 255)

### 4.5 Disadvantage: Performance for Large Choice Sequences

**Scenario**: Generating large data structures.

**Integrated shrinking cost**:
- Must re-run generator for every shrink candidate
- Large choice sequences = many shrink candidates
- Can be slower than direct value shrinking

**Traditional shrinking advantage**:
- Direct manipulation of values
- Can be O(1) per candidate vs O(n) for re-generation

### 4.6 Disadvantage: Debugging Generator Internals

**Traditional approach**: 
- Can inspect shrink candidates directly
- Understand exactly how values relate

**Integrated shrinking**:
- Choice sequences are opaque
- Harder to understand why a particular shrink was tried
- "Why did it shrink [42, 75] to [42, 20]?" requires understanding byte interpretation

## 5. Deep Dive: FluentCheck's Current Value Shrinking Architecture

Before designing choice shrinking, let's understand exactly how FluentCheck's current shrinking works.

### 5.1 Current Data Structures

#### FluentPick<T> (src/arbitraries/types.ts)
```typescript
export type FluentPick<V> = {
  value: V           // The actual generated value
  original?: any     // Original pre-transformation value
  preMapValue?: unknown  // Pre-map value for mapped arbitraries
}
```

**No choice sequences**: Just values + metadata to enable shrinking through transformations.

#### BoundTestCase<Rec> (src/strategies/types.ts)
```typescript
export type BoundTestCase<Rec extends {}> = {
  [K in keyof Rec]: FluentPick<Rec[K]>
}

// Example with forall x, forall y:
// {x: {value: 42, original: 42}, y: {value: 75, original: 75}}
```

**Compared to Hypothesis**:
- Hypothesis: `{choices: [0x2A, 0x4B], ...}` (byte stream)
- FluentCheck: `{x: {value: 42}, y: {value: 75}}` (values)

### 5.2 Current Shrinking Algorithm (src/strategies/Shrinker.ts:208)

The `PerArbitraryShrinker` implements iterative value shrinking (simplified for clarity):

```typescript
#shrinkWithMode(input, scenario, explorer, property, sampler, budget, mode) {
  const quantifiers = mode.quantifiers(scenario)
  let current = {...input}
  let attempts = 0
  let rounds = 0

  while (rounds < budget.maxRounds && attempts < budget.maxAttempts) {
    let foundSmaller = false

    // For each quantifier (forall x, forall y, etc.)
    for (const quantifier of quantifiers) {
      const pick = current[key]

      // Get shrink candidates from the arbitrary's shrink() method
      const candidates = quantifier.shrink(pick, sampler, Math.min(remaining, 100))

      for (const candidate of candidates) {
        attempts++

        // Check if candidate is actually smaller
        if (!quantifier.isShrunken(candidate, pick)) continue

        // Build test case with shrunk value
        const testCase = {...current, [key]: candidate}
        const partialScenario = buildPartialExecutableScenario(...)

        // Re-explore nested quantifiers with Explorer
        const result = explorer.explore(partialScenario, property, sampler, {...})

        // If property still fails, accept this shrink
        const accepted = mode.accept(result, testCase)
        if (accepted !== null) {
          current = accepted
          rounds++
          foundSmaller = true
          break
        }
      }
    }

    if (!foundSmaller) break  // Local minimum reached
  }

  return {minimized: current, attempts, rounds}
}
```

**Key characteristics**:
1. **Iterative**: Repeatedly shrinks until no smaller value found
2. **Per-quantifier**: Shrinks one quantifier at a time
3. **Arbitrary-driven**: Each `Arbitrary.shrink()` returns candidates
4. **Explorer integration**: Re-verifies nested quantifiers after each shrink

### 5.3 How Each Arbitrary Type Implements Shrinking

#### Integer (src/arbitraries/ArbitraryInteger.ts:30)
```typescript
override shrink(initial: FluentPick<number>): Arbitrary<number> {
  if (initial.value > 0) {
    const lower = Math.max(0, this.min)
    const upper = initial.value - 1
    if (upper < lower) return NoArbitrary
    return fc.integer(lower, upper)
  } else if (initial.value < 0) {
    const upper = Math.min(0, this.max)
    const lower = initial.value + 1
    if (lower > upper) return NoArbitrary
    return fc.integer(lower, upper)
  }
  return NoArbitrary
}
```

**Shrinks toward 0**: Positive values shrink down, negative values shrink up.

#### Array (src/arbitraries/ArbitraryArray.ts)
```typescript
override shrink(initial: FluentPick<A[]>): Arbitrary<A[]> {
  if (this.min === initial.value.length) return fc.empty()

  // Split size range in two for union-based shrinking
  const middle = Math.floor((this.min + initial.value.length) / 2)

  return fc.union(
    fc.array(this.arbitrary, this.min, middle),
    fc.array(this.arbitrary, middle + 1, initial.value.length - 1)
  )
}
```

**Note**: This creates a union of two size ranges, **regenerating** array elements rather than shrinking them!

#### Tuple (src/arbitraries/ArbitraryTuple.ts:38)
```typescript
override shrink(initial: FluentPick<A>): Arbitrary<A> {
  const value = initial.value as unknown[]
  const original = initial.original as unknown[]

  // Delta debugging: shrink one position at a time
  return fc.union(...this.arbitraries.map((_, selected) =>
    fc.tuple(...this.arbitraries.map((arbitrary, i) =>
      selected === i ?
        arbitrary.shrink({value: value[i], original: original[i]}) :
        fc.constant(value[i])
    ))
  ))
}
```

#### Mapped (src/arbitraries/MappedArbitrary.ts)
```typescript
override shrink(initial: FluentPick<B>): Arbitrary<B> {
  // Extract pre-mapped base value
  const withBase = initial as {preMapValue?: A; original?: unknown}
  const baseValue = (withBase.preMapValue ?? withBase.original ?? initial.value) as A
  const basePick: FluentPick<A> = {value: baseValue, original: ...}

  // Shrink base, then re-apply map
  return this.baseArbitrary.shrink(basePick).map(v => this.f(v))
}
```

**Critical**: Relies on `preMapValue` being preserved!

#### Filtered (src/arbitraries/FilteredArbitrary.ts:40)
```typescript
override shrink(initialValue: FluentPick<A>) {
  if (!this.f(initialValue.value)) return NoArbitrary

  const shrunkBase = this.baseArbitrary.shrink(initialValue)

  // Check if any corner cases pass filter
  const corners = shrunkBase.cornerCases()
  if (corners.length > 0 && !corners.some(c => this.f(c.value)))
    return NoArbitrary

  // Wrap shrunk base in same filter
  return shrunkBase.filter(v => this.f(v))
}
```

#### Chained (src/arbitraries/ChainedArbitrary.ts)
```typescript
// NO shrink() override - falls back to Arbitrary.shrink():
abstract class Arbitrary<A> {
  shrink<B extends A>(_initial: FluentPick<B>): Arbitrary<A> {
    return NoArbitrary  // Default: no shrinking
  }
}
```

**Missing implementation!** This is a major limitation.

### 5.4 Why Value Shrinking Has Complexity Issues

Each combinator requires manual shrinking logic:
- **Map**: Must preserve `preMapValue` and delegate to base
- **Filter**: Must delegate to base and re-apply filter
- **Tuple**: Must use delta debugging (shrink one position at a time)
- **Array**: Must binary search on size (and regenerate elements)
- **Chain**: **Unsupported** (too complex to coordinate dependencies)

**The fragility**: If any combinator forgets to preserve metadata or implement shrinking, the whole chain breaks.

## 6. Design: Implementing Choice Shrinking in FluentCheck

### 6.1 Minimal Change Approach: Hybrid Strategy

The lowest-risk approach keeps existing arbitraries but adds a choice-recording layer:

```typescript
// New: ChoiceRecorder wraps the random generator
class ChoiceRecorder {
  private choices: number[] = [];
  private replayIndex = 0;
  private mode: 'record' | 'replay' = 'record';
  
  draw(): number {
    if (this.mode === 'replay') {
      return this.choices[this.replayIndex++];
    }
    const choice = Math.random();
    this.choices.push(choice);
    return choice;
  }
  
  // For shrinking: replay with modified choices
  replay(choices: number[]) {
    this.choices = choices;
    this.replayIndex = 0;
    this.mode = 'replay';
  }
  
  shrinkChoices(): number[][] {
    // Generate shrink candidates by modifying choice sequence
    return this.choices.map((_, i) => {
      const copy = [...this.choices];
      copy[i] = copy[i] * 0.5; // Simple shrink: halve each choice
      return copy;
    });
  }
}
```

**Integration with existing code**:

```typescript
// Modify FluentStrategy to use ChoiceRecorder
class IntegratedShrinkStrategy extends FluentStrategy {
  private recorder = new ChoiceRecorder();
  
  override shrink<K extends string>(name: K, partial: FluentResult) {
    // Instead of calling arbitrary.shrink(), shrink the choices
    for (const candidateChoices of this.recorder.shrinkChoices()) {
      this.recorder.replay(candidateChoices);
      const result = this.rerunWithRecorder(name);
      if (result.failed) {
        this.recorder.setChoices(candidateChoices);
        break;
      }
    }
  }
}
```

### 6.2 Medium Change: New Arbitrary Base Type

Create a parallel arbitrary system that supports integrated shrinking:

```typescript
// New integrated arbitrary type
abstract class IntegratedArbitrary<A> {
  // Generation AND shrinking in one
  abstract generate(choices: ChoiceStream): A;
}

// Bridge to existing arbitraries
class ArbitraryAdapter<A> extends IntegratedArbitrary<A> {
  constructor(private readonly classic: Arbitrary<A>) {}

  generate(choices: ChoiceStream): A {
    return this.classic.pick(() => choices.draw()).value;
  }
}
```

**Advantages**:
- Backward compatible (existing arbitraries still work)
- Gradual migration path
- Can compare both approaches

**Disadvantages**:
- Two parallel systems to maintain
- Adapter overhead
- Users need to know which to use

### 6.3 Large Change: Full Migration

A complete rewrite following Hypothesis's architecture:

```typescript
// Core abstraction: SearchStrategy
interface SearchStrategy<A> {
  generate(random: ChoiceStream): A;
  shrinkStream(stream: number[]): Iterable<number[]>;
}

// All primitives use choice streams
class IntegerStrategy implements SearchStrategy<number> {
  constructor(private min: number, private max: number) {}

  generate(choices: ChoiceStream): number {
    const raw = choices.draw(); // 0 to 1
    return Math.floor(raw * (this.max - this.min + 1)) + this.min;
  }

  // Shrinking happens at the ChoiceStream level, not here
}
```

**Advantages**:
- Clean architecture
- Best shrinking quality
- Simplest long-term maintenance

**Disadvantages**:
- Breaking change
- Large implementation effort
- Users must migrate all code

### 6.4 Detailed Design: Recommended Hybrid Approach

This section provides implementation-ready designs for adding choice shrinking to FluentCheck.

#### 6.4.1 New Core Type: ChoiceStream

```typescript
// src/shrinking/ChoiceStream.ts
export class ChoiceStream {
  private index = 0;

  constructor(
    private choices: number[] = [],
    private mode: 'record' | 'replay' = 'record'
  ) {}

  /**
   * Draw a random choice in [0, 1)
   * - In record mode: generate and record
   * - In replay mode: replay from choices
   */
  draw(): number {
    if (this.mode === 'replay') {
      if (this.index >= this.choices.length) {
        throw new Error('ChoiceStream exhausted during replay')
      }
      return this.choices[this.index++]
    }

    // Record mode
    const choice = Math.random()
    this.choices.push(choice)
    this.index++
    return choice
  }

  /**
   * Convenience: draw an integer in [min, max]
   */
  drawInt(min: number, max: number): number {
    const raw = this.draw()
    return Math.floor(raw * (max - min + 1)) + min
  }

  /**
   * Get the recorded choice sequence
   */
  getChoices(): readonly number[] {
    return this.choices
  }

  /**
   * Reset replay index to beginning
   */
  reset(): void {
    this.index = 0
  }

  /**
   * Create a new stream for replay
   */
  static replay(choices: number[]): ChoiceStream {
    return new ChoiceStream([...choices], 'replay')
  }

  /**
   * Generate shrink candidates using Hypothesis-style strategies
   */
  *shrinkCandidates(): Generator<number[]> {
    // Strategy 1: Deletion (remove choices from the end)
    for (let len = this.choices.length - 1; len >= 0; len--) {
      yield this.choices.slice(0, len)
    }

    // Strategy 2: Zeroing (replace each choice with 0)
    for (let i = 0; i < this.choices.length; i++) {
      if (this.choices[i] !== 0) {
        const copy = [...this.choices]
        copy[i] = 0
        yield copy
      }
    }

    // Strategy 3: Binary shrinking (halve each choice)
    for (let i = 0; i < this.choices.length; i++) {
      if (this.choices[i] > 0) {
        const copy = [...this.choices]
        copy[i] = this.choices[i] / 2
        yield copy
      }
    }

    // Strategy 4: Sort (try sorting choices, can find different values)
    const sorted = [...this.choices].sort((a, b) => a - b)
    if (!arraysEqual(sorted, this.choices)) {
      yield sorted
    }

    // Strategy 5: Redistribution (move "choice mass" to earlier positions)
    for (let i = 0; i < this.choices.length - 1; i++) {
      for (let j = i + 1; j < this.choices.length; j++) {
        if (this.choices[j] > 0) {
          const copy = [...this.choices]
          const delta = this.choices[j] / 2
          copy[i] = Math.min(1, copy[i] + delta)
          copy[j] = this.choices[j] - delta
          yield copy
        }
      }
    }
  }
}

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}
```

#### 6.4.2 Modified Arbitrary Interface

Add opt-in choice-based generation:

```typescript
// src/arbitraries/Arbitrary.ts
abstract class Arbitrary<A> {
  // Existing methods (unchanged)
  abstract size(): ArbitrarySize
  abstract pick(generator: () => number): FluentPick<A> | undefined
  abstract canGenerate<B extends A>(pick: FluentPick<B>): boolean

  // Existing value-based shrinking (unchanged)
  shrink<B extends A>(_initial: FluentPick<B>): Arbitrary<A> {
    return NoArbitrary
  }

  // NEW: Choice-based generation (opt-in)
  // Default implementation delegates to pick()
  pickFromChoices(stream: ChoiceStream): FluentPick<A> | undefined {
    return this.pick(() => stream.draw())
  }

  // NEW: Marker for arbitraries that natively support choice streams
  get supportsChoiceStream(): boolean {
    return false
  }
}
```

#### 6.4.3 New Shrinker Implementation

```typescript
// src/strategies/ChoiceShrinker.ts
export class ChoiceShrinker<Rec extends Record<string, unknown>> {

  /**
   * Shrink using choice-based approach
   */
  shrink(
    input: BoundTestCase<Rec>,
    scenario: ExecutableScenario<Rec>,
    explorer: Explorer<Rec>,
    property: (testCase: Rec) => boolean,
    sampler: Sampler,
    budget: ShrinkBudget,
    mode: ShrinkMode<Rec>,
    choiceStreams: Map<string, ChoiceStream>
  ): ShrinkResult<Rec> {

    let current = {...input}
    let currentStreams = new Map(choiceStreams)
    let attempts = 0
    let rounds = 0

    const quantifiers = mode.quantifiers(scenario)

    while (rounds < budget.maxRounds && attempts < budget.maxAttempts) {
      let foundSmaller = false

      // Try shrinking each quantifier's choice stream
      for (const quantifier of quantifiers) {
        const key = quantifier.name as keyof Rec
        const stream = currentStreams.get(key as string)

        if (!stream) continue

        // Get shrink candidates from the choice stream
        const candidates = stream.shrinkCandidates()

        for (const candidateChoices of candidates) {
          if (attempts >= budget.maxAttempts) break
          attempts++

          // Create new stream with shrunk choices
          const newStream = ChoiceStream.replay(candidateChoices)

          // Try to generate a value with the shrunk choices
          let pick: FluentPick<Rec[typeof key]> | undefined
          try {
            pick = quantifier.arbitrary.pickFromChoices(newStream)
          } catch {
            // Generation failed with these choices (e.g., exhausted stream)
            continue
          }

          if (pick === undefined) continue

          // Check if this is actually a shrink
          if (!quantifier.isShrunken(pick, current[key])) continue

          // Build test case with shrunk value
          const testCase = {...current, [key]: pick}
          const partialScenario = buildPartialExecutableScenario(
            scenario,
            quantifier.name,
            testCase
          )

          // Re-verify with Explorer
          const result = explorer.explore(partialScenario, property, sampler, {
            maxTests: Math.min(100, budget.maxAttempts - attempts)
          })

          // If property still fails, accept this shrink
          const accepted = mode.accept(result, testCase)
          if (accepted !== null) {
            current = accepted
            currentStreams.set(key as string, newStream)
            rounds++
            foundSmaller = true
            break
          }
        }

        if (foundSmaller) break
      }

      if (!foundSmaller) break // Local minimum
    }

    return {
      minimized: current,
      attempts,
      rounds,
      roundsCompleted: rounds >= budget.maxRounds
    }
  }
}
```

#### 6.4.4 Integration into FluentStrategy

```typescript
// src/strategies/FluentStrategy.ts
export class FluentStrategy {
  private choiceStreams = new Map<string, ChoiceStream>()
  private useChoiceShrinking = false

  /**
   * Opt-in to choice-based shrinking
   */
  withChoiceShrinking(enable = true): this {
    this.useChoiceShrinking = enable
    return this
  }

  /**
   * Modified generate to record choices
   */
  protected generateQuantifier<K extends keyof Rec>(
    name: K,
    arbitrary: Arbitrary<Rec[K]>
  ): FluentPick<Rec[K]> {

    if (this.useChoiceShrinking) {
      // Use choice stream
      const stream = new ChoiceStream()
      this.choiceStreams.set(name as string, stream)

      const pick = arbitrary.pickFromChoices(stream)
      if (pick === undefined) {
        throw new Error(`Failed to generate value for ${String(name)}`)
      }
      return pick

    } else {
      // Traditional approach (unchanged)
      return arbitrary.pick(this.randomGenerator.generator)
    }
  }

  /**
   * Modified shrinking to use choice shrinker when enabled
   */
  protected runShrinking(
    input: BoundTestCase<Rec>,
    scenario: ExecutableScenario<Rec>,
    property: (testCase: Rec) => boolean,
    budget: ShrinkBudget,
    mode: ShrinkMode<Rec>
  ): ShrinkResult<Rec> {

    if (this.useChoiceShrinking && this.choiceStreams.size > 0) {
      // Use choice-based shrinking
      const choiceShrinker = new ChoiceShrinker<Rec>()
      return choiceShrinker.shrink(
        input,
        scenario,
        this.explorer,
        property,
        this.sampler,
        budget,
        mode,
        this.choiceStreams
      )

    } else {
      // Use traditional value-based shrinking
      const valueShrinker = new PerArbitraryShrinker<Rec>()
      return valueShrinker.shrink(input, scenario, property, budget, mode)
    }
  }
}
```

#### 6.4.5 Example: ChainedArbitrary with Choice Support

Now we can implement shrinking for `.chain()`:

```typescript
// src/arbitraries/ChainedArbitrary.ts
export class ChainedArbitrary<A, B> extends Arbitrary<B> {
  constructor(
    private readonly baseArbitrary: Arbitrary<A>,
    private readonly f: (a: A) => Arbitrary<B>
  ) {
    super()
  }

  // Traditional pick (unchanged)
  override pick(generator: () => number): FluentPick<B> | undefined {
    const basePick = this.baseArbitrary.pick(generator)
    if (basePick === undefined) return undefined

    const nextArbitrary = this.f(basePick.value)
    return nextArbitrary.pick(generator)
  }

  // NEW: Choice-based pick (enables shrinking!)
  override pickFromChoices(stream: ChoiceStream): FluentPick<B> | undefined {
    // First, draw from base arbitrary using the stream
    const basePick = this.baseArbitrary.pickFromChoices(stream)
    if (basePick === undefined) return undefined

    // Then, use the base value to determine next arbitrary
    const nextArbitrary = this.f(basePick.value)

    // Draw from next arbitrary using THE SAME stream
    // This is key: the dependency is encoded in the generator, not the choices
    return nextArbitrary.pickFromChoices(stream)
  }

  override get supportsChoiceStream(): boolean {
    return true
  }

  // NO need to implement shrink() - choice shrinking handles it!
}
```

**How this enables shrinking for dependent generators:**

This is the **key benefit** of choice shrinking—dependent generators automatically shrink while preserving constraints:

```typescript
const listAndIndex = fc.integer(1, 10).chain(len =>
  fc.tuple(
    fc.array(fc.integer(), len, len),
    fc.integer(0, len - 1)
  )
)

// With choice shrinking:
// Stream: [0.5, ...array choices..., 0.6]
//          ↓
//       len=5, array=[...], index=3
//
// Shrink stream: [0.3, ...array choices..., 0.6]
//                 ↓
//              len=3, array=[...], index <= 2 (automatically constrained!)
//
// The constraint `integer(0, len-1)` is in the CODE, so it's automatically respected!
```

### 6.5 Recommended Approach

**Phase 1: Experimentation (Low Risk)**
- Implement `ChoiceStream` and `ChoiceShrinker`
- Add `withChoiceShrinking()` opt-in to `FluentStrategy`
- Implement `pickFromChoices()` for core arbitraries (integer, array, tuple)
- Add choice support to `ChainedArbitrary` to enable dependent generator shrinking
- Run comparison tests: choice shrinking vs value shrinking

**Phase 2: Evaluation**
- Compare shrinking quality on test suite
- Measure performance impact (choice shrinking is slower due to re-generation)
- Gather user feedback
- Document when to use each approach

**Phase 3: Gradual Migration (If Beneficial)**
- Make choice shrinking default for arbitraries that benefit most (`.chain()`, complex compositions)
- Keep value shrinking for simple cases where it's faster
- Provide configuration: `.shrinkStrategy('choice' | 'value' | 'auto')`
- Long-term: deprecate manual `shrink()` methods for composable arbitraries

## 7. Trade-off Summary

| Aspect | Traditional (FluentCheck Current) | Choice Shrinking (Hypothesis) |
|--------|----------------------------------|-------------------------------|
| **Dependent generators** (`.chain()`) | No shrinking (ChainedArbitrary unsupported) | Preserves constraints automatically |
| **Filtered generators** | Slow (rejections) | **Also slow (rejections)** |
| **Composed generators** (`.map()`) | Must preserve `preMapValue` metadata | Automatic (just re-run) |
| **Custom shrink logic** | Full control per arbitrary | Limited control (shrink choices) |
| **Performance** (simple values) | Faster (O(1) per candidate) | Slower (O(n) re-generation) |
| **Implementation complexity** | Per-arbitrary shrink methods | Centralized choice shrinking |
| **Debugging** | Clear value flow | Opaque choice sequences |
| **Composability** | Manual (error-prone) | Automatic |
| **Fragility** | Fragile (metadata must be preserved) | Robust (choices contain everything) |
| **BST/complex constraints** | Complex shrink functions required | Automatic via generator code |

### 7.1 When to Use Each Approach

**Use Value Shrinking (FluentCheck current) when:**
- Simple, non-composed arbitraries (integer, string, array)
- Performance is critical (high-frequency testing)
- You need precise control over shrink direction
- Debugging shrinking behavior

**Use Choice Shrinking when:**
- **Dependent generators** (`.chain()`) - THE KILLER FEATURE
- **Composed generators** (multiple `.map()`, `.filter()`, etc.)
- **Complex constraints** (BST, sorted structures, etc.)
- You want automatic composability
- Reducing implementation complexity

**Hybrid approach (recommended):**
- Use choice shrinking for `.chain()` and complex compositions
- Use value shrinking for primitive types (faster)
- Let FluentCheck auto-select based on arbitrary type

## 8. Concrete Comparison: FluentCheck vs Hypothesis

### 8.1 Example: Shrinking `fc.integer(0, 100).map(x => x * 2).filter(x => x > 50)`

#### FluentCheck Current (Value Shrinking)

**Generation**:
```typescript
1. Integer picks 60 → {value: 60, original: 60}
2. Map applies: 60 * 2 → {value: 120, original: 60, preMapValue: 60}
3. Filter checks: 120 > 50 ✓ → {value: 120, original: 60, preMapValue: 60}
```

**Shrinking** (src/arbitraries/FilteredArbitrary.ts:40 + MappedArbitrary.ts):
```typescript
1. FilteredArbitrary.shrink() called with {value: 120, preMapValue: 60}
2. Extracts preMapValue: 60
3. Shrinks base MappedArbitrary → returns Arbitrary<mapped(integer(0, 60))>
4. Wraps in filter: Arbitrary<mapped(integer(0, 60)).filter(x => x > 50)>
5. Candidates: 60→30 (60✓), 30→15 (30✗), 30→22 (44✗), 30→26 (52✓), 26→13 (26✗), 26→19 (38✗), 26→22 (44✗), 26→24 (48✗), 26→25 (50✗), 26→26 (52✓)
6. Final: {value: 52, preMapValue: 26}
```

**Rejection rate**: ~50% (filter rejects odd results after mapping)

#### Hypothesis (Choice Shrinking)

**Generation**:
```typescript
1. Choices: [0.60] (represents 60% of range)
2. Integer interprets: floor(0.60 * 100) = 60
3. Map applies: 60 * 2 = 120
4. Filter checks: 120 > 50 ✓
5. Returns: 120 (choices: [0.60])
```

**Shrinking**:
```typescript
1. Choices: [0.60]
2. Shrink choices: [0.30], [0.15], [0.07], [0.26], [0.25]
3. For each, re-run entire generator:
   [0.30] → 30 → 60 → 60 > 50 ✓
   [0.15] → 15 → 30 → 30 > 50 ✗ (reject)
   [0.26] → 26 → 52 → 52 > 50 ✓
   [0.25] → 25 → 50 → 50 > 50 ✗ (reject)
4. Final: 52 (choices: [0.26])
```

**Rejection rate**: ~50% (same as FluentCheck - filter is opaque)

**Key difference**: Hypothesis doesn't need `preMapValue` metadata - choices encode everything!

### 8.2 Example: Shrinking Dependent Generator

```typescript
const listAndIndex = fc.integer(1, 10).chain(len =>
  fc.tuple(
    fc.array(fc.integer(0, 100), len, len),
    fc.integer(0, len - 1)
  )
)
```

Generated: `([42, 17, 89, 55, 23], 3)` - 5 elements, index 3

#### FluentCheck Current

**Generation**: Works fine
**Shrinking**: `ChainedArbitrary` has no `shrink()` implementation → falls back to `NoArbitrary` → **NO SHRINKING HAPPENS**

**Hypothetical: If we tried to implement it with value shrinking (why it's unsupported):**
```typescript
override shrink(initial: FluentPick<B>): Arbitrary<B> {
  // Problem: We have the final value ([42, 17, 89, 55, 23], 3)
  // But we don't know what `len` was! It's lost.
  // We can infer len = 5 from array.length
  // But if we shrink the array to 3 elements, how do we ensure index < 3?
  // We'd need to regenerate the entire thing, but that's not value shrinking!

  // This is why it's unsupported
}
```

#### Hypothesis (Choice Shrinking)

**Generation**:
```typescript
Choices: [0.5, 0.42, 0.17, 0.89, 0.55, 0.23, 0.6]
         ↓    ↓                              ↓
       len=5  array elements                index=3
```

**Shrinking**:
```typescript
Shrink choices to: [0.3, 0.42, 0.17, 0.89, 0.6]
                    ↓    ↓              ↓
                  len=3  array(3)      index=?

Re-run generator:
1. len = floor(0.3 * 10) + 1 = 4
2. array = pick 4 elements: [42, 17, 89, 55] (from next 4 choices)
3. index = integer(0, len-1) = integer(0, 3)
   - Choice 0.6 interpreted in range [0, 3]
   - index = floor(0.6 * 4) = 2
4. Result: ([42, 17, 89, 55], 2) ✓ VALID!

Shrink more: [0.2, 0.42, 0.17, 0.6]
             ↓    ↓         ↓
           len=3  array(3)  index

1. len = floor(0.2 * 10) + 1 = 3
2. array = [42, 17, 89]
3. index = integer(0, 2) = floor(0.6 * 3) = 1
4. Result: ([42, 17, 89], 1) ✓ VALID!
```

**The constraint `index < len` is in the generator code**, so shrinking choices automatically maintains it!

### 8.3 Example: Binary Search Tree

```typescript
// Generate valid BST
const bst = fc.array(fc.integer(0, 100))
  .chain(values =>
    /* complex logic to build BST from sorted values */
  )
```

#### FluentCheck Current
- No shrinking (ChainedArbitrary unsupported)
- If we tried to implement value shrinking:
  - Must shrink tree while maintaining BST invariant
  - Extremely complex shrink function
  - Easy to produce invalid trees

#### Hypothesis
- Shrink choice sequence
- Re-run BST generator with shrunk choices
- Generator code ensures BST invariant
- Always produces valid BSTs!

## 9. Recommendations

### 9.1 Filter Inefficiency: Neither Approach Solves It

The filter predicate `f` is an **opaque function** - we cannot inspect, invert, or predict what values it accepts. This is true for BOTH traditional and integrated shrinking:

- We **must** test candidates to know if they pass
- We **cannot** generate only valid shrink candidates
- Rejection is inherent to the approach

**Even Hypothesis (integrated shrinking) has this problem.** Their documentation explicitly warns about filter performance and recommends using `map()` instead of `filter()` when possible.

### 9.2 What Integrated Shrinking Actually Solves

Integrated shrinking solves **dependent generator** problems, not filter problems:

```typescript
// This is what integrated shrinking fixes:
const listAndIndex = integer(1, 10).chain(len => 
  tuple(array(integer(), len, len), integer(0, len - 1))
);

// Traditional: Shrink list, index can become invalid
// Integrated: Shrink length choice, index automatically constrained
```

### 9.3 Recommended Path Forward

1. **Short-term**: 
   - Accept filter inefficiency (it's fundamental)
   - Add early termination to bound worst-case behavior
   - Document guidance: prefer `map()` over `filter()` when possible

2. **Medium-term**: 
   - Implement integrated shrinking for `chain()`/dependent generators
   - This is where integrated shrinking provides real value

3. **Long-term**: 
   - Evaluate full migration based on user feedback
   - Keep traditional shrinking for backward compatibility

## 10. References

### Academic & Primary Sources

1. MacIver, D. R. (2019). Hypothesis: A new approach to property-based testing. *Journal of Open Source Software*, 4(33), 1891. https://doi.org/10.21105/joss.01891

2. Claessen, K., & Hughes, J. (2000). QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs. *ICFP 2000*. https://doi.org/10.1145/351240.351266

3. Hughes, J. (2007). QuickCheck testing for fun and profit. *PADL 2007*.

4. de Vries, E. (2023). Falsify: Internal shrinking reimagined for Haskell. *Haskell Symposium 2023*. https://well-typed.com/blog/2023/04/falsify/

### Technical Articles

5. MacIver, D. R. Compositional Shrinking. *Hypothesis Works*. https://hypothesis.works/articles/compositional-shrinking/

6. Beesley, N. (2024). "Shrinking Choices, Shrinking Values - Property-based Testing Part 5". *getcode.substack.com*. https://getcode.substack.com/p/property-based-testing-5-shrinking

7. Beesley, N. (2024). "Shrinking Choices, Shrinking Values". *HackerNoon*. https://hackernoon.com/shrinking-choices-shrinking-values-property-based-testing-part-5

### Documentation

8. Hypothesis Documentation. https://hypothesis.readthedocs.io/

9. Hedgehog Documentation. https://hedgehog.qa/

10. Falsify Documentation. https://hackage.haskell.org/package/falsify

### FluentCheck Internals

11. FluentCheck source code:
    - `src/arbitraries/Arbitrary.ts` - Base arbitrary class
    - `src/arbitraries/MappedArbitrary.ts` - Map transformation with preMapValue
    - `src/arbitraries/ChainedArbitrary.ts` - Dependent generators (no shrinking)
    - `src/strategies/Shrinker.ts` - Per-arbitrary shrinking algorithm
    - `src/strategies/types.ts` - BoundTestCase and FluentPick types

## 11. Appendix: Additional Implementation Details

### 11.1 Advanced Choice Stream Shrinking Strategies

Beyond the basic shrinking strategies (deletion, zeroing, halving), Hypothesis uses sophisticated techniques:

#### 11.1.1 Delta Debugging for Choice Sequences

```typescript
// Try to find minimal subset of choices that still fails
*deltaDebug(): Generator<number[]> {
  // Binary search on sequence length
  let n = this.choices.length
  while (n > 1) {
    for (let i = 0; i < this.choices.length; i += n) {
      // Try removing chunk of size n
      const chunk = this.choices.slice(0, i).concat(
        this.choices.slice(i + n)
      )
      if (chunk.length < this.choices.length) {
        yield chunk
      }
    }
    n = Math.floor(n / 2)
  }
}
```

#### 11.1.2 Lexicographic Shrinking

```typescript
// Try to make choices "smaller" in lexicographic order
*lexicographic(): Generator<number[]> {
  for (let i = 0; i < this.choices.length; i++) {
    for (const smaller of this.smallerValues(this.choices[i])) {
      const copy = [...this.choices]
      copy[i] = smaller
      yield copy
    }
  }
}

private *smallerValues(n: number): Generator<number> {
  // Generate progressively smaller values
  yield 0
  yield n / 2
  yield n - 0.1
  // ... more strategies
}
```

### 11.2 Original Choice Stream Implementation

```typescript
export class ChoiceStream {
  private index = 0;
  
  constructor(private choices: number[] = []) {}
  
  draw(): number {
    if (this.index >= this.choices.length) {
      const choice = Math.random();
      this.choices.push(choice);
      return choice;
    }
    return this.choices[this.index++];
  }
  
  drawInt(min: number, max: number): number {
    const raw = this.draw();
    return Math.floor(raw * (max - min + 1)) + min;
  }
  
  getChoices(): number[] {
    return [...this.choices];
  }
  
  reset(): void {
    this.index = 0;
  }
  
  *shrinkCandidates(): Generator<number[]> {
    // Deletion shrinking
    for (let i = this.choices.length - 1; i >= 0; i--) {
      yield [...this.choices.slice(0, i), ...this.choices.slice(i + 1)];
    }
    
    // Zero shrinking
    for (let i = 0; i < this.choices.length; i++) {
      if (this.choices[i] !== 0) {
        const copy = [...this.choices];
        copy[i] = 0;
        yield copy;
      }
    }
    
    // Binary shrinking (halving)
    for (let i = 0; i < this.choices.length; i++) {
      if (this.choices[i] > 0) {
        const copy = [...this.choices];
        copy[i] = this.choices[i] / 2;
        yield copy;
      }
    }
  }
}
```

### 11.3 Original Integration with FluentCheck Sketch

```typescript
// New strategy mixin
export function IntegratedShrinkable<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    private choiceStream = new ChoiceStream();
    
    // Override random generator to use choice stream
    override get randomGenerator() {
      return { generator: () => this.choiceStream.draw() };
    }
    
    shrink<K extends string>(arbitraryName: K, partial: FluentResult<Record<string, unknown>>) {
      const originalChoices = this.choiceStream.getChoices();
      
      for (const candidate of this.choiceStream.shrinkCandidates()) {
        this.choiceStream = new ChoiceStream(candidate);
        
        try {
          const pick = this.arbitraries[arbitraryName].arbitrary.pick(
            () => this.choiceStream.draw()
          );
          
          if (pick !== undefined) {
            // Re-run property with shrunk value
            // If still fails, accept this shrink
            this.arbitraries[arbitraryName].collection = [pick];
            return;
          }
        } catch {
          // Generation failed with these choices, try next candidate
          continue;
        }
      }
      
      // No valid shrink found, restore original
      this.choiceStream = new ChoiceStream(originalChoices);
    }
  };
}
```
