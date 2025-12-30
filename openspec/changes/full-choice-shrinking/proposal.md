# Change: Full Choice-Based Shrinking Migration

> **Phase**: 3 of 3 (Full Migration)
> **Prerequisites**: Phase 1: Lazy Iterators, Phase 2: Choice Shrinking for .chain()
> **Status**: Long-term / Evaluation-dependent

## Why

After implementing Phase 1 (lazy iterators) and Phase 2 (choice shrinking for `.chain()`), FluentCheck will have a hybrid shrinking system:
- **Value shrinking** for simple arbitraries (faster, more control)
- **Choice shrinking** for dependent generators (correct, automatic)

This phase evaluates whether to migrate to **full choice-based shrinking** as the primary approach, following the Hypothesis/Hedgehog model. This is a significant architectural decision that should be made based on evidence from Phase 1 and Phase 2.

### Potential Benefits of Full Migration

1. **Unified architecture**: One shrinking approach for all arbitraries
2. **Simpler Arbitrary implementation**: No need for manual `shrink()` methods
3. **Automatic composability**: All combinators shrink correctly by definition
4. **Reduced fragility**: No metadata preservation (`preMapValue`, `original`) needed
5. **Better complex structure shrinking**: BST, graphs, etc. shrink automatically

### Potential Costs of Full Migration

1. **Performance overhead**: Re-generation slower than direct value manipulation
2. **Loss of shrink direction control**: Can't easily guide "shrink toward 0"
3. **Debugging complexity**: Choice sequences harder to understand than values
4. **Breaking change**: Existing `shrink()` methods become obsolete
5. **Migration effort**: All arbitraries need `pickFromChoices()` implementation

### Decision Criteria

This phase should only proceed if Phase 1 and Phase 2 evidence shows:
1. Choice shrinking quality is equal or better for all tested cases
2. Performance overhead is acceptable (< 2x slower)
3. User feedback indicates the simplified API is preferred
4. Debugging tools can be developed to make choice sequences understandable

## What Changes (If Proceeded)

### Make Choice Shrinking the Default

```typescript
// Current: Value shrinking default, choice opt-in
fc.strategy().withShrinking()  // Uses PerArbitraryShrinker
fc.strategy().withShrinking().withChoiceShrinking()  // Uses ChoiceShrinker

// Proposed: Choice shrinking default, value opt-in
fc.strategy().withShrinking()  // Uses ChoiceShrinker
fc.strategy().withShrinking({ mode: 'value' })  // Uses PerArbitraryShrinker
```

### Deprecate Manual shrink() Methods

```typescript
abstract class Arbitrary<A> {
  // Phase 3: Mark as deprecated
  /** @deprecated Use choice shrinking instead */
  shrink<B extends A>(_initial: FluentPick<B>): Arbitrary<A> {
    return NoArbitrary
  }

  // Primary generation method
  abstract pickFromChoices(stream: ChoiceStream): FluentPick<A> | undefined
}
```

### Remove Metadata Preservation Requirement

```typescript
// Current MappedArbitrary (fragile)
mapFluentPick(p: FluentPick<A>): FluentPick<B> {
  const value = this.f(p.value)
  return {
    value,
    original: p.original ?? p.value,
    preMapValue: p.value  // MUST preserve for shrinking
  }
}

// Phase 3 MappedArbitrary (robust)
pickFromChoices(stream: ChoiceStream): FluentPick<B> | undefined {
  const basePick = this.baseArbitrary.pickFromChoices(stream)
  if (!basePick) return undefined
  return { value: this.f(basePick.value) }
  // No metadata needed - choices contain everything
}
```

### Simplify Arbitrary Interface

```typescript
// Current: Multiple methods required
abstract class Arbitrary<A> {
  abstract size(): ArbitrarySize
  abstract pick(generator: () => number): FluentPick<A> | undefined
  abstract canGenerate<B extends A>(pick: FluentPick<B>): boolean
  shrink<B extends A>(_initial: FluentPick<B>): Arbitrary<A>
  cornerCases(): FluentPick<A>[]
  equals(a: A, b: A): boolean
  isShrunken(candidate: FluentPick<A>, current: FluentPick<A>): boolean
}

// Phase 3: Simplified interface
abstract class Arbitrary<A> {
  abstract size(): ArbitrarySize
  abstract pickFromChoices(stream: ChoiceStream): FluentPick<A> | undefined
  cornerCases(): A[]  // Just values, not FluentPicks
  equals(a: A, b: A): boolean

  // Compatibility layer
  pick(generator: () => number): FluentPick<A> | undefined {
    const stream = new ChoiceStream()
    stream.setGenerator(generator)
    return this.pickFromChoices(stream)
  }
}
```

### Add Choice Debugging Tools

```typescript
// New debugging utilities
class ChoiceDebugger {
  // Visualize choice sequence as tree
  visualize(choices: number[], arbitrary: Arbitrary<A>): ChoiceTree

  // Explain what each choice determines
  explain(choices: number[], arbitrary: Arbitrary<A>): ChoiceExplanation[]

  // Compare two choice sequences
  diff(a: number[], b: number[]): ChoiceDiff
}

// In test output
// Before: "Counterexample: [42, 17, 89]"
// After: "Counterexample: [42, 17, 89]
//         Choices: [0.42→len:5, 0.17→arr[0]:17, 0.89→arr[1]:89, ...]"
```

## Impact

- **Affected specs**: All shrinking and arbitrary specs
- **Affected code**: Entire arbitrary system
- **Breaking change**: Yes - `shrink()` methods deprecated
- **Migration path**:
  1. Phase 2 introduces `pickFromChoices()` on all arbitraries
  2. Phase 3 switches default and deprecates `shrink()`
  3. Future version removes `shrink()` entirely

## Complexity Estimate

**Very High Complexity** (2-4 weeks)

| Component | Effort | Notes |
|-----------|--------|-------|
| Default shrinker switch | Low | Configuration change |
| Deprecation annotations | Low | Add @deprecated |
| Remove metadata requirements | Medium | Simplify FluentPick handling |
| Simplify Arbitrary interface | High | Breaking change |
| Choice debugging tools | High | New visualization/explanation |
| Migration documentation | Medium | Upgrade guide |
| Performance optimization | High | Make choice shrinking faster |
| Evidence gathering | High | Comprehensive comparison study |

## Success Criteria

1. **Performance**: Choice shrinking within 2x of value shrinking
2. **Quality**: Equal or better shrink results for all test cases
3. **Simplicity**: 30%+ reduction in Arbitrary method count
4. **User feedback**: Positive reception from early adopters
5. **Documentation**: Clear migration path and debugging tools

## Open Questions

1. **Timeline**: How long to maintain backward compatibility?
2. **Performance targets**: What overhead is acceptable?
3. **Hybrid mode**: Should we always allow value shrinking fallback?
4. **Debugging**: What visualization tools are essential before migration?

## Decision Points

### Go/No-Go Criteria for Phase 3

**Proceed if**:
- Phase 2 shows choice shrinking works correctly for all `.chain()` cases
- Performance overhead < 2x in evidence studies
- No critical user feedback against the approach
- Debugging tools are sufficient for production use

**Do not proceed if**:
- Performance overhead > 3x for common cases
- User feedback strongly prefers value shrinking control
- Debugging tools are insufficient
- Breaking change impact too high for ecosystem

## Related Work

- Hypothesis (Python): Full choice-based shrinking, mature implementation
- Hedgehog (Haskell): Choice-based, inspired by Hypothesis
- Falsify (Haskell): Recent implementation with optimizations
- fast-check (TypeScript): Still uses value shrinking

## Appendix: Migration Guide (Draft)

### For Arbitrary Authors

```typescript
// Before Phase 3
class MyArbitrary<A> extends Arbitrary<A> {
  pick(generator) { /* ... */ }
  shrink(initial) { /* complex logic */ }
}

// After Phase 3
class MyArbitrary<A> extends Arbitrary<A> {
  pickFromChoices(stream) {
    // Just generation logic
    // Shrinking is automatic!
  }
}
```

### For Test Authors

```typescript
// Before: Manual shrink configuration sometimes needed
fc.forall(complexArbitrary)
  .then(x => property(x))
  .config(fc.strategy().withShrinking(2000))  // More budget for complex shrinking
  .check()

// After: Shrinking just works
fc.forall(complexArbitrary)
  .then(x => property(x))
  .check()  // Choice shrinking handles complexity automatically
```
