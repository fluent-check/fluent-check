#!/usr/bin/env python3
"""
Weighted Union Probability Analysis: Does union sampling match size-based weighting?

Tests whether ArbitraryComposite selects branches with probability proportional
to their sizes. Uses chi-squared goodness-of-fit to compare observed frequencies
against theoretical expectations.

Metrics:
- Empirical branch 0 frequency per union type
- Chi-squared goodness-of-fit (observed vs expected)
- Residual deviation from theoretical probability

Generates:
- weighted-union.png: Observed vs expected frequencies and residual analysis
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
from scipy import stats
from util import wilson_score_interval, format_ci, save_figure

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/weighted-union.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=== Weighted Union Probability Analysis ===\n")

    # Load data
    print(f"Loading: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")

    # Compute empirical frequencies and compare to theoretical
    print("Chi-Squared Goodness-of-Fit Test:")
    print("=" * 80)

    results = []
    for union_type in df['union_type'].unique():
        type_df = df[df['union_type'] == union_type]

        # Get expected probability (same for all trials of this type)
        expected_p0 = type_df['expected_p0'].iloc[0]

        # Aggregate counts across all trials
        total_branch0 = type_df['branch0_count'].sum()
        total_branch1 = type_df['branch1_count'].sum()
        total_samples = total_branch0 + total_branch1

        # Observed frequency
        observed_p0 = total_branch0 / total_samples if total_samples > 0 else 0

        # Wilson score CI for observed proportion
        ci = wilson_score_interval(total_branch0, total_samples)

        # Chi-squared goodness-of-fit test
        # H0: observed frequencies match expected proportions
        observed = np.array([total_branch0, total_branch1])
        expected = np.array([expected_p0 * total_samples, (1 - expected_p0) * total_samples])
        chi2, p_value = stats.chisquare(observed, expected)

        # Residual (deviation from expected)
        residual = observed_p0 - expected_p0

        print(f"\n{union_type}:")
        print(f"  Expected P(branch 0): {expected_p0:.4f}")
        print(f"  Observed P(branch 0): {observed_p0:.4f} {format_ci(*ci)}")
        print(f"  Residual: {residual:+.4f}")
        print(f"  Total samples: {total_samples:,}")
        print(f"  χ² = {chi2:.2f}, df = 1, p = {p_value:.4f} {'*' if p_value < 0.05 else ''}")

        results.append({
            'union_type': union_type,
            'expected_p0': expected_p0,
            'observed_p0': observed_p0,
            'ci_lower': ci[0],
            'ci_upper': ci[1],
            'residual': residual,
            'chi2': chi2,
            'p_value': p_value,
            'total_samples': total_samples
        })

    print("=" * 80)

    # Create visualizations
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Left panel: Observed vs Expected with error bars
    ax1 = axes[0]

    union_labels = [r['union_type'].replace('_', '\n') for r in results]
    x = np.arange(len(union_labels))
    width = 0.35

    expected_values = [r['expected_p0'] for r in results]
    observed_values = [r['observed_p0'] for r in results]
    observed_errors = [(r['observed_p0'] - r['ci_lower'], r['ci_upper'] - r['observed_p0']) for r in results]

    # Transpose error arrays
    observed_errors_array = np.array(observed_errors).T

    # Plot expected as markers
    ax1.scatter(x, expected_values, color='red', marker='D', s=100, label='Expected', zorder=3)

    # Plot observed as bars with error bars
    ax1.bar(x, observed_values, width, label='Observed',
            yerr=observed_errors_array, capsize=5, color='#3498db', alpha=0.7)

    ax1.set_xlabel('Union Type')
    ax1.set_ylabel('Probability of Selecting Branch 0')
    ax1.set_title('Observed vs Expected Branch Selection Probability')
    ax1.set_xticks(x)
    ax1.set_xticklabels(union_labels, fontsize=8)
    ax1.set_ylim(0, 1.05)
    ax1.legend()
    ax1.grid(True, axis='y', alpha=0.3)

    # Add reference line at p=0.5
    ax1.axhline(y=0.5, color='gray', linestyle=':', alpha=0.5, linewidth=1)

    # Right panel: Residual plot
    ax2 = axes[1]

    residuals = [r['residual'] for r in results]
    colors = ['green' if abs(r) < 0.01 else 'orange' if abs(r) < 0.02 else 'red' for r in residuals]

    ax2.bar(x, residuals, width, color=colors, alpha=0.7)
    ax2.axhline(y=0, color='black', linestyle='-', linewidth=1)
    ax2.axhline(y=0.01, color='red', linestyle='--', alpha=0.5, linewidth=1, label='±1% deviation')
    ax2.axhline(y=-0.01, color='red', linestyle='--', alpha=0.5, linewidth=1)

    ax2.set_xlabel('Union Type')
    ax2.set_ylabel('Residual (Observed - Expected)')
    ax2.set_title('Deviation from Theoretical Probability')
    ax2.set_xticks(x)
    ax2.set_xticklabels(union_labels, fontsize=8)
    ax2.legend()
    ax2.grid(True, axis='y', alpha=0.3)

    plt.tight_layout()
    output_path = OUTPUT_DIR / "weighted-union.png"
    save_figure(fig, output_path)

    # Print conclusion
    print(f"\nConclusion:")
    print("-" * 80)

    # Check if all unions pass goodness-of-fit (p > 0.05)
    all_pass = all(r['p_value'] > 0.05 for r in results)

    # Check if residuals are small (< 2%)
    small_residuals = all(abs(r['residual']) < 0.02 for r in results)

    if all_pass and small_residuals:
        print(f"  ✓ Hypothesis supported: Weighted union selection matches")
        print(f"    theoretical proportions (χ² p > 0.05, residuals < 2%)")
    elif all_pass:
        print(f"  ✓ Hypothesis supported: Chi-squared tests pass (p > 0.05)")
        print(f"  ⚠ Note: Some residuals > 2% but within statistical noise")
    else:
        print(f"  ✗ Hypothesis not supported: Some union types show")
        print(f"    significant deviation from expected proportions")

    # Report any concerning deviations
    for r in results:
        if r['p_value'] < 0.05:
            print(f"  ⚠ {r['union_type']}: Significant deviation (p={r['p_value']:.4f})")
        elif abs(r['residual']) > 0.02:
            print(f"  • {r['union_type']}: Large residual ({r['residual']:+.4f}), but not statistically significant")

    print(f"\n✓ Weighted union analysis complete")

if __name__ == "__main__":
    main()
