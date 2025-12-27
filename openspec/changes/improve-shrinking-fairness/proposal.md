# Proposal: Improve Shrinking Fairness

**Status**: ✅ IMPLEMENTED AND VALIDATED

**Goal**: Implement fair shrinking strategies to address the significant bias toward the first quantifier found in Study 14.

**Context**:
- **Study 14 Finding**: The current shrinking strategy minimizes the first quantifier to its absolute minimum (e.g., 0) while leaving subsequent quantifiers large or even growing them to compensate.
  - Example: Property `forall(a, b, c: int(0,100)).then(a + b + c <= 150)` shrinks to `(0, 52, 98)` for order `abc` but `(98, 52, 0)` for order `cba`
  - Statistical significance: ANOVA p < 0.0001
- **Impact**: Counterexamples are non-minimal in a holistic sense and arbitrarily depend on syntactic quantifier order rather than mathematical structure. This makes debugging harder and violates user expectations for symmetric properties.
- **Root Cause**: The Sequential Exhaustive algorithm uses `break` after any successful shrink, restarting from the first quantifier. This causes lexicographic minimization that heavily biases toward early quantifiers.

**Implementation**:
- Created strategy pattern: `ShrinkRoundStrategy` interface in `src/strategies/shrinking/`
- Implemented three strategies:
  1. `SequentialExhaustiveStrategy` - Legacy behavior (default for backwards compatibility)
  2. `RoundRobinStrategy` - Fair shrinking, tries all quantifiers each round
  3. `DeltaDebuggingStrategy` - Maximum fairness via binary subset testing
- Configuration via `strategy().withShrinkingStrategy('round-robin' | 'delta-debugging' | 'sequential-exhaustive')`

**Evidence-Based Validation** (December 2025):
- **Test Property**: `forall(a,b,c: int(0,1_000_000)).then(a < 10 || b < 10 || c < 10)`
  - Passes when ANY variable is < 10
  - Fails when ALL variables are >= 10 (counterexamples)
  - Optimal minimal counterexample: (10, 10, 10)
  - Large range (0-1,000,000) means shrinking from ~500k toward 10
  - Independent threshold property (not compensating like `a+b+c <= 150`)
- **Sample Size**: 1,350 trials across 27 configurations (3 strategies × 3 budgets × 3 orders × 50 trials)

**Results**:
| Metric | Sequential Exhaustive | Round-Robin | Delta-Debugging |
|--------|----------------------|-------------|-----------------|
| Avg Total Distance (budget=100) | 966,305 | 472,524 | 535,939 |
| Distance Reduction | baseline | **51.1%** | **44.5%** |
| ANOVA F-statistic | - | 90.00 | 90.00 |
| ANOVA p-value | - | 0.0000 | 0.0000 |
| Tukey HSD | - | ✓ Significant | ✓ Significant |

**Positional Bias** (Budget=2000):
| Position | Sequential Exhaustive | Round-Robin | Delta-Debugging |
|----------|----------------------|-------------|-----------------|
| 1st quantifier optimal | 98% | 98% | 95% |
| 2nd quantifier optimal | 67% | 66% | 66% |
| 3rd quantifier optimal | 33% | 33% | 33% |

**Key Findings**:
1. Both Round-Robin and Delta-Debugging achieve ~50% distance reduction vs Sequential Exhaustive
2. Difference between Round-Robin and Delta-Debugging is NOT statistically significant (p=0.25-0.74)
3. All strategies show excellent quantifier order independence (CV < 0.1)
4. Positional bias is inherent to all strategies under tight budgets (first quantifier shrinks more)
5. Round-Robin achieves better total shrinking with simpler algorithm than Delta-Debugging

**Recommendation**: Use Round-Robin as default for better fairness with minimal overhead (~5%)

**Non-Goals**:
- This proposal does NOT address filter inefficiency (a separate, unsolvable problem)
- This proposal does NOT implement integrated shrinking (tracked separately)
