# Design: Sampling-Based Size Estimation

## Problem
Static size calculation works for `integer`, `boolean`, `array` (if elements known).
It fails for:
1. `filter(p)`: We don't know $P(p(x))$. Assumed size = Base Size.
2. `map(f)`: We don't know if $f$ is bijective. Assumed size = Base Size.

## Solution
Use Monte Carlo sampling to estimate the "effective size".

### Filter
Sample $N$ items from base. Count $K$ that pass.
$Size_{est} = Size_{base} \times (K/N)$.
Confidence interval can be calculated. If $K=0$, assume small non-zero or fallback.

### Map
Sample $N$ items. Count unique outputs $U$.
Estimate collision rate $C = 1 - U/N$.
$Size_{est} = Size_{base} \times (1 - C)$?
Actually, "Birthday Problem" logic applies.
Better: check for duplicates in small sample.
If $N$ is small compared to domain, collisions might be 0 even if map is 2-to-1 globally.
**Refinement**: Use "Deduplication Study" logic.
Sample $N$. If $Unique \ll N$, likely small domain.
If $Unique \approx N$, assume large domain.

## Architecture
- **`Arbitrary.estimateSize(sampler, budget)`**:
  - Default: return `this.size()`.
  - **`FilterArbitrary`**: Sample, compute pass rate.
  - **`MappedArbitrary`**: Sample, compute collision rate? (Harder/more expensive). Maybe opt-in?
- **Integration**:
  - `FluentCheck` exploration start:
    - Pre-sampling phase?
    - "Calibration" phase before running tests?

## Trade-offs
- **Performance**: Sampling takes time. Should only run once per `check()`.
- **Accuracy**: Small budget = high variance.
- **Safety**: Don't want to exhaust RNG budget on estimation.

## Strategy
Start with **Filter** estimation as it's the worst offender (exponential error).
Map estimation is secondary.
