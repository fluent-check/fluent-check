#!/usr/bin/env python3
"""
Mapped Arbitrary Size Analysis: Do non-bijective maps cause size overestimation?

Analyzes whether non-bijective mappings cause size overestimation and quantifies
the ratio of reported size to actual distinct values.

Metrics:
- Size ratio: reported_size / actual_distinct_values
- Expected vs observed ratios for each map type
- Impact on union branch weighting accuracy

Generates:
- mapped-size.png: Size ratio comparison and impact analysis
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
from util import wilson_score_interval, format_ci, save_figure

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/mapped-size.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=== Mapped Arbitrary Size Analysis ===\n")

    # Load data
    print(f"Loading: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")

    # Define expected ratios
    expected_ratios = {
        'bijective': 1.0,           # x => x*2: 100 -> 100 distinct
        'surjective_10to1': 10.0,   # x => x%10: 100 -> 10 distinct
        'surjective_5to1': 5.0      # x => x%20: 100 -> 20 distinct
    }

    # Compute size ratio statistics by map type
    print("Size Ratio by Map Type:")
    print("=" * 80)

    ratio_stats = []
    for map_type in ['bijective', 'surjective_10to1', 'surjective_5to1']:
        data = df[df['map_type'] == map_type]

        mean_ratio = data['size_ratio'].mean()
        median_ratio = data['size_ratio'].median()
        std_ratio = data['size_ratio'].std()
        expected = expected_ratios[map_type]
        error = abs(mean_ratio - expected) / expected if expected > 0 else 0

        print(f"\n{map_type.replace('_', ' ').title()}:")
        print(f"  Observed:  mean={mean_ratio:.3f}, median={median_ratio:.3f}, std={std_ratio:.3f}")
        print(f"  Expected:  {expected:.3f}")
        print(f"  Error:     {error*100:.1f}%")

        ratio_stats.append({
            'map_type': map_type,
            'mean_ratio': mean_ratio,
            'median_ratio': median_ratio,
            'std_ratio': std_ratio,
            'expected_ratio': expected,
            'relative_error': error,
            'n': len(data)
        })

    print("=" * 80)

    # Analyze actual distinct values
    print("\n\nActual Distinct Values by Map Type:")
    print("=" * 80)

    for map_type in ['bijective', 'surjective_10to1', 'surjective_5to1']:
        data = df[df['map_type'] == map_type]

        mean_distinct = data['actual_distinct_values'].mean()
        median_distinct = data['actual_distinct_values'].median()
        std_distinct = data['actual_distinct_values'].std()

        print(f"{map_type.replace('_', ' ').title():20s}: " +
              f"mean={mean_distinct:.1f}, median={median_distinct:.1f}, std={std_distinct:.2f}")

    print("=" * 80)

    # Create visualizations
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Left panel: Size ratio comparison (bar chart)
    ax1 = axes[0]

    map_types = ['bijective', 'surjective_10to1', 'surjective_5to1']
    map_labels = {
        'bijective': 'Bijective\n(x => x*2)',
        'surjective_10to1': 'Surjective 10:1\n(x => x%10)',
        'surjective_5to1': 'Surjective 5:1\n(x => x%20)'
    }
    map_colors = {'bijective': '#2ecc71', 'surjective_10to1': '#e74c3c', 'surjective_5to1': '#f39c12'}

    x_pos = np.arange(len(map_types))
    observed_ratios = [next(s['mean_ratio'] for s in ratio_stats if s['map_type'] == mt)
                       for mt in map_types]
    expected = [expected_ratios[mt] for mt in map_types]
    std_ratios = [next(s['std_ratio'] for s in ratio_stats if s['map_type'] == mt)
                  for mt in map_types]

    width = 0.35
    ax1.bar(x_pos - width/2, observed_ratios, width, label='Observed',
            color=[map_colors[mt] for mt in map_types], alpha=0.8,
            yerr=std_ratios, capsize=5)
    ax1.bar(x_pos + width/2, expected, width, label='Expected',
            color='gray', alpha=0.5)

    ax1.set_xlabel('Map Type')
    ax1.set_ylabel('Size Ratio (Reported / Actual Distinct)')
    ax1.set_title('Size Estimation Error for Mapped Arbitraries')
    ax1.set_xticks(x_pos)
    ax1.set_xticklabels([map_labels[mt] for mt in map_types])
    ax1.legend()
    ax1.grid(True, axis='y', alpha=0.3)
    ax1.axhline(y=1.0, color='black', linestyle='--', alpha=0.3, linewidth=1, label='Perfect (1.0)')

    # Right panel: Impact on union weighting
    ax2 = axes[1]

    # Simulate union weighting error
    # If we have union(A, B) where B is surjective,
    # the weight should be proportional to actual size, not reported size
    #
    # Example: union(exact_100, surjective_10to1_100)
    # - Reported weights: 100 / (100+100) = 0.50 for each
    # - Actual weights should be: 100 / (100+10) = 0.91 for A, 0.09 for B
    # - Error: A is undersampled by 0.41, B is oversampled by 0.41

    scenarios = [
        {
            'name': 'Exact + Exact',
            'size_a': 100,
            'size_b': 100,
            'actual_a': 100,
            'actual_b': 100
        },
        {
            'name': 'Exact + Surj. 10:1',
            'size_a': 100,
            'size_b': 100,
            'actual_a': 100,
            'actual_b': 10
        },
        {
            'name': 'Exact + Surj. 5:1',
            'size_a': 100,
            'size_b': 100,
            'actual_a': 100,
            'actual_b': 20
        }
    ]

    scenario_names = []
    reported_weights_a = []
    actual_weights_a = []
    weight_errors = []

    for scenario in scenarios:
        sa, sb = scenario['size_a'], scenario['size_b']
        aa, ab = scenario['actual_a'], scenario['actual_b']

        reported_weight_a = sa / (sa + sb)
        actual_weight_a = aa / (aa + ab)
        error = abs(reported_weight_a - actual_weight_a)

        scenario_names.append(scenario['name'])
        reported_weights_a.append(reported_weight_a * 100)
        actual_weights_a.append(actual_weight_a * 100)
        weight_errors.append(error * 100)

    x_pos = np.arange(len(scenarios))
    width = 0.35

    ax2.bar(x_pos - width/2, reported_weights_a, width, label='Reported Weight (A)',
            color='#3498db', alpha=0.8)
    ax2.bar(x_pos + width/2, actual_weights_a, width, label='Actual Weight (A)',
            color='#e74c3c', alpha=0.8)

    ax2.set_xlabel('Union Scenario')
    ax2.set_ylabel('Branch A Selection Probability (%)')
    ax2.set_title('Impact on Union Branch Weighting')
    ax2.set_xticks(x_pos)
    ax2.set_xticklabels(scenario_names, rotation=15, ha='right')
    ax2.set_ylim(0, 105)
    ax2.legend()
    ax2.grid(True, axis='y', alpha=0.3)

    # Add error annotations
    for i, error in enumerate(weight_errors):
        if error > 1:
            ax2.text(i, max(reported_weights_a[i], actual_weights_a[i]) + 5,
                    f'Δ={error:.1f}%', ha='center', fontsize=8, color='red')

    plt.tight_layout()
    output_path = OUTPUT_DIR / "mapped-size.png"
    save_figure(fig, output_path)

    # Print conclusion
    print(f"\nConclusion:")
    print("-" * 80)

    # Check if ratios match expected
    all_accurate = all(s['relative_error'] < 0.05 for s in ratio_stats)

    if all_accurate:
        print(f"  ✓ Size ratios match expected values (all within 5%)")
    else:
        print(f"  Hypothesis validation:")
        for s in ratio_stats:
            if s['relative_error'] >= 0.05:
                print(f"    ⚠ {s['map_type']}: {s['relative_error']*100:.1f}% error " +
                      f"(observed={s['mean_ratio']:.2f}, expected={s['expected_ratio']:.2f})")
            else:
                print(f"    ✓ {s['map_type']}: {s['relative_error']*100:.1f}% error " +
                      f"(observed={s['mean_ratio']:.2f}, expected={s['expected_ratio']:.2f})")

    # Check impact on union weighting
    max_weight_error = max(weight_errors)
    if max_weight_error > 10:
        print(f"\n  ⚠ Significant union weighting error:")
        for name, error in zip(scenario_names, weight_errors):
            if error > 10:
                print(f"    • {name}: {error:.1f}% branch probability error")
        print(f"    → Non-bijective maps cause branch selection bias in unions")
    else:
        print(f"\n  ✓ Minimal union weighting impact (max error: {max_weight_error:.1f}%)")

    # Actionable recommendation
    if not all_accurate or max_weight_error > 10:
        print(f"\n  Actionable:")
        print(f"    • MappedArbitrary should detect non-injective maps and adjust size estimation")
        print(f"    • Consider sampling-based size estimation for mapped arbitraries")
        print(f"    • Document this limitation in API docs for map() method")

    print(f"\n✓ Mapped size analysis complete")

if __name__ == "__main__":
    main()
