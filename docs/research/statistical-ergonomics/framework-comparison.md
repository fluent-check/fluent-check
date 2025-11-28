# Framework Comparison: Statistical Features in Property-Based Testing

This document compares statistical features across major property-based testing frameworks to inform FluentCheck's API design.

## Executive Summary

| Feature | QuickCheck | Hypothesis | fast-check | JSVerify | FluentCheck (Current) |
|---------|-----------|------------|------------|----------|----------------------|
| Label/Classify | ✅ `label`, `classify`, `collect`, `tabulate` | ✅ `note`, `event` | ✅ `fc.statistics` | ❌ | ❌ |
| Coverage Requirements | ✅ `cover`, `checkCoverage` | ❌ | ❌ | ❌ | ❌ |
| Confidence-Based Stopping | ✅ Sequential via `checkCoverage` | ❌ | ❌ | ❌ | ❌ |
| Statistics in Result | ✅ Detailed | ✅ Phase-based | ✅ Basic | ❌ | ❌ (seed only) |
| Adaptive Sampling | ❌ | ✅ Example database | ❌ | ❌ | ❌ |
| Verbosity Levels | ✅ | ✅ 4 levels | ✅ 3 levels | ❌ | ❌ |
| Health Checks | ❌ | ✅ Comprehensive | ❌ | ❌ | ❌ |
| Shrinking Statistics | ✅ | ✅ | ✅ | ✅ | ❌ |

## Detailed Analysis

### 1. QuickCheck (Haskell)

QuickCheck is the gold standard for property-based testing statistics.

#### Classification API

```haskell
-- label: unconditionally label every test case
prop_reverse :: [Int] -> Property
prop_reverse xs = label (show (length xs)) $ reverse (reverse xs) == xs

-- classify: conditional labeling
prop_sort :: [Int] -> Property
prop_sort xs = 
  classify (length xs < 5) "small" $
  classify (length xs >= 5 && length xs < 20) "medium" $
  classify (length xs >= 20) "large" $
  sort (sort xs) == sort xs

-- collect: collect values and show distribution
prop_insert :: Int -> [Int] -> Property
prop_insert x xs = collect (length xs) $ elem x (insert x xs)

-- tabulate: like collect but with named tables
prop_ordered :: [Int] -> Property
prop_ordered xs = tabulate "List lengths" [show (length xs)] $
                  tabulate "Signs" [if x >= 0 then "positive" else "negative" | x <- xs] $
                  ordered (sort xs)
```

**Output Example:**
```
+++ OK, passed 100 tests:
70% small
25% medium
 5% large

List lengths:
  0-9:   45%
  10-19: 35%
  20+:   20%
```

#### Coverage Requirements

```haskell
-- cover: require minimum coverage (soft warning)
prop_reverse :: [Int] -> Property
prop_reverse xs = 
  cover 50 (length xs > 10) "long list" $
  reverse (reverse xs) == xs

-- checkCoverage: enforce coverage statistically
prop_reverse_checked :: [Int] -> Property
prop_reverse_checked xs = 
  checkCoverage $
  cover 50 (length xs > 10) "long list" $
  cover 10 (length xs > 50) "very long" $
  reverse (reverse xs) == xs
```

**Key Insight**: `checkCoverage` uses sequential statistical testing to continue running tests until coverage requirements are met with 99% confidence or proven impossible.

#### Statistical Model

QuickCheck's `checkCoverage` uses a one-sided binomial test:
- **Null hypothesis**: True coverage equals required coverage
- **Alternative**: True coverage is less than required
- **Test**: Wilson score confidence interval
- **Stopping rule**: Stop when lower bound of CI exceeds requirement, or when upper bound is below requirement (failure)

### 2. Hypothesis (Python)

Hypothesis focuses on practical debugging over statistical reporting.

#### Statistics and Events

```python
from hypothesis import given, settings, Verbosity, event
from hypothesis.strategies import lists, integers

@given(lists(integers()))
def test_sort_idempotent(xs):
    event(f"length={len(xs)}")
    assert sorted(sorted(xs)) == sorted(xs)

# Run with: pytest --hypothesis-show-statistics
```

**Output Example:**
```
test_sort_idempotent:
  - 100 passing examples, 0 failing examples
  - Typical runtimes: 0-1 ms
  - Fraction of time spent in data generation: ~50%
  - Events:
    - length=0: 15.0%
    - length=1: 12.3%
    - length=2-5: 35.7%
    - length=6+: 37.0%
```

#### Verbosity Levels

```python
from hypothesis import settings, Verbosity

@settings(verbosity=Verbosity.quiet)    # No output
@settings(verbosity=Verbosity.normal)   # Default, shows counterexamples
@settings(verbosity=Verbosity.verbose)  # Shows each example tried
@settings(verbosity=Verbosity.debug)    # Internal debugging info
```

#### Health Checks

```python
from hypothesis import HealthCheck, settings

@settings(suppress_health_check=[
    HealthCheck.too_slow,           # Data generation is slow
    HealthCheck.filter_too_much,    # Too many values filtered
    HealthCheck.data_too_large,     # Generated data is very large
    HealthCheck.large_base_example, # Base example is very large
])
def test_complex(data):
    ...
```

**Health Check Categories:**
- `too_slow`: Test execution takes too long
- `filter_too_much`: More than 50% of values are filtered
- `data_too_large`: Generated data exceeds size limits
- `large_base_example`: Initial example is suspiciously large
- `not_a_test_method`: Decorated function isn't a test

#### Example Database

Hypothesis stores interesting examples (failures, unique code paths) in a database:
- Replays known failures first
- Builds up knowledge of edge cases over time
- Enables "adaptive" testing based on history

### 3. fast-check (JavaScript)

fast-check provides basic statistics and verbose reporting.

#### Statistics Function

```typescript
import * as fc from 'fast-check'

// Analyze arbitrary distribution
fc.statistics(
  fc.integer({ min: 1, max: 100 }),
  (value) => {
    if (value <= 10) return '1-10'
    if (value <= 50) return '11-50'
    return '51-100'
  },
  { numRuns: 10000 }
)

// Output:
// 1-10:   10.2% (1020)
// 11-50:  40.1% (4010)
// 51-100: 49.7% (4970)
```

#### Verbose Mode

```typescript
fc.assert(
  fc.property(fc.array(fc.integer()), (arr) => {
    return arr.sort().length === arr.length
  }),
  { verbose: 2 }  // 0=none, 1=default, 2=full
)
```

**Verbose Output Includes:**
- All failing examples encountered
- Shrinking attempts and results
- Seed information for reproduction

#### Reporter API

```typescript
// Custom reporter
fc.assert(property, {
  reporter: (runDetails) => {
    console.log(`Tests run: ${runDetails.numRuns}`)
    console.log(`Shrinks: ${runDetails.numShrinks}`)
    console.log(`Seed: ${runDetails.seed}`)
    if (runDetails.failed) {
      console.log(`Counterexample: ${runDetails.counterexample}`)
    }
  }
})
```

### 4. JSVerify (JavaScript)

JSVerify provides minimal statistical features.

#### Basic API

```javascript
var jsc = require('jsverify')

// No built-in classification or statistics
var prop = jsc.forall('nat', function(n) {
  return n >= 0
})

jsc.check(prop, { tests: 100 })
// Output: OK, passed 100 tests
```

**Limitations:**
- No label/classify functionality
- No coverage requirements
- No statistics collection
- Basic shrinking without statistics

### 5. Other Notable Frameworks

#### PropEr (Erlang)

```erlang
% Aggregate for statistics
?FORALL(Xs, list(integer()),
  aggregate(with_title('List Length'), length(Xs),
    lists:reverse(lists:reverse(Xs)) =:= Xs))

% Coverage with targeted generation
?FORALL_TARGETED(Xs, list(integer()),
  ?MAXIMIZE(length(Xs)),
  length(lists:sort(Xs)) =:= length(Xs))
```

#### ScalaCheck

```scala
// Collect for statistics
property("sort idempotent") = forAll { (xs: List[Int]) =>
  collect(xs.length / 10 * 10) {
    xs.sorted.sorted == xs.sorted
  }
}

// Coverage checking (limited)
property("with coverage") = forAll { (xs: List[Int]) =>
  classify(xs.isEmpty, "empty") {
    classify(xs.length > 100, "large") {
      xs.sorted == xs.sorted.sorted
    }
  }
}
```

## Key Insights for FluentCheck

### 1. Classification is Essential

All mature frameworks provide some form of test case classification:
- **QuickCheck**: Most comprehensive (`label`, `classify`, `collect`, `tabulate`)
- **Hypothesis**: Event-based (`event()` with statistics output)
- **fast-check**: Separate statistics function (`fc.statistics`)

**Recommendation**: Adopt QuickCheck-style fluent classification integrated into the test chain.

### 2. Coverage Requirements are Unique to QuickCheck

QuickCheck's `cover`/`checkCoverage` is unique and valuable:
- Specifies minimum coverage percentages
- Uses sequential statistical testing for verification
- Provides actionable failure messages

**Recommendation**: Implement coverage requirements with statistical verification.

### 3. Verbosity is Consistently Important

All frameworks provide verbosity controls:
- Hypothesis: 4 levels (quiet, normal, verbose, debug)
- fast-check: 3 levels (0, 1, 2)
- QuickCheck: via GHC flags

**Recommendation**: Implement at least 3 verbosity levels.

### 4. Result Statistics Vary Widely

| Framework | Result Contains |
|-----------|----------------|
| QuickCheck | Labels, coverage, counts, seed |
| Hypothesis | Phase info, events, timing |
| fast-check | Runs, shrinks, seed, counterexample |
| JSVerify | Pass/fail only |
| FluentCheck | satisfiable, example, seed |

**Recommendation**: Extend `FluentResult` with comprehensive statistics.

### 5. Adaptive Features are Emerging

- Hypothesis's example database enables learning across runs
- Targeted property-based testing (PropEr) adjusts generation to explore edge cases
- No framework has true real-time adaptive sampling

**Recommendation**: Plan for adaptive features in later phases.

## Gap Analysis: FluentCheck

### Current State

FluentCheck has sophisticated internal statistics (Beta, Beta-Binomial distributions for size estimation) but exposes almost nothing to users:

```typescript
// Current FluentResult
interface FluentResult<Rec> {
  satisfiable: boolean
  example: Rec
  seed?: number
}
```

### Missing Features (Priority Order)

1. **High Priority**
   - Label/classify for test case categorization
   - Statistics in result (tests run, time, labels)
   - Verbosity levels for debugging

2. **Medium Priority**
   - Coverage requirements (`cover`, `checkCoverage`)
   - Confidence-based termination
   - Detailed arbitrary statistics

3. **Lower Priority**
   - Adaptive sampling
   - Example database
   - Health checks

## Proposed FluentCheck Statistical Features

Based on this analysis, the following features are recommended:

### Phase 1: Foundation
- `FluentStatistics` interface with basic metrics
- `statistics` field in `FluentResult`
- Verbosity configuration

### Phase 2: Classification
- `.classify(predicate, label)` method
- `.label(fn)` method for dynamic labeling
- `.collect(fn)` for value distribution
- Label counts in statistics

### Phase 3: Coverage
- `.cover(percentage, predicate, label)` method
- `.checkCoverage()` terminal with statistical verification
- Coverage results in statistics

### Phase 4: Confidence
- `.withConfidence(level)` strategy option
- `.checkWithConfidence(level)` terminal
- Bayesian confidence in statistics

### Phase 5: Advanced
- Detailed arbitrary statistics (opt-in)
- Adaptive sampling strategy
- Health checks

## References

1. QuickCheck Documentation: https://hackage.haskell.org/package/QuickCheck
2. Hypothesis Documentation: https://hypothesis.readthedocs.io/
3. fast-check Documentation: https://fast-check.dev/
4. JSVerify Documentation: https://jsverify.github.io/
5. Claessen, K. and Hughes, J. "QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs" (2000)
6. MacIver, D. "Hypothesis: A new approach to property-based testing" (2019)
