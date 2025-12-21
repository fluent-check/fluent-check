# Tasks: Update `.exists()` Evidence Methodology

## 1. Terminology Updates

- [x] 1.1 Update `scripts/evidence/exists.study.ts` comments: replace "birthday paradox" with "space exhaustion" or "coverage saturation"
- [x] 1.2 Update any related documentation that references "birthday paradox"

## 2. Shrinking Evaluation Study

- [x] 2.1 Create `scripts/evidence/shrinking.study.ts` with scenarios:
  - Predicate `x > 100` (minimal witness: 101)
  - Predicate `x % 10000 === 0` (minimal witness: 10000)
  - Predicate with multiple satisfying ranges
- [x] 2.2 Record metrics: initial witness, final witness, shrink iterations, shrink time
- [x] 2.3 Create `analysis/shrinking.py` to analyze shrinking quality
- [x] 2.4 Generate shrinking figures for documentation
- [x] 2.5 Add shrinking study to evidence runner (`npm run evidence:generate`)

## 3. Double-Negation Equivalence Study

- [x] 3.1 Create `scripts/evidence/double-negation.study.ts` comparing:
  - `.exists('x', arb).then(P)` (first-class)
  - `.forall('x', arb).then(!P)` + extract counter-example (double-negation)
- [x] 3.2 Test scenarios across density levels (sparse, rare, moderate, dense)
- [x] 3.3 Measure: detection rate, tests run, witness value, shrinking quality
- [x] 3.4 Test composition complexity: `exists(a).forall(b)` vs equivalent nested negation
- [x] 3.5 Create `analysis/double_negation.py` to compare approaches
- [x] 3.6 Generate comparison figures
- [x] 3.7 Add double-negation study to evidence runner

## 4. Documentation Reframing

- [x] 4.1 Update `docs/evidence/exists-expressiveness.md`:
  - Acknowledge double-negation technique (`∃x. P(x)` ≡ `¬∀x. ¬P(x)`)
  - Reframe from "capability" to "first-class expressiveness"
  - Show why `exists(a).forall(b)` via double-negation is complex
  - Remove "early exit" as differentiator (manual loops also exit early)
  - Emphasize real wins: shrinking, safety (sample limits), composition
- [x] 4.2 Update `docs/evidence/README.md`:
  - Add section explaining modular arithmetic statistical equivalence
  - Add shrinking study results section
  - Add double-negation comparison section
- [x] 4.3 Update comparison tables to use "first-class" framing

## 5. Statistical Equivalence Verification

- [x] 5.1 Add chi-squared test to `analysis/exists.py`: observed vs expected rates
- [x] 5.2 Add confidence intervals for rate deviations
- [x] 5.3 Document statistical methodology in README

## 6. Corner Case Tests (Optional Enhancement)

- [ ] 6.1 Add tests comparing `withBias()` vs default for boundary-aligned predicates
- [ ] 6.2 Demonstrate corner case detection for predicates like `x === 0` or `x === max`

## 7. Integration & Validation

- [x] 7.1 Run full evidence suite: `npm run evidence:generate`
- [x] 7.2 Run analysis: `npm run evidence:analyze`
- [x] 7.3 Verify all existing tests pass: `npm test`
- [ ] 7.4 Update GitHub Issue #529 with results
