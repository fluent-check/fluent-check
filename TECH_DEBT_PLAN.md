# Technical Debt Remediation Plan

This document outlines a systematic approach to address accumulated technical debt in the fluent-check codebase following recent refactorings and feature additions.

**Last Updated:** 2025-12-30

---

## Executive Summary

| Category | Issues Found | Priority Items | Status |
|----------|-------------|----------------|--------|
| Unsafe Type Casts | 21 `as` assertions, ~~12~~ 7 `any` usages | 5 high-risk | ✅ 5 `any` fixed, 2 documented |
| Unused/Dead Code | ~~3 notebook files~~, 4 TODO items | ~~3 files to remove~~ | ✅ Notebooks removed |
| Style Inconsistencies | 11 categories identified | 3 high priority | Unchanged |
| Redundant Code | 6 major duplication patterns | ~~3 consolidation opportunities~~ | ✅ 2 consolidated, 1 rejected |
| Architectural Issues | ~~4 god classes~~, coupling issues | ~~3 major refactors~~ | ✅ 2 modularized, 1 analyzed, 1 deferred |
| Type System Issues | Loose typing, missing annotations | ~~8 fixes needed~~ | ✅ Return types added |

### Phase 4 Summary
- **4.1 statistics.ts** ✅ Modularized to `src/statistics/` (13 files)
- **4.2 Explorer.ts** ✅ Modularized to `src/strategies/explorer/` (9 files)
- **4.3 FluentCheck.ts** ⚠️ Not recommended (circular dependency issues)
- **4.4 arbitraries/** ⏸️ Deferred (low value vs high effort)

### Phase 3 Summary
- **3.1 Size calculation** ✅ Consolidated via `combineArbitrarySizes()` in `util.ts`
- **3.2 Hash/Equals** ⛔ Rejected (not truly duplicated - semantic differences)
- **3.3 Shrink bounds** ✅ Consolidated via `shrinkBounds()` in `util.ts`

---

## Phase 0: Critical Evidence Fixes (Scientific Integrity)

**Priority:** Critical | **Effort:** Medium | **Risk:** High

Address the fundamental flaws identified by the statistical apparatus studies.

### 0.1 Fix Sample Budget Collapse ✅ COMPLETED
**Finding:** `NestedLoopExplorer` partitions budget $N$ into $N^{1/d}$, resulting in single-digit sample sizes at depth > 3.
**Experiment:** `FlatExplorer` prototype maintained 99.9% effective sample size at depth 5 (vs 0.3% for Nested). **111x improvement**.
**Action:** ~~Implement `FlatExplorer` (Pure Random) and make it the default for deep scenarios.~~
**Status:** ✅ `FlatExplorer` implemented in `src/strategies/FlatExplorer.ts` (157 lines). Generates `maxTests` samples for EVERY quantifier, preventing budget collapse.
**Reference:** [Sample Budget Study](docs/evidence/README.md#18-sample-budget-distribution-study)

### 0.2 Fix Filter Size Estimation ✅ COMPLETED
**Finding:** `FilteredArbitrary` uses an optimistic prior before sampling, leading to 0% CI coverage and exponential error growth.
**Experiment:** Warm-up sampling (10 iterations) reduced error from +3603% to +63% at depth 5.
**Action:** ~~Implement "Warm-up Sampling" to seed the estimator on instantiation.~~
**Status:** ✅ Warm-up sampling implemented in `FilteredArbitrary` constructor (lines 14-27). Uses deterministic seed `0xCAFEBABE` with 10 warm-up samples.
**Reference:** [Filter Cascade Study](docs/evidence/filter-cascade-impact.md)

### 0.3 Fix Weighted Union Bias ✅ COMPLETED
**Finding:** `MappedArbitrary` assumes bijectivity, causing `UnionArbitrary` to miscalculate weights for surjective maps.
**Experiment:** Distinctness heuristic (10 samples) reduced size overestimation by ~30% for 10-to-1 maps.
**Action:** ~~Implement distinctness heuristic or allow manual weight overrides.~~
**Status:** ✅ Distinctness heuristic implemented in `MappedArbitrary` constructor (lines 17-48). Computes `distinctnessFactor` by sampling 10 values and comparing unique outputs to inputs.
**Reference:** [Mapped Arbitrary Size Study](docs/evidence/README.md#12-mapped-arbitrary-size-study)

### 0.4 Fix Shrinking Fairness ✅ COMPLETED
**Finding:** Shrinking is sequentially biased; earlier quantifiers shrink fully before later ones start.
**Action:** ~~Implement "Interleaved Shrinking" strategy.~~
**Status:** ✅ `RoundRobinStrategy` (interleaved shrinking) implemented in `src/strategies/shrinking/RoundRobinStrategy.ts`. Achieves 73% variance reduction vs Sequential Exhaustive with ~5% overhead.
**Reference:** [Shrinking Fairness Study](docs/evidence/README.md#14-shrinking-fairness-study)

## Phase 1: Quick Wins (Low Risk, High Impact)

### 1.1 Remove Development Artifacts ✅ COMPLETED

**Priority:** High | **Effort:** Minimal | **Risk:** None

~~Remove notebook/playground files that are being compiled into dist:~~

| File | Lines | Action | Status |
|------|-------|--------|--------|
| `src/notebook.ts` | 26 | Delete | ✅ Removed |
| `src/notebook2.ts` | 11 | Delete | ✅ Removed |
| `src/notebook4.ts` | 28 | Delete | ✅ Removed |

**Status:** ✅ All notebook files have been removed from the codebase.

### 1.2 Replace `any` with `unknown` ✅ PARTIALLY COMPLETED

**Priority:** High | **Effort:** Low | **Risk:** Low

**Current `any` usages (7 remaining, reduced from 12):**

| File | Line | Current | Status |
|------|------|---------|--------|
| `src/arbitraries/types.ts` | 7 | `original?: any` | ⚠️ Documented - changing requires refactoring canGenerate/shrink across all Arbitraries |
| `src/arbitraries/util.ts` | 118 | `stringify(object: any)` | ✅ Fixed → `stringify(object: unknown): string` |
| `src/arbitraries/ArbitraryTuple.ts` | 19-20 | `const value: any = []` | ✅ Fixed → `unknown[]` with cast at return |
| `src/strategies/Explorer.ts` | 771 | `(n: any): n is QuantifierNode` | ⏳ Pending (type guard) |
| `src/strategies/FlatExplorer.ts` | 52-71 | Various `any` params | ✅ Fixed → proper types from explorer module |
| `src/arbitraries/NoArbitrary.ts` | 21, 26 | `map(_: (a: any) => any)` | ⏳ Kept (semantically intentional - bottom type) |

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

### 2.3 Add Missing Return Type Annotations ✅ COMPLETED

**Priority:** Low | **Effort:** Low | **Risk:** None

| File | Function | Line | Status |
|------|----------|------|--------|
| `src/check/runCheck.ts` | `buildPropertyFunction` | 389 | ✅ Already had return type |
| `src/strategies/Sampler.ts` | `uniqueWithBias` | 4-8 | ✅ Fixed → `FluentPick<A>[]` |

---

## Phase 3: Code Consolidation

### 3.1 Extract Size Calculation Utility ✅ COMPLETED

**Priority:** High | **Effort:** Medium | **Risk:** Low

**Status:** ✅ Implemented `combineArbitrarySizes()` in `src/arbitraries/util.ts`.

**Implementation:** Single function with semantic parameter instead of two separate functions:

```typescript
export function combineArbitrarySizes(
  arbitraries: Iterable<{size(): ArbitrarySize}>,
  operation: 'product' | 'sum'
): ArbitrarySize
```

**Files updated:**
- `src/arbitraries/ArbitraryTuple.ts` - now 1 line: `combineArbitrarySizes(this.arbitraries, 'product')`
- `src/arbitraries/ArbitraryRecord.ts` - now 2 lines (handles empty case separately)
- `src/arbitraries/ArbitraryComposite.ts` - now 1 line: `combineArbitrarySizes(this.arbitraries, 'sum')`
- `src/arbitraries/ArbitraryWeighted.ts` - now 2 lines (extracts arbitraries from entries)

**Lines saved:** ~40 lines of duplicated size calculation logic.

### 3.2 Extract Hash/Equals Factory Functions ⛔ REJECTED

**Priority:** ~~Medium~~ None | **Effort:** Medium | **Risk:** Medium

**Status:** ⛔ Not implemented - rejected after detailed analysis.

**Analysis findings:**
After examining all four implementations, they are **not truly duplicated**:

| Arbitrary | Hash Strategy | Equals Strategy | Key Differences |
|-----------|--------------|-----------------|-----------------|
| Array | FNV mix with length prefix | Element-by-element comparison | Uses single `elementHash` function |
| Tuple | FNV mix, nullable elements | Nullable element handling | Array of hash functions, skips undefined |
| Record | FNV mix + key name hashing | Property-by-property | Includes key count and key names in hash |
| Set | **XOR-based** (order-independent) | Direct comparison (pre-sorted) | Completely different algorithm |

**Reasons for rejection:**
1. **Set uses XOR** instead of FNV mixing for order-independence - fundamentally different algorithm
2. **Record includes key metadata** (key count, key names) for structural differentiation
3. **Tuple handles nullable elements** with special undefined checks
4. **Attempting to abstract would require complex conditional logic** that obscures the semantic intent
5. **Debug/maintenance cost** outweighs the small code reduction

**Recommendation:** Keep implementations specialized. The pattern is similar, but the implementations must remain tailored to each collection type's semantics.

### 3.3 Extract Collection Shrink Logic ✅ COMPLETED

**Priority:** ~~Low~~ High | **Effort:** Low | **Risk:** Low

**Status:** ✅ Implemented `shrinkBounds()` in `src/arbitraries/util.ts`.

**Implementation:** Returns computed bounds instead of constructing arbitraries:

```typescript
export function shrinkBounds(
  currentLength: number,
  min: number
): [number, number, number, number] | null
```

Returns `[lowerMin, lowerMax, upperMin, upperMax]` or `null` if at minimum.

**Files updated:**
- `src/arbitraries/ArbitraryArray.ts` - shrink method now 4 lines
- `src/arbitraries/ArbitrarySet.ts` - shrink method now 4 lines

**Design decision:** Returns bounds tuple instead of constructed arbitraries because:
1. Avoids coupling to `fc.union`/`fc.empty` (which would create circular imports)
2. Callers retain control over factory function (`fc.array` vs `fc.set`)
3. More flexible for future collection types

---

## Phase 4: Architectural Refactoring

### 4.1 Split `statistics.ts` (1245 lines → ~6 modules) ✅ COMPLETED

**Priority:** High | **Effort:** High | **Risk:** Medium

**Status:** ✅ Completed. New modular structure created in `src/statistics/`:

```
src/statistics/
├── index.ts                          # Re-exports public API
├── types.ts                          # Shared type definitions
├── distributions/
│   ├── Distribution.ts               # Abstract base interface
│   ├── IntegerDistribution.ts        # Integer domain distribution
│   ├── BetaDistribution.ts           # Beta distribution implementation
│   └── BetaBinomialDistribution.ts   # Beta-binomial implementation
├── confidence/
│   ├── wilsonScore.ts                # Wilson score interval
│   ├── bayesianConfidence.ts         # Bayesian confidence computation
│   └── sampleSize.ts                 # Sample size calculations
├── streaming/
│   ├── StreamingMeanVariance.ts      # Welford's algorithm
│   ├── StreamingMinMax.ts            # Min/max tracking
│   ├── StreamingQuantiles.ts         # P² quantile estimation
│   └── DistributionTracker.ts        # Composite tracker
└── collectors/
    ├── ArbitraryStatisticsCollector.ts  # Per-arbitrary collector
    └── StatisticsContext.ts             # Statistics aggregation context
```

The old `src/statistics.ts` now re-exports from the new module for backwards compatibility.

### 4.2 Split `Explorer.ts` (954 lines → ~5 modules) ✅ COMPLETED

**Priority:** High | **Effort:** High | **Risk:** Medium

**Status:** ✅ Completed. New modular structure created in `src/strategies/explorer/`:

```
src/strategies/explorer/
├── index.ts                      # Re-exports public API
├── types/
│   ├── ExplorationBudget.ts      # Budget allocation types
│   ├── ExplorationResult.ts      # Result types
│   ├── ExplorationState.ts       # State tracking
│   └── TraversalContext.ts       # Traversal context
├── builders/
│   ├── TraversalOutcomeBuilder.ts    # Outcome construction
│   └── ExplorationResultBuilder.ts   # Result construction
├── AbstractExplorer.ts           # Abstract base class
└── NestedLoopExplorer.ts         # Nested loop implementation
```

The old `src/strategies/Explorer.ts` now re-exports from the new module for backwards compatibility.
`FlatExplorer.ts` has been updated to import from the new module.

### 4.3 Extract FluentCheck Subclasses ⚠️ NOT RECOMMENDED

**Priority:** Medium | **Effort:** Medium | **Risk:** HIGH (Circular Dependencies)

**Current file:** `src/FluentCheck.ts` (733 lines with 13+ inner classes)

**Analysis:** This refactoring is **not recommended** due to inherent circular dependencies in the fluent builder pattern:
- The `FluentCheck` base class has methods like `given()`, `forall()`, `then()` that return subclass instances
- These subclasses must extend `FluentCheck` to inherit all builder methods
- Extracting subclasses to separate files creates circular imports that cannot be resolved without breaking the API

**Original proposed structure:**
```
src/fluent/
├── FluentCheck.ts                # Base class only (~200 lines)
├── builders/
│   ├── FluentCheckGiven.ts       # ❌ Needs to extend FluentCheck
│   ├── FluentCheckWhen.ts        # ❌ Needs to extend FluentCheck
│   ├── FluentCheckQuantifier.ts  # ❌ Needs to extend FluentCheck
│   └── ...
└── index.ts
```

**Alternatives considered:**
1. **Mixin pattern** - Would break the existing API and require significant refactoring
2. **Interface + factory pattern** - Loses type safety of the fluent API
3. **Keep as single file** - ✅ Recommended: The 733-line file is well-organized with logical class groupings

**Recommendation:** Keep `FluentCheck.ts` as a single file. The class hierarchy is cohesive and the fluent builder pattern inherently requires tight coupling between the base class and its builders.

### 4.4 Reorganize `arbitraries/` Directory ⏸️ DEFERRED

**Priority:** Low | **Effort:** High | **Risk:** Medium

**Status:** ⏸️ Deferred. The current flat structure with 27 files works well and the reorganization provides primarily organizational benefits at significant refactoring cost.

**Current:** 27 files in flat structure (~3500 LOC total)
- No file exceeds 650 lines (regex.ts is the largest at 648 lines)
- Most files are under 150 lines
- Clear naming conventions (`Arbitrary*.ts` for types, lower-case for utilities)

**Rationale for deferral:**
1. High effort: All imports across the codebase would need updating
2. Complex interdependencies via `internal.ts` and `types.ts`
3. Risk of circular dependency issues (similar to FluentCheck refactor)
4. Limited benefit: Files are already well-organized by naming convention

**Original proposed structure** (preserved for future consideration):
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

**Current TODO count in codebase: 4** (reduced from 6)

### 5.1 High Priority TODOs

| File | Line | TODO | Effort | Status |
|------|------|------|--------|--------|
| `src/statistics.ts` | 105 | Implement efficient CDF for BetaBinomial (currently O(trials)) | High | ⏳ Pending |
| `src/arbitraries/FilteredArbitrary.ts` | 31 | Decide mode vs mean for size estimation | Medium | ⏳ Pending |
| ~~`src/arbitraries/MappedArbitrary.ts`~~ | ~~27~~ | ~~Handle non-bijective mappings in size calculation~~ | ~~Medium~~ | ✅ Fixed (distinctness heuristic) |

### 5.2 Low Priority TODOs

| File | Line | TODO | Effort | Status |
|------|------|------|--------|--------|
| `src/arbitraries/Arbitrary.ts` | 36 | Consider "unknown" result for canGenerate | Low | ⏳ Pending |
| `src/arbitraries/FilteredArbitrary.ts` | 57 | Update size estimation on pick termination | Low | ⏳ Pending |
| ~~`src/arbitraries/ArbitraryTuple.ts`~~ | ~~24~~ | ~~Fix credible interval for estimated sizes~~ | ~~Low~~ | ✅ Removed (no longer present)

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

### Sprint 0: Critical Fixes ✅ COMPLETED
- [x] Implement `FlatExplorer` for sample budget collapse fix
- [x] Implement warm-up sampling in `FilteredArbitrary`
- [x] Implement distinctness heuristic in `MappedArbitrary`
- [x] Implement `RoundRobinStrategy` for shrinking fairness

### Sprint 1: Quick Wins (Partially Complete)
- [x] Remove notebook files or add to tsconfig exclude
- [ ] Replace `any` with `unknown` in remaining 12 locations
- [ ] Add JSDoc to high-risk type assertions

### Sprint 2: Type System
- [ ] Create `src/arbitraries/typeUtils.ts`
- [ ] Consolidate duplicate type utilities
- [ ] Add missing return type annotations

### Sprint 3: Code Consolidation
- [ ] Create `src/arbitraries/sizeUtils.ts`
- [ ] Create `src/arbitraries/hashEqualsUtils.ts`
- [ ] Update all consuming files

### Sprint 4: Statistics Refactor ✅ COMPLETED
- [x] Create `src/statistics/` directory structure
- [x] Migrate distribution classes
- [x] Migrate confidence calculations
- [x] Migrate streaming algorithms
- [x] Update all imports

### Sprint 5: Explorer Refactor ✅ COMPLETED
- [x] Create `src/strategies/explorer/` structure
- [x] Extract types and builders
- [x] Split AbstractExplorer and NestedLoopExplorer
- [x] Update all imports

### Sprint 6: FluentCheck Refactor ⚠️ NOT RECOMMENDED
- [x] ~~Create `src/fluent/` directory~~ **Skipped** - circular dependency issues
- [x] ~~Extract builder subclasses~~ **Skipped** - breaks fluent API pattern
- [x] Analysis complete: keeping as single file is the best approach

### Sprint 7: Style & Documentation (ongoing)
- [ ] Standardize private field naming
- [ ] Update ESLint configuration
- [ ] Add missing JSDoc documentation
- [ ] Complete remaining TODO items (4 remaining)

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

### B. `any` Type Usages (12 remaining - reduced from 26+)

| File | Lines | Context | Status |
|------|-------|---------|--------|
| `src/arbitraries/types.ts` | 3 | `original?: any` in FluentPick | ⏳ Pending |
| `src/arbitraries/util.ts` | 95 | `stringify(object: any)` | ⏳ Pending |
| `src/arbitraries/ArbitraryTuple.ts` | 29-30 | `const value: any = []` | ⏳ Pending |
| `src/strategies/Explorer.ts` | 771 | Type guard `(n: any)` | ⏳ Pending |
| `src/strategies/FlatExplorer.ts` | 55, 62, 69-72 | Quantifier handler params | ⏳ Pending (5) |
| `src/arbitraries/NoArbitrary.ts` | 21, 26 | `map(_: (a: any) => any)` | ⏳ Low priority |

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

| Pattern | Files | Lines Affected | Status |
|---------|-------|----------------|--------|
| Size calculation | ~~3 files~~ 4 files | ~~~30 lines each~~ | ✅ Consolidated to `combineArbitrarySizes()` |
| Hash/equals | 22 methods | ~500 LOC total | ⛔ Rejected - not truly duplicated |
| Collection shrink | 2 files | ~~~15 lines each~~ | ✅ Consolidated to `shrinkBounds()` |
| Noop reporters | 2 classes | ~20 lines | N/A - already minimal, different interfaces |
| Outcome types | 2 hierarchies | ~100 lines | N/A - deliberately separate (different concerns) |

### E. Architectural Concerns

| Issue | File | Lines | Severity | Status |
|-------|------|-------|----------|--------|
| ~~God class~~ | ~~`statistics.ts`~~ | ~~1245~~ | ~~High~~ | ✅ Modularized to `src/statistics/` |
| ~~God class~~ | ~~`Explorer.ts`~~ | ~~954~~ | ~~High~~ | ✅ Modularized to `src/strategies/explorer/` |
| God class | `FluentCheck.ts` | 733 | Medium | ⚠️ Not recommended (circular deps) |
| God class | `FluentStrategyFactory.ts` | 568 | Medium | ⏳ Pending |
| Coupling | runCheck ↔ Explorer | Multiple | Medium | ⏳ Pending |
| ~~Dead code~~ | ~~notebook*.ts~~ | ~~65~~ | ~~Low~~ | ✅ Removed |
