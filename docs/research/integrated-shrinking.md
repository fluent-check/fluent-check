# Integrated Shrinking: Research and Feasibility for FluentCheck

## Executive Summary

This document examines **integrated shrinking** (also called **internal shrinking**), a modern approach to property-based testing pioneered by Hypothesis (Python) and later adopted by Hedgehog (Haskell) and Falsify (Haskell). We analyze what makes this approach novel, how it works mechanically, its advantages and disadvantages, and how it could be incorporated into FluentCheck with minimal changes.

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

## 3. Why is This Novel?

### 3.1 Automatic Constraint Preservation

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

### 3.2 No Separate Shrink Functions

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

### 3.3 Compositional Shrinking

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

### 4.1 Advantage: Filtered Generators

**Scenario**: Testing with even integers only.

```typescript
const evenInt = integer(0, 1000).filter(x => x % 2 === 0);
```

**Traditional shrinking problem**:
- Counterexample found: `500`
- Shrinker tries: `250` (even ✓), `125` (odd ✗ - filter rejects), `62` (even ✓)...
- Many rejected candidates waste effort
- **FluentCheck current behavior**: Filters during shrinking, but shrink candidates are generated from the base arbitrary without the filter, leading to potentially many rejections

**Integrated shrinking**:
- Choices that produced `500`: `[0x01, 0xF4]` (conceptually)
- Shrink choices → re-run through generator → filter naturally applied
- Every candidate is valid by construction

### 4.2 Advantage: Dependent Generators

**Scenario**: Generate a list and an index into that list.

```typescript
const listAndIndex = integer(1, 10).chain(len => 
  tuple(array(integer(), len, len), integer(0, len - 1))
);
// Produces: ([1, 4, 2], 1) - list of 3 elements, index 1
```

**Traditional shrinking problem**:
- Counterexample: `([1, 4, 2, 7, 9], 3)`
- Shrink list to `[1, 4, 2]` (3 elements)
- But index `3` is now out of bounds!
- Need complex coordination between shrinkers

**Integrated shrinking**:
- Choices: `[5, ...]` (length=5, then list elements, then index)
- Shrink length choice from 5 to 3
- Re-run generator: produces `([a, b, c], index)` where `index < 3` automatically
- **Constraint preserved by construction**

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

## 5. Incorporating into FluentCheck

### 5.1 Minimal Change Approach: Hybrid Strategy

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

### 5.2 Medium Change: New Arbitrary Base Type

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

### 5.3 Large Change: Full Migration

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

### 5.4 Recommended Approach

**Phase 1: Experimentation (Low Risk)**
- Add `ChoiceRecorder` alongside existing random generator
- Create `IntegratedShrinkMixin` as alternative to `Shrinkable`
- Allow users to opt-in via `.config(fc.strategy().withIntegratedShrinking())`

**Phase 2: Evaluation**
- Compare shrinking quality on test suite
- Measure performance impact
- Gather user feedback

**Phase 3: Gradual Migration**
- If beneficial, make integrated shrinking the default
- Keep traditional shrinking for backward compatibility
- Deprecate custom `shrink()` methods over time

## 6. Trade-off Summary

| Aspect | Traditional (Current) | Integrated |
|--------|----------------------|------------|
| Constraint preservation | Manual, error-prone | Automatic |
| Custom shrink logic | Full control | Limited control |
| Performance (small values) | Faster | Slower (re-generation) |
| Performance (filtered) | Slow (rejections) | Fast (no rejections) |
| Implementation complexity | Per-arbitrary | Centralized |
| Debugging | Clear value flow | Opaque choices |
| Compositional | Manual composition | Automatic |

## 7. Recommendations

1. **Short-term**: Keep traditional shrinking but fix `FilteredArbitrary.shrink()` to avoid generating filtered-out values

2. **Medium-term**: Implement hybrid approach where choice recording is optional, enabling integrated shrinking for complex filtered/dependent generators

3. **Long-term**: Evaluate full migration based on user feedback and performance data

## 8. References

1. MacIver, D. R. (2019). Hypothesis: A new approach to property-based testing. *Journal of Open Source Software*, 4(33), 1891. https://doi.org/10.21105/joss.01891

2. Claessen, K. (2023). Falsify: Internal shrinking reimagined for Haskell. *Haskell Symposium 2023*. https://well-typed.com/blog/2023/04/falsify/

3. Hughes, J. (2007). QuickCheck testing for fun and profit. *PADL 2007*.

4. Hedgehog Documentation. https://hedgehog.qa/

5. de Vries, E. (2023). Falsify: Hypothesis-inspired Shrinking for Haskell. *Well-Typed Blog*.

## 9. Appendix: Code Sketches

### A.1 Choice Stream Implementation

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

### A.2 Integration with FluentCheck

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
