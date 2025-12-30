# Tasks: Choice/Provenance Shrinking for Dependent Generators

## Implementation Tasks

### 1. Create ChoiceStream Class
- [ ] Create `src/shrinking/ChoiceStream.ts`
- [ ] Implement record mode (generate and record choices)
- [ ] Implement replay mode (return recorded choices)
- [ ] Implement `draw()` and `drawInt()` methods
- [ ] Implement `getChoices()` and `reset()` methods
- [ ] Export from shrinking index

### 2. Implement Choice Shrink Candidates
- [ ] Implement `shrinkCandidates()` generator
- [ ] Add deletion strategy (remove choices from end)
- [ ] Add zeroing strategy (set individual choices to 0)
- [ ] Add binary strategy (halve choice values)
- [ ] Add sorting strategy (reorder for different values)
- [ ] Optimize candidate ordering for likely success

### 3. Add pickFromChoices to Arbitrary Base
- [ ] Add `pickFromChoices(stream)` method to `Arbitrary`
- [ ] Implement default delegation to `pick()`
- [ ] Add `supportsChoiceStream` property
- [ ] Update arbitraries index exports

### 4. Implement pickFromChoices for Primitives
- [ ] `ArbitraryInteger.pickFromChoices()` - use drawInt
- [ ] `ArbitraryFloat.pickFromChoices()` - use draw directly
- [ ] `ArbitraryBoolean.pickFromChoices()` - use draw < 0.5
- [ ] `ArbitraryString.pickFromChoices()` - draw for each char
- [ ] `ArbitraryConstant.pickFromChoices()` - no choices needed

### 5. Implement pickFromChoices for Composites
- [ ] `ArbitraryArray.pickFromChoices()` - draw length + elements
- [ ] `ArbitraryTuple.pickFromChoices()` - draw each element
- [ ] `ArbitraryRecord.pickFromChoices()` - draw each field
- [ ] `ArbitraryUnion.pickFromChoices()` - draw variant + value
- [ ] `ArbitraryWeighted.pickFromChoices()` - draw weight + value

### 6. Implement pickFromChoices for ChainedArbitrary
- [ ] Implement `pickFromChoices()` using shared stream
- [ ] Set `supportsChoiceStream = true`
- [ ] Test with nested chains
- [ ] Verify constraint preservation

### 7. Implement pickFromChoices for Transformers
- [ ] `MappedArbitrary.pickFromChoices()` - delegate to base
- [ ] `FilteredArbitrary.pickFromChoices()` - delegate with filter
- [ ] Handle filter rejection in replay mode

### 8. Create ChoiceShrinker
- [ ] Create `src/strategies/ChoiceShrinker.ts`
- [ ] Implement shrink method with choice replay
- [ ] Integrate with ShrinkRoundStrategy
- [ ] Handle budget constraints
- [ ] Track shrink statistics

### 9. Integrate with FluentStrategy
- [ ] Add `withChoiceShrinking()` factory method
- [ ] Store choice streams during generation
- [ ] Select appropriate shrinker based on configuration
- [ ] Implement auto-detection for `.chain()` arbitraries

### 10. Update ExecutableQuantifier
- [ ] Add optional `choiceStream` storage
- [ ] Add `pickFromChoices` method
- [ ] Update `compileQuantifier()` to support choice mode

## Testing Tasks

### 11. Unit Tests for ChoiceStream
- [ ] Test record and replay modes
- [ ] Test draw and drawInt methods
- [ ] Test exhaustion error in replay
- [ ] Test shrink candidate generation

### 12. Unit Tests for pickFromChoices
- [ ] Test each primitive arbitrary
- [ ] Test composite arbitraries
- [ ] Test ChainedArbitrary specifically
- [ ] Verify deterministic replay

### 13. Integration Tests for Choice Shrinking
- [ ] Test simple chain: `integer().chain(n => integer(0, n))`
- [ ] Test nested chains
- [ ] Test chain with array: `integer().chain(n => array(integer(), n, n))`
- [ ] Test complex dependencies

### 14. Comparison Tests
- [ ] Compare choice shrinking vs no shrinking for .chain()
- [ ] Measure shrink quality improvement
- [ ] Measure performance impact

### 15. Evidence Study
- [ ] Create `chain-shrinking.study.ts`
- [ ] Test listAndIndex pattern from research doc
- [ ] Test BST-like structures
- [ ] Document results in evidence file

## Documentation Tasks

### 16. Update API Documentation
- [ ] Document `ChoiceStream` class
- [ ] Document `pickFromChoices()` method
- [ ] Document `withChoiceShrinking()` configuration
- [ ] Add examples for dependent generators

### 17. Update Research Documents
- [ ] Update `integrated-shrinking.md` with Phase 2 status
- [ ] Document trade-offs vs value shrinking
- [ ] Link to evidence study results
