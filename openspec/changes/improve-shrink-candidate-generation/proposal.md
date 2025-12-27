# Proposal: Improve Shrink Candidate Generation

**Status**: INVESTIGATION COMPLETE - NO CHANGES NEEDED

**Goal**: Investigate whether shrink candidate generation could be improved.

**Investigation Summary**:

We investigated whether shrinking could be improved by using `sampleWithBias()` instead of `sample()` for shrink candidates. The investigation revealed that **random sampling is actually correct** for the general case.

**Key Findings**:

### 1. Current Implementation Uses Random Sampling
```typescript
// ExecutableScenario.ts line 47-48
const shrink = (pick: FluentPick<A>, sampler: Sampler, count: number) =>
  sampler.sample(q.arbitrary.shrink(pick), count)  // Random sampling
```

### 2. We Tested `sampleWithBias()` - It Was WORSE
Changed to `sampleWithBias()` and re-ran the study:

| Budget | Metric | Random (`sample`) | Biased (`sampleWithBias`) |
|--------|--------|-------------------|---------------------------|
| 2000 | Pos1 Distance | 0 | 0 |
| 2000 | Pos2 Distance | 4 | 28 |
| 2000 | Pos2 Optimal% | 83.7% | 21.3% |

**Biased sampling performed worse!**

### 3. Why Biased Sampling Fails

For the test property `a < 10 || b < 10 || ...`:
- **Optimal counterexample**: (10, 10, 10, 10, 10) - NOT (0, 0, 0, 0, 0)
- **Corner cases for shrink space**: `[0, midpoint, max-1]`

The problem:
1. Corner case 0 is always tried first → **REJECTED** (property passes at 0)
2. Corner case midpoint (2.5M) is tried next → Accepted but still far from 10
3. Process repeats: 0 rejected, ~1.25M accepted, 0 rejected, ~625K accepted...
4. **Binary search toward 0, but 0 is never valid!**

With random sampling:
- Might randomly hit a value like 500 (between 10 and current)
- 500 is a valid counterexample (>= 10) AND closer to optimal than midpoint
- More exploration of the valid counterexample space

### 4. The General Case

Corner case optimization works when optimal is AT a corner (0 or max).
But for properties where optimal is **in the middle** of the range:
- Random sampling explores more of the valid space
- Biased sampling wastes attempts on rejected corner cases

### 5. Budget Requirements

From value N to optimal O requires:
- Best case (optimal at corner): O(log N) steps
- Worst case (optimal in middle): O(N) random attempts on average
- Practical case: somewhere in between

**Conclusion**:
The current random sampling approach is correct for the general case. Using biased sampling would optimize for a specific case (optimal at corner) at the expense of the general case.

**Recommendations**:
1. **Keep current `sample()` approach** - it's more general
2. Strategies like Round-Robin help by distributing budget fairly across quantifiers
3. For very large ranges, users should increase shrink budget

**Future Consideration**:
A hybrid approach could be explored:
- Try corner cases first (quick check for common case)
- If corners rejected, fall back to random sampling
- But this adds complexity for marginal benefit
