# Change: Add Reproducibility Features (Path Tracking, Replay, Regression Examples)

> **GitHub Issue:** [#432](https://github.com/fluent-check/fluent-check/issues/432)

## Summary

This proposal documents the addition of reproducibility features to FluentCheck. **The proposal file was missing** and has been created based on GitHub issue #432. 

**Key Mismatches Identified:**
- ❌ **Path tracking**: Not implemented - no generation path capture
- ❌ **Replay API**: Not implemented - no `.replay()` method
- ❌ **Regression examples**: Not implemented - no `.withExample()` methods
- ⚠️ **Verbose fluent API**: Partially implemented - `CheckOptions.verbose` exists but no fluent `.verbose()` method

**Already Implemented:**
- ✅ Seed tracking in `FluentResult`
- ✅ Seed-based RNG via `withGenerator()`
- ✅ Verbose logging infrastructure

## Why

Property-based testing requires reproducibility for debugging failures and maintaining regression tests. Currently, FluentCheck provides seed-based reproducibility, but lacks:

1. **Path tracking**: No way to identify the exact generation path (e.g., `"42:7:s3"`) that led to a failure
2. **Replay API**: No way to reproduce a specific failure using both seed and path
3. **Regression examples**: No way to ensure specific test cases always run (e.g., known edge cases)
4. **Verbose mode**: Verbose logging exists via `CheckOptions.verbose` but lacks a fluent API method

These features are essential for:
- Debugging intermittent failures
- Creating regression test suites
- Reproducing bugs reported by users
- Maintaining test stability across runs

## What Changes

### Current Implementation Status vs Specification

**Mismatch Analysis:**

1. **Path Tracking** ❌ **NOT IMPLEMENTED**
   - **Specification:** Capture generation path (e.g., `"42:7:s3"`) for exact test case identification
   - **Current State:** No path tracking exists. `Explorer.traverse()` uses samples but doesn't record which sample indices were used
   - **Gap:** `FluentResult` has no `path` property; exploration doesn't track quantifier sample indices

2. **Replay API** ❌ **NOT IMPLEMENTED**
   - **Specification:** `.replay({ seed, path })` method to reproduce exact failures
   - **Current State:** No `.replay()` method exists on `FluentCheck`
   - **Gap:** Cannot reproduce failures using path; only seed-based reproducibility exists

3. **Regression Examples** ❌ **NOT IMPLEMENTED**
   - **Specification:** `.withExample()` / `.withExamples()` for always-run test cases
   - **Current State:** No methods exist for specifying regression examples
   - **Gap:** No way to ensure specific test cases always run before random generation

4. **Verbose Mode (Fluent API)** ⚠️ **PARTIALLY IMPLEMENTED**
   - **Specification:** `.verbose()` fluent method for debug output
   - **Current State:** `CheckOptions.verbose` exists and works, but no fluent `.verbose()` method
   - **Gap:** Users must pass `{ verbose: true }` to `.check()` instead of using fluent API

**Already Implemented (No Changes Needed):**
- ✅ Seed tracking: `FluentResult.seed` property exists and is included in error messages
- ✅ Seed-based RNG: `withGenerator()` allows setting a seed for deterministic generation
- ✅ Verbose logging infrastructure: `CheckOptions.verbose` enables verbose logging in `runCheck.ts`

### Proposed API

#### 1. Path Tracking

Capture generation path during test execution and include in `FluentResult`:

```typescript
const result = fc.scenario()
  .forall('x', fc.integer())
  .forall('y', fc.integer())
  .then(({ x, y }) => x + y === y + x)
  .check()

// result.path: "42:7" (example format - quantifier indices)
```

#### 2. Replay API

Reproduce exact failures using seed and path:

```typescript
fc.scenario()
  .forall('x', fc.integer())
  .replay({ seed: 1234567890, path: '42:7' })
  .then(({ x }) => x > 0)
  .check()
```

#### 3. Regression Examples

Ensure specific test cases always run:

```typescript
fc.scenario()
  .forall('x', fc.integer())
  .forall('y', fc.integer())
  .withExample({ x: 0, y: 0 })
  .withExample({ x: -1, y: 1 })
  .then(({ x, y }) => x + y === y + x)
  .check()
```

#### 4. Verbose Mode (Fluent API)

Add fluent method for verbose logging:

```typescript
fc.scenario()
  .forall('x', fc.integer())
  .verbose()  // Equivalent to check({ verbose: true })
  .then(({ x }) => x * x >= 0)
  .check()
```

## Impact

- **Affected specs:** `fluent-api`, `reporting`
- **Affected code:**
  - `src/FluentCheck.ts` - Add `.replay()`, `.withExample()`, `.withExamples()`, `.verbose()` methods
  - `src/FluentResult.ts` - Add `path` property
  - `src/check/runCheck.ts` - Implement path tracking and replay logic
  - `src/strategies/Explorer.ts` - Track generation path during exploration
- **Breaking:** None - all features are additive
- **Dependencies:** None

## Implementation Notes

1. **Path Format**: Use a simple string format like `"42:7:s3"` where numbers represent quantifier indices and optional shrink steps
2. **Replay Semantics**: When `.replay()` is used, skip random generation and use the specified path to reconstruct the exact test case
3. **Regression Examples**: Examples should run before random generation, ensuring they're always tested
4. **Verbose Method**: `.verbose()` should set `CheckOptions.verbose = true` for the subsequent `.check()` call
