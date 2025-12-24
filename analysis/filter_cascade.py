#!/usr/bin/env python3
"""
Filter Cascade Impact Analysis: Does size estimation degrade with filter depth?

Analyzes the accuracy of size estimation when filters are chained, and whether
credible intervals maintain proper coverage as chain depth increases.

Metrics:
- Relative error: (estimated - actual) / actual
- Credible interval coverage rate (target: 95%)
- Error accumulation pattern vs chain depth

Generates:
- filter-cascade.png: Estimation error and CI coverage analysis
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
from util import wilson_score_interval, format_ci, save_figure

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/filter-cascade.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=== Filter Cascade Impact Analysis ===\n")

    # Load data
    print(f"Loading: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")

    # Compute relative error statistics by chain depth × pass rate
    print("Relative Estimation Error by Chain Depth × Pass Rate:")
    print("=" * 80)

    error_stats = []
    for pass_rate in [0.5, 0.7, 0.9]:
        print(f"\nPass Rate {pass_rate*100:.0f}%:")
        for depth in [1, 2, 3, 5]:
            data = df[(df['chain_depth'] == depth) & (df['filter_pass_rate'] == pass_rate)]

            errors = data['relative_error']
            mean_error = errors.mean()
            median_error = errors.median()
            std_error = errors.std()

            print(f"  Depth {depth}: mean={mean_error*100:+6.2f}%, median={median_error*100:+6.2f}%, std={std_error*100:5.2f}%")

            error_stats.append({
                'pass_rate': pass_rate,
                'depth': depth,
                'mean_error': mean_error,
                'median_error': median_error,
                'std_error': std_error,
                'n': len(data)
            })

    print("=" * 80)

    # Compute credible interval coverage by chain depth
    print("\n\nCredible Interval Coverage (target: 95%):")
    print("=" * 80)

    coverage_stats = []
    for depth in [1, 2, 3, 5]:
        data = df[df['chain_depth'] == depth]

        coverage_count = data['true_value_in_ci'].sum()
        total = len(data)
        coverage_rate = coverage_count / total
        ci = wilson_score_interval(coverage_count, total)

        print(f"Depth {depth}: {coverage_rate*100:5.1f}% {format_ci(*ci)} ({coverage_count}/{total})")

        coverage_stats.append({
            'depth': depth,
            'coverage_rate': coverage_rate,
            'ci_lower': ci[0],
            'ci_upper': ci[1],
            'n': total
        })

    print("=" * 80)

    # Create visualizations
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Left panel: Relative error vs chain depth (line plot)
    ax1 = axes[0]

    pass_rate_colors = {0.5: '#e74c3c', 0.7: '#f39c12', 0.9: '#2ecc71'}
    pass_rate_labels = {0.5: '50% pass rate', 0.7: '70% pass rate', 0.9: '90% pass rate'}

    for pass_rate in [0.5, 0.7, 0.9]:
        pr_stats = [s for s in error_stats if s['pass_rate'] == pass_rate]
        depths = [s['depth'] for s in pr_stats]
        mean_errors = [s['mean_error'] * 100 for s in pr_stats]  # Convert to percentage
        std_errors = [s['std_error'] * 100 for s in pr_stats]

        ax1.plot(depths, mean_errors, marker='o', label=pass_rate_labels[pass_rate],
                color=pass_rate_colors[pass_rate], linewidth=2)
        ax1.fill_between(depths,
                         [m - s for m, s in zip(mean_errors, std_errors)],
                         [m + s for m, s in zip(mean_errors, std_errors)],
                         alpha=0.2, color=pass_rate_colors[pass_rate])

    ax1.axhline(y=0, color='black', linestyle='--', alpha=0.3, linewidth=1)
    ax1.set_xlabel('Chain Depth (number of filters)')
    ax1.set_ylabel('Relative Estimation Error (%)')
    ax1.set_title('Size Estimation Error vs Filter Chain Depth')
    ax1.set_xticks([1, 2, 3, 5])
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    # Right panel: CI coverage rate (bar chart)
    ax2 = axes[1]

    depths = [s['depth'] for s in coverage_stats]
    coverage_rates = [s['coverage_rate'] * 100 for s in coverage_stats]
    coverage_errors = [
        (s['coverage_rate'] - s['ci_lower'], s['ci_upper'] - s['coverage_rate'])
        for s in coverage_stats
    ]
    coverage_errors_array = np.array(coverage_errors).T * 100

    ax2.bar(depths, coverage_rates, yerr=coverage_errors_array, capsize=5,
            color='#3498db', alpha=0.8)
    ax2.axhline(y=95, color='red', linestyle='--', alpha=0.5, linewidth=2, label='95% target')
    ax2.set_xlabel('Chain Depth (number of filters)')
    ax2.set_ylabel('Credible Interval Coverage (%)')
    ax2.set_title('CI Coverage Rate vs Chain Depth')
    ax2.set_xticks([1, 2, 3, 5])
    ax2.set_ylim(0, 105)
    ax2.legend()
    ax2.grid(True, axis='y', alpha=0.3)

    plt.tight_layout()
    output_path = OUTPUT_DIR / "filter-cascade.png"
    save_figure(fig, output_path)

    # Print conclusion
    print(f"\nConclusion:")
    print("-" * 80)

    # Check CI coverage
    avg_coverage = np.mean([s['coverage_rate'] for s in coverage_stats])
    all_above_90 = all(s['coverage_rate'] >= 0.90 for s in coverage_stats)

    if all_above_90:
        print(f"  ✓ Credible intervals maintain good coverage: {avg_coverage*100:.1f}% average")
        print(f"    All depths achieve >90% coverage (target: 95%)")
    else:
        print(f"  ⚠ Some depths have insufficient coverage:")
        for s in coverage_stats:
            if s['coverage_rate'] < 0.90:
                print(f"    • Depth {s['depth']}: {s['coverage_rate']*100:.1f}% (below 90%)")

    # Check error accumulation
    print(f"\n  Error accumulation pattern:")
    for pass_rate in [0.5, 0.7, 0.9]:
        pr_stats = [s for s in error_stats if s['pass_rate'] == pass_rate]
        depth1_error = next(s['mean_error'] for s in pr_stats if s['depth'] == 1)
        depth5_error = next(s['mean_error'] for s in pr_stats if s['depth'] == 5)

        if abs(depth5_error) > abs(depth1_error) * 2:
            print(f"    ⚠ {pass_rate*100:.0f}% pass rate: Error grows from {depth1_error*100:+.1f}% to {depth5_error*100:+.1f}%")
        else:
            print(f"    ✓ {pass_rate*100:.0f}% pass rate: Stable ({depth1_error*100:+.1f}% → {depth5_error*100:+.1f}%)")

    print(f"\n✓ Filter cascade analysis complete")

if __name__ == "__main__":
    main()
