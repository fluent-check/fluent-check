# Change: Update `.exists()` Evidence Methodology

> **GitHub Issue:** [#529](https://github.com/fluent-check/fluent-check/issues/529)

## Why

A detailed review of PR #526 (`.exists()` support) identified several methodological concerns and opportunities to strengthen the evidence for FluentCheck's existential quantifier support:

1. **Terminology imprecision**: "Birthday paradox" should be "space exhaustion/saturation"
2. **Missing shrinking evaluation**: Shrinking is implemented but not measured in the study
3. **Missing boundary scenarios**: Corner case support exists but isn't tested
4. **Ambiguous baseline comparison**: Comparing to manual loops is the wrong baseline; should demonstrate first-class expressiveness vs double-negation emulation
5. **Efficiency claims**: Detection rates matching theory validates correctness, but "early exit" isn't a differentiator (manual loops also exit early)

The review also raised the important point that other PBT frameworks CAN emulate `.exists()` via double-negation (`∃x. P(x)` ≡ `¬∀x. ¬P(x)`), so claims should focus on **first-class expressiveness and composition** rather than "capability."

## What Changes

### Documentation Updates

1. **Terminology fix**: Change "birthday paradox" to "space exhaustion" in `scripts/evidence/exists.study.ts`
2. **Reframe expressiveness docs**: Update `docs/evidence/exists-expressiveness.md` to:
   - Acknowledge double-negation technique exists
   - Frame around "first-class expressiveness" not "capability"
   - Remove "early exit" as differentiator
   - Emphasize: shrinking, safety (sample limits), natural composition
3. **Add modular equivalence explanation**: Document why modular arithmetic witnesses are statistically equivalent to random-process witnesses

### New Evidence Studies

4. **Shrinking evaluation study**: Create `scripts/evidence/shrinking.study.ts` measuring:
   - Initial vs final (shrunk) witness values
   - Shrinking iterations and time
   - Witness quality for predicates with clear minimal witnesses

5. **Double-negation equivalence study**: Create `scripts/evidence/double-negation.study.ts` comparing `.exists(x, P)` vs `!forall(x, !P)` **within FluentCheck**:
   - Semantic equivalence (same detection rates)
   - Shrinking quality comparison
   - Composition complexity demonstration (`exists(a).forall(b)` vs nested negations)

### Analysis Updates

6. **Statistical equivalence verification**: Add chi-squared tests to `analysis/exists.py` formally proving observed rates match theoretical expectations

## Impact

- **Affected code**: 
  - `scripts/evidence/exists.study.ts` (terminology)
  - `scripts/evidence/shrinking.study.ts` (new)
  - `scripts/evidence/double-negation.study.ts` (new)
  - `analysis/exists.py` (statistical tests)
  - `docs/evidence/exists-expressiveness.md` (reframing)
  - `docs/evidence/README.md` (new sections)

- **Affected specs**: `fluent-api` (documentation claims about `.exists()`)

- **No breaking changes**: This is purely documentation and evidence methodology

## Acceptance Criteria

1. All terminology updated from "birthday paradox" to "space exhaustion"
2. Shrinking study demonstrates witness minimization with measurable metrics
3. Double-negation study proves semantic equivalence while showing composition complexity
4. Documentation reframed around "first-class expressiveness" with acknowledgment of double-negation alternative
5. Statistical tests confirm observed detection rates match theory (p > 0.05)
6. All existing tests continue to pass
