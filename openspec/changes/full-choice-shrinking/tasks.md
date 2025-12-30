# Tasks: Full Choice-Based Shrinking Migration

> **Note**: This phase is contingent on evidence from Phase 1 and Phase 2.
> Tasks should only be executed after go/no-go decision.

## Evaluation Tasks (Pre-Decision)

### 1. Gather Phase 1 & 2 Evidence
- [ ] Complete Phase 1 evidence study (lazy iterators)
- [ ] Complete Phase 2 evidence study (choice shrinking for .chain())
- [ ] Document performance overhead measurements
- [ ] Document shrink quality comparisons
- [ ] Collect user feedback on Phase 2

### 2. Go/No-Go Decision
- [ ] Review evidence against decision criteria
- [ ] Assess performance overhead (target: < 2x)
- [ ] Assess shrink quality (target: equal or better)
- [ ] Evaluate debugging tool readiness
- [ ] Make formal go/no-go decision
- [ ] Document decision rationale

## Implementation Tasks (If Proceeding)

### 3. Update Default Shrinker
- [ ] Change `withShrinking()` default to ChoiceShrinker
- [ ] Add `{ mode: 'value' }` option for legacy behavior
- [ ] Update strategy preset defaults
- [ ] Add deprecation warnings for value mode

### 4. Deprecate Manual Shrink Methods
- [ ] Add `@deprecated` to `Arbitrary.shrink()`
- [ ] Add `@deprecated` to `Arbitrary.isShrunken()`
- [ ] Add `@deprecated` to `Arbitrary.canGenerate()`
- [ ] Update documentation with deprecation notices
- [ ] Add runtime deprecation warnings (configurable)

### 5. Simplify FluentPick
- [ ] Remove `original` field requirement
- [ ] Remove `preMapValue` field requirement
- [ ] Update all arbitrary implementations
- [ ] Maintain backward compatibility for existing code

### 6. Simplify MappedArbitrary
- [ ] Remove metadata preservation in `mapFluentPick()`
- [ ] Remove `preMapValue` handling in `shrink()`
- [ ] Verify choice shrinking works for all map cases
- [ ] Update tests

### 7. Simplify FilteredArbitrary
- [ ] Remove value-based shrink logic
- [ ] Handle filter rejection during replay
- [ ] Document expected rejection rates
- [ ] Update tests

### 8. Simplify Arbitrary Interface
- [ ] Make `shrink()` optional with no-op default
- [ ] Make `isShrunken()` optional with comparison default
- [ ] Make `canGenerate()` optional (derive from replay)
- [ ] Update interface documentation

### 9. Choice Debugging Tools
- [ ] Implement `ChoiceDebugger.visualize()`
- [ ] Implement `ChoiceDebugger.explain()`
- [ ] Implement `ChoiceDebugger.diff()`
- [ ] Integrate with verbose test output

### 10. Choice Shrinker Optimizations
- [ ] Implement replay caching
- [ ] Implement smart candidate ordering
- [ ] Consider parallel shrinking (optional)
- [ ] Benchmark and optimize hot paths

### 11. Update Strategy Presets
- [ ] Update `defaultStrategy()` to use choice shrinking
- [ ] Update `thorough` preset
- [ ] Update `fast` preset
- [ ] Update `minimal` preset

### 12. Migration Tooling
- [ ] Implement shrink comparison mode
- [ ] Implement migration report generator
- [ ] Create migration guide documentation
- [ ] Add examples for common migration patterns

## Testing Tasks

### 13. Regression Testing
- [ ] Run full test suite with choice shrinking default
- [ ] Compare shrink results with value shrinking
- [ ] Identify any regressions
- [ ] Fix or document acceptable differences

### 14. Performance Testing
- [ ] Benchmark choice vs value shrinking
- [ ] Measure overhead for common patterns
- [ ] Identify performance-critical cases
- [ ] Optimize if overhead > 2x

### 15. Compatibility Testing
- [ ] Test deprecated methods still work
- [ ] Test migration path for custom arbitraries
- [ ] Test hybrid scenarios (some value, some choice)

## Documentation Tasks

### 16. Update User Documentation
- [ ] Update shrinking guide for choice-based default
- [ ] Document value shrinking opt-in
- [ ] Add debugging guide for choice sequences
- [ ] Update API reference

### 17. Migration Guide
- [ ] Write upgrade guide for users
- [ ] Document breaking changes
- [ ] Provide code examples for common patterns
- [ ] Add FAQ section

### 18. Update Research Documents
- [ ] Mark `integrated-shrinking.md` as implemented
- [ ] Document final trade-offs
- [ ] Link to evidence studies

## Release Tasks

### 19. Version Planning
- [ ] Determine version bump (major for breaking change)
- [ ] Plan deprecation timeline
- [ ] Communicate timeline to users

### 20. Changelog
- [ ] Document all changes
- [ ] Highlight migration requirements
- [ ] Link to migration guide
