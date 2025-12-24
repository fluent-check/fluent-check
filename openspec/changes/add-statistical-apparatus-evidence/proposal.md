# Change: Add Statistical Apparatus Evidence Studies

> **GitHub Issue:** [#537](https://github.com/fluent-check/fluent-check/issues/537)

## Why

The `docs/evidence/` directory validates confidence-based termination, existential quantifiers, shrinking, and double-negation equivalence. However, fluent-check contains numerous other statistical mechanisms that lack empirical validation:

- **Biased sampling** (BiasedSampler) prioritizes corner cases but we don't know if this improves bug detection
- **Deduplication** (sampleUnique) has termination guards and overhead we haven't measured
- **Weighted union selection** (ArbitraryComposite) uses size-proportional probability but hasn't been validated
- **Filter cascades** (FilteredArbitrary chains) compound Beta distribution estimates without validation
- **Mapped arbitrary sizing** assumes bijective maps but non-bijective maps overestimate size
- **Chained arbitraries** (flatMap) create non-uniform distributions not yet characterized
- **Corner case coverage** claims edge cases catch more bugs but lacks evidence
- **Shrinking fairness** may favor earlier quantifiers without measurement
- **Caching trade-offs** reuse samples but may reduce diversity
- **Sample budget distribution** across quantifiers uses an unvalidated formula
- **Streaming algorithms** (P², Welford's) haven't been validated against exact computation
- **Length distributions** for arrays/strings may not be optimal for bug detection

These gaps leave core statistical behaviors unvalidated, undermining confidence in fluent-check's approach.

## What Changes

Add 12 new evidence studies to `docs/evidence/` following the established pattern:

1. **Biased Sampling Impact Study** - Does bias toward corner cases improve bug detection?
2. **Deduplication Efficiency Study** - What's the overhead/benefit of unique sampling?
3. **Weighted Union Probability Study** - Does size-weighting sample proportionally?
4. **Filter Cascade Statistical Impact Study** - Does error compound through filter chains?
5. **Mapped Arbitrary Size Accuracy Study** - How much do non-bijective maps overestimate?
6. **Chained Arbitrary Distribution Study** - What distribution does flatMap create?
7. **Corner Case Coverage Study** - What percentage of bugs are found via corner cases?
8. **Shrinking Fairness Study** - Do earlier quantifiers shrink more aggressively?
9. **Caching Trade-off Study** - Does caching reduce bug detection diversity?
10. **Confidence vs Sample Size Study** - Is the budget formula optimal for nested quantifiers?
11. **Streaming Statistics Accuracy Study** - Are P² and Welford's accurate enough?
12. **Length Distribution Study** - Is uniform length optimal for bug detection?

Each study includes:
- Hypothesis with falsifiable predictions
- Controlled experiment design
- Monte Carlo trials (500+)
- CSV data output
- Visualization (matplotlib/seaborn)

## Impact

- **Affected specs**: testing (evidence requirements)
- **Affected code**:
  - New: `scripts/evidence/<study>.study.ts` (12 experiment runners)
  - New: `scripts/evidence/analysis/<study>.py` (12 analysis scripts)
  - New: `docs/evidence/figures/<study>_*.png` (visualizations)
  - New: `docs/evidence/raw/<study>.csv` (raw data)
  - Modified: `docs/evidence/README.md` (add study summaries)
  - Modified: `scripts/evidence/runner.ts` (register new studies)
- **Dependencies**: Uses existing Python toolchain from add-evidence-suite
- **Breaking changes**: None (evidence is documentation, not API)

## Prioritization

Based on user visibility and validation importance:

| Priority | Study | Rationale |
|----------|-------|-----------|
| P1 | Biased Sampling Impact | Core differentiator, high user visibility |
| P1 | Weighted Union Probability | Simple validation, high confidence gain |
| P1 | Corner Case Coverage | Validates key design decision |
| P2 | Filter Cascade Impact | Addresses known TODO comments |
| P2 | Deduplication Efficiency | Important for sampleUnique feature |
| P2 | Mapped Arbitrary Size | Known limitation worth quantifying |
| P3 | Chained Arbitrary Distribution | Characterizes flatMap behavior |
| P3 | Shrinking Fairness | Validates quantifier ordering |
| P3 | Length Distribution | Potential optimization opportunity |
| P4 | Caching Trade-off | Low impact, nice to have |
| P4 | Streaming Statistics Accuracy | Low impact, unit tests may suffice |
| P4 | Confidence vs Sample Size | Complex, high implementation effort |

## Success Criteria

1. All 12 studies produce reproducible results with deterministic seeds
2. Each study has falsifiable hypotheses with measured outcomes
3. Visualizations are publication-quality (axis labels, legends, error bars)
4. Raw CSV data is version-controlled for external audit
5. README integrates studies into existing evidence documentation
6. Studies inform at least one actionable improvement to fluent-check
