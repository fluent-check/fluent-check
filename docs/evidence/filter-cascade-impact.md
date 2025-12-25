# Filter Cascade Impact Study

This document presents empirical evidence regarding size estimation accuracy when chaining multiple filters (`.filter().filter()...`). The study investigates whether estimation errors accumulate exponentially and if credible intervals maintain statistical validity.

## The Problem: Size Estimation in Filter Chains

Accurate size estimation is crucial for:
1.  **Confidence calculations**: Knowing if we've covered enough of the space.
2.  **Termination decisions**: Stopping early if the space is exhausted.
3.  **Union weighting**: Ensuring fair sampling across `oneof` branches.

Filters introduce uncertainty: we can only *estimate* the size of a filtered set by sampling. When filters are chained, these estimation errors can compound.

### Hypothesis

Size estimation accuracy degrades with filter chain depth, leading to potentially exponential error growth if estimators are not properly calibrated or if they fail to account for the filtering effect during initialization ("cold start" problem).

---

## Method

-   **Base Arbitrary**: `integer(0, 999)` (Size = 1000)
-   **Chain Depths**: 1, 2, 3, 5 filters
-   **Filter Pass Rates**: 50%, 70%, 90% (simulated using modulo arithmetic)
-   **Metrics**:
    -   **Relative Error**: `(Estimated - Actual) / Actual`
    -   **Credible Interval Coverage**: Percentage of trials where the true size falls within the reported 95% CI.
-   **Trials**: 600 total trials (50 per configuration)

---

## Results

### Size Estimation Error

| Pass Rate | Depth 1 | Depth 2 | Depth 3 | Depth 5 |
| :--- | :--- | :--- | :--- | :--- |
| **50%** | +116.0% | +309.8% | +762.1% | +3603.7% |
| **70%** | +47.9% | +109.2% | +211.5% | +571.1% |
| **90%** | +13.6% | +26.7% | +43.9% | +78.6% |

*> Positive values indicate overestimation. +100% means the estimate is 2x the actual size.*

**Key Finding**: The relative error grows exponentially with chain depth.
-   At Depth 1 (50% pass), the estimate is ~2x actual (+116%).
-   At Depth 5 (3.1% cumulative pass), the estimate is ~37x actual (+3603%).

### Credible Interval Coverage

| Depth | Coverage (Target: 95%) | Interpretation |
| :--- | :--- | :--- |
| **1** | **0.0%** | Fails completely |
| **2** | **0.0%** | Fails completely |
| **3** | **0.0%** | Fails completely |
| **5** | **0.0%** | Fails completely |

**Key Finding**: The credible intervals **never** contain the true value. The estimator is confidently incorrect.

---

## Analysis: The "Cold Start" Failure

The study reveals a critical implementation flaw in `FilteredArbitrary` regarding its initial state.

1.  **Optimistic Initialization**: The `BetaDistribution` used for estimation initializes to `(2, 1)`. This represents a prior belief that the pass rate is high (mode at 1.0).
2.  **Estimation Before Sampling**: The `size()` method is often called *before* any values are generated (to plan testing strategy).
3.  **No Warm-up**: Without samples to update the Beta distribution, `size()` uses the prior.
4.  **Result**: The estimator reports the size of the *base* arbitrary (e.g., 1000) regardless of the filter chain.

**Why Error Grows Exponentially:**
If we have a chain of 5 filters, each passing 50%, the true size is $1000 \times 0.5^5 \approx 31$.
The estimator, having seen 0 samples, estimates the size as $1000 \times 1.0^5 = 1000$.
$	ext{Error} = \frac{1000 - 31}{31} \approx 31.25 \times 	ext{Actual} \rightarrow +3125%$

This matches the observed +3603% error (variance due to small sample randomness).

---

## Conclusions

### 1. Estimation is Broken for Unsampled Chains
The current implementation cannot estimate the size of a filtered arbitrary until it has been "warmed up" with samples. This is a significant limitation for static analysis or test planning features that rely on `size()` before execution.

### 2. Credible Intervals are Misleading
Because the estimator is biased (optimistic prior) and reports high confidence (tight bounds around the optimistic mode) before seeing data, the reported CIs are actively misleading, providing false assurance of a much larger search space.

### 3. Impact on Users
-   **Test Budgeting**: FluentCheck may vastly underestimate the difficulty of finding values, leading to timeouts on sparse filters.
-   **Unions**: `fc.oneof(filtered_arb, other_arb)` will be heavily biased *towards* the filtered arbitrary because it thinks it's much larger than it is.

---

## Recommendations

1.  **Pessimistic Priors**: Change initialization to `Beta(0.5, 0.5)` (Jeffrey's prior) or `Beta(1, 1)` (Uniform) to reflect true uncertainty before sampling.
2.  **Warm-up Sampling**: Trigger a small batch of internal samples (e.g., 10 probes) upon instantiation or the first `size()` call to ground the estimate in reality.
3.  **Recursive Estimation**: If possible, allow filters to compose estimates. If a user writes `.filter(x => x > 0)`, we can't know the rate. But if we chain known distributions, we might do better. (Hard in general case).
4.  **Documentation**: Explicitly warn users that `size()` on filtered arbitraries is an upper bound (often loose) until sampling begins.
