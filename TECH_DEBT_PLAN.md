# Technical Debt Remediation Plan

This document outlines a systematic approach to address accumulated technical debt in the fluent-check codebase following recent refactorings and feature additions.

---

## Executive Summary

| Category | Issues Found | Priority Items |
|----------|-------------|----------------|
| Unsafe Type Casts | 21 `as` assertions, 26+ `any` usages | 5 high-risk |
| Unused/Dead Code | 3 notebook files, 6 TODO items | 3 files to remove |
| Style Inconsistencies | 11 categories identified | 3 high priority |
| Redundant Code | 6 major duplication patterns | 3 consolidation opportunities |
| Architectural Issues | 4 god classes, coupling issues | 3 major refactors |
| Type System Issues | Loose typing, missing annotations | 8 fixes needed |

---

## Phase 0: Critical Evidence Fixes (Scientific Integrity)

**Priority:** Critical | **Effort:** Medium | **Risk:** High

Address the fundamental flaws identified by the statistical apparatus studies.

### 0.1 Fix Sample Budget Collapse (Validated)
**Finding:** `NestedLoopExplorer` partitions budget $N$ into $N^{1/d}$, resulting in single-digit sample sizes at depth > 3.
**Experiment:** `FlatExplorer` prototype maintained 99.9% effective sample size at depth 5 (vs 0.3% for Nested). **111x improvement**.
**Action:** Implement `FlatExplorer` (Pure Random) and make it the default for deep scenarios.
**Reference:** [Sample Budget Study](docs/evidence/README.md#18-sample-budget-distribution-study)

### 0.2 Fix Filter Size Estimation (Validated)
**Finding:** `FilteredArbitrary` uses an optimistic prior before sampling, leading to 0% CI coverage and exponential error growth.
**Experiment:** Warm-up sampling (10 iterations) reduced error from +3603% to +63% at depth 5.
**Action:** Implement "Warm-up Sampling" to seed the estimator on instantiation.
**Reference:** [Filter Cascade Study](docs/evidence/filter-cascade-impact.md)

### 0.3 Fix Weighted Union Bias (Validated)
**Finding:** `MappedArbitrary` assumes bijectivity, causing `UnionArbitrary` to miscalculate weights for surjective maps.
**Experiment:** Distinctness heuristic (10 samples) reduced size overestimation by ~30% for 10-to-1 maps.
**Action:** Implement distinctness heuristic or allow manual weight overrides.
**Reference:** [Mapped Arbitrary Size Study](docs/evidence/README.md#12-mapped-arbitrary-size-study)

### 0.4 Fix Shrinking Fairness
**Finding:** Shrinking is sequentially biased; earlier quantifiers shrink fully before later ones start.
**Action:** Implement "Interleaved Shrinking" strategy.
**Reference:** [Shrinking Fairness Study](docs/evidence/README.md#14-shrinking-fairness-study)

## Phase 1: Quick Wins (Low Risk, High Impact)

### 1.1 Remove Development Artifacts

**Priority:** High | **Effort:** Minimal | **Risk:** None

Remove notebook/playground files that are being compiled into dist:

| File | Lines | Action |
|------|-------|--------|
| `src/notebook.ts` | 26 | Delete |
| `src/notebook2.ts` | 11 | Delete |
| `src/notebook4.ts` | 28 | Delete |

**Alternative:** Add to tsconfig.json `exclude` array if files are needed for development.

### 1.2 Replace `any` with `unknown`

**Priority:** High | **Effort:** Low | **Risk:** Low

| File | Line | Current | Replacement |
|------|------|---------|-------------|
| `src/arbitraries/types.ts` | 3 | `original?: any` | `original?: unknown` |
| `src/arbitraries/util.ts` | 82 | `stringify(object: any)` | `stringify(object: unknown)` |
| `src/arbitraries/ArbitraryTuple.ts` | 29-30 | `const value: any = []` | `const value: unknown[] = []` |

### 1.3 Standardize Private Field Naming

**Priority:** Medium | **Effort:** Medium | **Risk:** Low

**Decision needed:** Choose between `#privateField` (ES private) or `private field` (TS private).

**Recommendation:** Use `#` syntax for true runtime privacy. Files to update:

| File | Current Style | Lines Affected |
|------|---------------|----------------|
| `src/FluentCheck.ts` | Mixed | 53, 437 |
| `src/reporting.ts` | Mixed | 23-24, 35, 57-63 |
| `src/strategies/FluentStrategy.ts` | `private` | 44, 49, 54 |
| `src/templates.ts` | `private readonly` | 68, 71 |

---

## Phase 2: Type System Improvements

### 2.1 Consolidate Duplicate Type Utilities

**Priority:** High | **Effort:** Medium | **Risk:** Low

Create `src/arbitraries/typeUtils.ts` to consolidate duplicated type utilities:

```typescript
// Currently duplicated across 3+ files
export type UnwrapArbitrary<T> = {
  [P in keyof T]: T[P] extends Arbitrary<infer E> ? E : never
}

export type UnwrapFluentPick<T> = {
  -readonly [P in keyof T]: T[P] extends Arbitrary<infer E> ? E : T[P]
}

export type ValidatedSchema<S extends RecordSchema> = {
  [K in keyof S]-?: NonNullable<S[K]>
}

export type UnwrapSchema<S extends RecordSchema> = {
  [K in keyof S]: ValidatedSchema<S>[K] extends Arbitrary<infer T> ? T : never
}
```

**Files to update:**
- `src/arbitraries/index.ts` (lines 105, 113-115)
- `src/arbitraries/ArbitraryRecord.ts` (lines 8-11)
- `src/arbitraries/ArbitraryTuple.ts` (line 7)

### 2.2 Document Intentional Type Assertions

**Priority:** Medium | **Effort:** Low | **Risk:** None

Add JSDoc comments explaining why type assertions are necessary:

| File | Line | Assertion | Documentation Needed |
|------|------|-----------|---------------------|
| `src/arbitraries/NoArbitrary.ts` | 36 | `as any as ExactSizeArbitrary<never>` | Already documented ✓ |
| `src/arbitraries/string.ts` | 25 | `as HexChar` | Add branded type explanation |
| `src/arbitraries/ArbitraryRecord.ts` | 100, 126 | `as Record<string, unknown>` | Add record unwrapping rationale |
| `src/FluentProperty.ts` | 118, 144, 149, 153 | Multiple | Add fluent builder context |

### 2.3 Add Missing Return Type Annotations

**Priority:** Low | **Effort:** Low | **Risk:** None

| File | Function | Line |
|------|----------|------|
| `src/check/runCheck.ts` | `buildPropertyFunction` | 389 |
| `src/strategies/Sampler.ts` | `uniqueWithBias` | 4-5 |

---

## Phase 3: Code Consolidation

### 3.1 Extract Size Calculation Utility

**Priority:** High | **Effort:** Medium | **Risk:** Low

Create shared utility for size calculation logic duplicated in 3 files:

**Create `src/arbitraries/sizeUtils.ts`:**

```typescript
import { ArbitrarySize, exactSize, estimatedSize } from './types.js'
import { Arbitrary } from './Arbitrary.js'

export function calculateProductSize(arbitraries: Arbitrary<unknown>[]): ArbitrarySize {
  let value = 1
  let isEstimated = false

  for (const arb of arbitraries) {
    const size = arb.size()
    if (size.type === 'estimated') isEstimated = true
    value *= size.value
  }

  return isEstimated ? estimatedSize(value, [value, value]) : exactSize(value)
}

export function calculateSumSize(arbitraries: Arbitrary<unknown>[]): ArbitrarySize {
  let value = 0
  let isEstimated = false

  for (const arb of arbitraries) {
    const size = arb.size()
    if (size.type === 'estimated') isEstimated = true
    value += size.value
  }

  return isEstimated ? estimatedSize(value, [value, value]) : exactSize(value)
}
```

**Files to update:**
- `src/arbitraries/ArbitraryTuple.ts` (lines 14-25)
- `src/arbitraries/ArbitraryRecord.ts` (lines 33-46)
- `src/arbitraries/ArbitraryComposite.ts` (lines 28-39)

### 3.2 Extract Hash/Equals Factory Functions

**Priority:** Medium | **Effort:** Medium | **Risk:** Low

Create `src/arbitraries/hashEqualsUtils.ts`:

```typescript
export function createArrayHashCode<T>(
  elementHash: HashFunction
): HashFunction {
  return (value: unknown): number => {
    if (!Array.isArray(value)) return 0
    let hash = FNV_OFFSET_BASIS
    hash = mix(hash, value.length)
    for (const elem of value) {
      hash = mix(hash, elementHash(elem))
    }
    return hash
  }
}

export function createArrayEquals<T>(
  elementEquals: EqualsFunction
): EqualsFunction {
  return (a: unknown, b: unknown): boolean => {
    if (!Array.isArray(a) || !Array.isArray(b)) return false
    if (a.length !== b.length) return false
    return a.every((elem, i) => elementEquals(elem, b[i]))
  }
}
```

**Files to update (22 methods across):**
- `src/arbitraries/ArbitraryArray.ts` (lines 60-82)
- `src/arbitraries/ArbitraryTuple.ts` (lines 76-106)
- `src/arbitraries/ArbitraryRecord.ts` (lines 142-181)
- `src/arbitraries/ArbitrarySet.ts` (lines 70-106)

### 3.3 Extract Collection Shrink Logic

**Priority:** Low | **Effort:** Low | **Risk:** Low

Create shared shrink logic for `ArbitraryArray` and `ArbitrarySet`:

```typescript
// src/arbitraries/collectionUtils.ts
export function shrinkCollection<T>(
  min: number,
  current: T[],
  factory: (min: number, max: number) => Arbitrary<T[]>
): Arbitrary<T[]> {
  if (min === current.length) return fc.empty()

  const middle = Math.floor((min + current.length) / 2)
  const end = current.length - 1

  return fc.union(
    factory(min, middle),
    factory(middle + 1, end)
  )
}
```

---

## Phase 4: Architectural Refactoring

### 4.1 Split `statistics.ts` (1232 lines → ~6 modules)

**Priority:** High | **Effort:** High | **Risk:** Medium

**Current file:** `src/statistics.ts` (1232 lines)

**Proposed structure:**
```
src/statistics/
├── index.ts                          # Re-exports public API
├── distributions/
│   ├── Distribution.ts               # Abstract base interface
│   ├── BetaDistribution.ts           # Lines 27-83
│   ├── BetaBinomialDistribution.ts   # Lines 85-130
│   └── IntegerDistribution.ts        # Lines 132-200
├── confidence/
│   ├── wilsonScore.ts                # Lines 150-180
│   ├── bayesianConfidence.ts         # Lines 280-340
│   └── credibleInterval.ts           # Lines 200-250
├── streaming/
│   ├── StreamingMeanVariance.ts      # Lines 450-520
│   ├── StreamingMinMax.ts            # Lines 522-560
│   ├── StreamingQuantiles.ts         # Lines 562-640
│   └── DistributionTracker.ts        # Lines 700-900
├── collectors/
│   ├── ArbitraryStatisticsCollector.ts  # Lines 900-1000
│   └── StatisticsContext.ts             # Lines 1050-1210
└── types.ts                          # Shared type definitions
```

**Migration steps:**
1. Create directory structure
2. Move classes one at a time with their tests
3. Update imports across codebase
4. Deprecate old file, then remove

### 4.2 Split `Explorer.ts` (903 lines → ~5 modules)

**Priority:** High | **Effort:** High | **Risk:** Medium

**Current file:** `src/strategies/Explorer.ts` (903 lines)

**Proposed structure:**
```
src/strategies/explorer/
├── index.ts                      # Re-exports
├── types/
│   ├── ExplorationResult.ts      # Lines 81-131
│   ├── ExplorationBudget.ts      # Lines 22-64
│   ├── ExplorationState.ts       # Lines 133-145
│   └── TraversalContext.ts       # Lines 147-180
├── AbstractExplorer.ts           # Lines 200-650
├── NestedLoopExplorer.ts         # Lines 650-900
└── builders/
    ├── TraversalOutcomeBuilder.ts    # Lines 182-220
    └── ExplorationResultBuilder.ts   # Lines 222-280
```

### 4.3 Extract FluentCheck Subclasses

**Priority:** Medium | **Effort:** Medium | **Risk:** Low

**Current file:** `src/FluentCheck.ts` (734 lines with 13+ inner classes)

**Proposed structure:**
```
src/fluent/
├── FluentCheck.ts                # Base class only (~200 lines)
├── builders/
│   ├── FluentCheckGiven.ts
│   ├── FluentCheckWhen.ts
│   ├── FluentCheckQuantifier.ts
│   ├── FluentCheckClassify.ts
│   └── FluentCheckCover.ts
└── index.ts                      # Re-exports FluentCheck
```

### 4.4 Reorganize `arbitraries/` Directory

**Priority:** Low | **Effort:** High | **Risk:** Medium

**Current:** 30+ files in flat structure

**Proposed structure:**
```
src/arbitraries/
├── core/
│   ├── Arbitrary.ts
│   ├── NoArbitrary.ts
│   ├── types.ts
│   ├── typeUtils.ts
│   └── util.ts
├── primitives/
│   ├── ArbitraryInteger.ts
│   ├── ArbitraryReal.ts
│   ├── ArbitraryBoolean.ts
│   └── ArbitraryConstant.ts
├── collections/
│   ├── ArbitraryArray.ts
│   ├── ArbitrarySet.ts
│   ├── ArbitraryTuple.ts
│   └── ArbitraryRecord.ts
├── composition/
│   ├── ArbitraryComposite.ts
│   ├── MappedArbitrary.ts
│   ├── FilteredArbitrary.ts
│   ├── ChainedArbitrary.ts
│   └── WrappedArbitrary.ts
├── specialized/
│   ├── string.ts
│   ├── datetime.ts
│   └── regex.ts
├── presets.ts
├── laws.ts
└── index.ts
```

---

## Phase 5: Complete TODO Items

### 5.1 High Priority TODOs

| File | Line | TODO | Effort |
|------|------|------|--------|
| `src/statistics.ts` | 101 | Implement efficient CDF for BetaBinomial (currently O(trials)) | High |
| `src/arbitraries/FilteredArbitrary.ts` | 16 | Decide mode vs mean for size estimation | Medium |
| `src/arbitraries/MappedArbitrary.ts` | 27 | Handle non-bijective mappings in size calculation | Medium |

### 5.2 Low Priority TODOs

| File | Line | TODO | Effort |
|------|------|------|--------|
| `src/arbitraries/Arbitrary.ts` | 36 | Consider "unknown" result for canGenerate | Low |
| `src/arbitraries/FilteredArbitrary.ts` | 35 | Update size estimation on pick termination | Low |
| `src/arbitraries/ArbitraryTuple.ts` | 24 | Fix credible interval for estimated sizes | Low |

---

## Phase 6: Style Standardization

### 6.1 Establish Coding Standards Document

Create `CONTRIBUTING.md` or `.github/STYLE_GUIDE.md` documenting:

1. **Private fields:** Use `#` syntax for all new code
2. **Type parameters:** Use `Rec` for record types, `A`/`B` for simple generics
3. **Error handling:** Use custom error classes extending `Error`
4. **Exports:** Use named exports only (no default exports)
5. **Documentation:** JSDoc required for all public APIs
6. **Constants:** UPPER_SNAKE_CASE for configuration constants

### 6.2 ESLint Rule Updates

Add/update ESLint rules to enforce standards:

```javascript
// eslint.config.js additions
{
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': ['warn', {
      allowExpressions: true
    }],
    '@typescript-eslint/naming-convention': [
      'error',
      { selector: 'classProperty', modifiers: ['private'], format: null }
    ]
  }
}
```

---

## Phase 7: Documentation Improvements

### 7.1 Add Missing JSDoc

**Files needing documentation:**

| File | Public APIs Missing Docs |
|------|-------------------------|
| `src/strategies/FluentStrategyFactory.ts` | Most methods |
| `src/Scenario.ts` | Implementation details |
| `src/arbitraries/string.ts` | Overload explanations |
| `src/check/runCheck.ts` | Internal functions |

### 7.2 Update Existing Documentation

- Add `@example` blocks to complex APIs
- Document method overload rationale
- Add `@remarks` for non-obvious behavior

---

## Implementation Roadmap

### Sprint 1: Quick Wins (1-2 days)
- [ ] Remove notebook files or add to tsconfig exclude
- [ ] Replace `any` with `unknown` in 3 locations
- [ ] Add JSDoc to high-risk type assertions

### Sprint 2: Type System (2-3 days)
- [ ] Create `src/arbitraries/typeUtils.ts`
- [ ] Consolidate duplicate type utilities
- [ ] Add missing return type annotations

### Sprint 3: Code Consolidation (3-4 days)
- [ ] Create `src/arbitraries/sizeUtils.ts`
- [ ] Create `src/arbitraries/hashEqualsUtils.ts`
- [ ] Update all consuming files

### Sprint 4: Statistics Refactor (1 week)
- [ ] Create `src/statistics/` directory structure
- [ ] Migrate distribution classes
- [ ] Migrate confidence calculations
- [ ] Migrate streaming algorithms
- [ ] Update all imports

### Sprint 5: Explorer Refactor (1 week)
- [ ] Create `src/strategies/explorer/` structure
- [ ] Extract types and builders
- [ ] Split AbstractExplorer and NestedLoopExplorer
- [ ] Update all imports

### Sprint 6: FluentCheck Refactor (3-4 days)
- [ ] Create `src/fluent/` directory
- [ ] Extract builder subclasses
- [ ] Update main exports

### Sprint 7: Style & Documentation (ongoing)
- [ ] Standardize private field naming
- [ ] Update ESLint configuration
- [ ] Add missing JSDoc documentation
- [ ] Complete TODO items

---

## Risk Mitigation

1. **Maintain backwards compatibility:** Keep public API exports unchanged
2. **Incremental migration:** Move one module at a time with tests passing
3. **Feature freeze during refactoring:** No new features until phase complete
4. **Comprehensive testing:** Run full test suite after each change
5. **Code review:** All refactoring PRs require review

---

## Success Metrics

- [ ] Zero `any` types in production code (except documented exceptions)
- [ ] No files over 500 lines
- [ ] All public APIs have JSDoc documentation
- [ ] ESLint passes with stricter rules
- [ ] All TODO items resolved or converted to issues
- [ ] Test coverage maintained or improved

---

## Appendix: Full Issue Inventory

### A. Unsafe Type Casts (21 occurrences)

| File | Line | Pattern | Risk |
|------|------|---------|------|
| `NoArbitrary.ts` | 36 | `as any as ExactSizeArbitrary<never>` | High |
| `string.ts` | 25 | `as HexChar` | Medium |
| `ArbitraryRecord.ts` | 100, 126 | `as Record<string, unknown>` | Medium |
| `ArbitraryTuple.ts` | 54-55, 65-66, 79, 96-97 | Various tuple casts | Medium |
| `MappedArbitrary.ts` | 40, 52 | `as A` | Medium |
| `FluentProperty.ts` | 118, 144, 149, 153 | Various | Medium |
| `templates.ts` | 75 | `as FluentResult<Record<string, unknown>>` | Low |
| `reportingConfig.ts` | 78 | `as ResultReporter<Rec>` | Low |
| `index.ts` | 109 | `as Arbitrary<UnwrapFluentPick<U>>` | Medium |
| `Explorer.ts` | 640 | `as Rec` | Medium |
| `Sampler.ts` | 172 | `as FluentPick<A>[]` | Low |

### B. `any` Type Usages (26+ occurrences)

| File | Lines | Context |
|------|-------|---------|
| `FluentProperty.ts` | 13 | Type parameter constraint |
| `FluentCheck.ts` | 56 | Parent type parameter |
| `templates.ts` | 70 | Return type constraint |
| `NoArbitrary.ts` | 16-28 | Internal implementation (8 uses) |
| `ArbitraryTuple.ts` | 29-30, 9 | Array building, class generic |
| `util.ts` | 82 | stringify function |
| `index.ts` | 21, 107 | Helper functions |

### C. Style Inconsistencies

| Category | Inconsistency | Files Affected |
|----------|---------------|----------------|
| Private fields | `#` vs `private` | 6+ files |
| Type parameters | `Rec` vs `A` vs single letter | All generic files |
| Readonly patterns | Constructor vs field declaration | Multiple |
| Function style | Named vs arrow | Multiple |
| Error handling | Generic vs custom errors | Multiple |
| Type vs Interface | No clear convention | Multiple |
| Documentation | JSDoc coverage varies | Most files |
| Constants | Mixed naming conventions | Multiple |

### D. Redundant Code Patterns

| Pattern | Files | Lines Affected |
|---------|-------|----------------|
| Size calculation | 3 files | ~30 lines each |
| Hash/equals | 22 methods | ~500 LOC total |
| Collection shrink | 2 files | ~15 lines each |
| Noop reporters | 2 classes | ~20 lines |
| Outcome types | 2 hierarchies | ~100 lines |

### E. Architectural Concerns

| Issue | File | Lines | Severity |
|-------|------|-------|----------|
| God class | `statistics.ts` | 1232 | High |
| God class | `Explorer.ts` | 903 | High |
| God class | `FluentCheck.ts` | 734 | Medium |
| God class | `FluentStrategyFactory.ts` | 485 | Medium |
| Coupling | runCheck ↔ Explorer | Multiple | Medium |
| Dead code | notebook*.ts | 65 | Low |
