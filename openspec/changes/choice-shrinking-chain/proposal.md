# Change: Choice/Provenance Shrinking for Dependent Generators

> **Phase**: 2 of 3 (Choice Shrinking for .chain())
> **Prerequisites**: Phase 1: Lazy Iterator-Based Shrink Candidates
> **Related Phases**: Phase 3: Full Choice-Based Migration

## Why

FluentCheck's `.chain()` combinator (dependent generators) currently has **no shrinking support**:

```typescript
// src/arbitraries/ChainedArbitrary.ts
// NO shrink() override - falls back to Arbitrary.shrink():
abstract class Arbitrary<A> {
  shrink<B extends A>(_initial: FluentPick<B>): Arbitrary<A> {
    return NoArbitrary  // Default: no shrinking
  }
}
```

This is a significant limitation because dependent generators are essential for:
- Generating valid indices into arrays: `array.chain(arr => tuple(constant(arr), integer(0, arr.length - 1)))`
- Generating balanced structures: `integer(1, 10).chain(depth => tree(depth))`
- Ensuring constraint satisfaction: `integer(1, 100).chain(min => integer(min, 100))`

### Why Value Shrinking Can't Work for .chain()

The fundamental problem is that **dependencies are lost** during value shrinking:

```typescript
const listAndIndex = fc.integer(1, 10).chain(len =>
  fc.tuple(
    fc.array(fc.integer(), len, len),
    fc.integer(0, len - 1)  // Depends on len!
  )
)

// Generated: ([42, 17, 89, 55, 23], 3) - 5 elements, index 3
// To shrink the index from 3, we need to know len was 5
// But len is not stored in the final value!
// If we shrink the array to 3 elements, index 3 becomes invalid
```

### How Choice Shrinking Solves This

Choice shrinking records the **random decisions** (not values) that produced the test case:

```
Generation:
  choices: [0.5, 0.42, 0.17, 0.89, 0.55, 0.23, 0.6]
           ↓
  len = floor(0.5 * 10) + 1 = 6  (wait, this should be 5)
  array = [42, 17, 89, 55, 23]
  index = integer(0, 4) using 0.6 → 3

Shrinking:
  shrink choices to: [0.3, ...]
  re-run generator:
    len = floor(0.3 * 10) + 1 = 4
    array = 4 elements
    index = integer(0, 3) → automatically constrained!
```

The constraint `index < len` is **embedded in the generator code**, so re-running with shrunk choices automatically maintains validity.

### Evidence

From `docs/research/integrated-shrinking.md`:
- This is identified as "THE KILLER FEATURE" of choice shrinking
- Hypothesis (Python) and Hedgehog (Haskell) both use this approach specifically for dependent generators
- FluentCheck's `ChainedArbitrary` is the only combinator with no shrinking support

## What Changes

Implement choice-based shrinking specifically for `.chain()` and other dependent generators, while preserving existing value-based shrinking for simple arbitraries.

### Core Concept: ChoiceStream

Record random decisions during generation, replay with modifications during shrinking:

```typescript
class ChoiceStream {
  private choices: number[] = []
  private index = 0
  private mode: 'record' | 'replay' = 'record'

  draw(): number {
    if (this.mode === 'replay') {
      return this.choices[this.index++]
    }
    const choice = Math.random()
    this.choices.push(choice)
    return choice
  }

  // For shrinking: replay with modified choices
  static replay(choices: number[]): ChoiceStream

  // Generate shrink candidates
  *shrinkCandidates(): Generator<number[]>
}
```

### New Arbitrary Method: pickFromChoices()

```typescript
abstract class Arbitrary<A> {
  // Existing: uses raw random generator
  abstract pick(generator: () => number): FluentPick<A> | undefined

  // New: uses choice stream (records decisions)
  pickFromChoices(stream: ChoiceStream): FluentPick<A> | undefined {
    // Default: delegate to pick()
    return this.pick(() => stream.draw())
  }

  // Marker for arbitraries that natively support choice streams
  get supportsChoiceStream(): boolean { return false }
}
```

### ChainedArbitrary with Choice Support

```typescript
class ChainedArbitrary<A, B> extends Arbitrary<B> {
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

  override get supportsChoiceStream(): boolean { return true }

  // NO need to implement shrink() - choice shrinking handles it!
}
```

### ChoiceShrinker

```typescript
class ChoiceShrinker<Rec> {
  shrink(
    input: BoundTestCase<Rec>,
    choiceStreams: Map<string, ChoiceStream>,
    scenario: ExecutableScenario<Rec>,
    property: (testCase: Rec) => boolean,
    budget: ShrinkBudget
  ): ShrinkResult<Rec> {

    for (const quantifierName of choiceStreams.keys()) {
      const stream = choiceStreams.get(quantifierName)!

      for (const candidateChoices of stream.shrinkCandidates()) {
        // Replay generator with shrunk choices
        const newStream = ChoiceStream.replay(candidateChoices)
        const pick = quantifier.arbitrary.pickFromChoices(newStream)

        if (pick && isShrunken(pick, current) && stillFails(pick)) {
          // Accept this shrink, update streams
          current = pick
          choiceStreams.set(quantifierName, newStream)
        }
      }
    }
  }
}
```

### Integration: Hybrid Shrinking

```typescript
class FluentStrategy {
  private choiceStreams = new Map<string, ChoiceStream>()
  private useChoiceShrinking = false

  // Opt-in to choice-based shrinking
  withChoiceShrinking(enable = true): this

  // Auto-detect: use choice shrinking for .chain(), value shrinking otherwise
  protected runShrinking(...) {
    if (this.hasChainedArbitraries() || this.useChoiceShrinking) {
      return new ChoiceShrinker().shrink(...)
    }
    return new PerArbitraryShrinker().shrink(...)
  }
}
```

## Impact

- **Affected specs**: `specs/shrinking/spec.md`, `specs/strategies/spec.md`, `specs/arbitraries/spec.md`
- **Affected code**:
  - `src/shrinking/ChoiceStream.ts` (NEW)
  - `src/shrinking/ChoiceShrinker.ts` (NEW)
  - `src/arbitraries/Arbitrary.ts` - Add `pickFromChoices()`, `supportsChoiceStream`
  - `src/arbitraries/ChainedArbitrary.ts` - Implement choice-based generation
  - `src/arbitraries/ArbitraryInteger.ts` - Implement `pickFromChoices()`
  - `src/arbitraries/ArbitraryArray.ts` - Implement `pickFromChoices()`
  - `src/strategies/FluentStrategy.ts` - Integrate choice shrinking
- **Breaking change**: No - opt-in feature, backward compatible
- **New capability**: Shrinking for `.chain()` dependent generators

## Complexity Estimate

**High Complexity** (5-7 days)

| Component | Effort | Notes |
|-----------|--------|-------|
| `ChoiceStream` class | Medium | Core recording/replay logic |
| `ChoiceStream.shrinkCandidates()` | Medium | Hypothesis-style shrink strategies |
| `Arbitrary.pickFromChoices()` default | Low | Delegate to pick() |
| `ChainedArbitrary.pickFromChoices()` | Medium | The key dependent generator support |
| Primitive arbitraries | Medium | Integer, array, tuple, string |
| `ChoiceShrinker` | High | New shrinking algorithm |
| `FluentStrategy` integration | Medium | Opt-in and auto-detection |
| Evidence study | Medium | Compare with no shrinking for .chain() |
| Test suite | High | New test patterns for choice shrinking |

## Success Criteria

1. **Dependent generator shrinking**: `.chain()` arbitraries now shrink correctly
2. **Constraint preservation**: Shrunk values always satisfy dependent constraints
3. **Backward compatibility**: Existing value shrinking unchanged
4. **Performance**: Choice shrinking not significantly slower than value shrinking
5. **Evidence**: Study shows significant improvement for dependent generators

## Open Questions

1. **Choice format**: Should we use `number[]` (floats 0-1) or `Uint8Array` (bytes like Hypothesis)?
2. **Shrink strategies**: Which Hypothesis strategies to implement (deletion, zeroing, binary)?
3. **Auto-detection**: Should choice shrinking be auto-enabled when `.chain()` is detected?
4. **Hybrid approach**: How to combine choice and value shrinking in same test?

## Related Changes

- Builds on Phase 1: Lazy Iterator-Based Shrink Candidates
- Foundation for Phase 3: Full Choice-Based Migration
- Related to `add-shrink-interleaving` (can use choice shrinking for element interleaving)
