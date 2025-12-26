#!/usr/bin/env python3
"""
Deduplication Efficiency Analysis: Does deduplication improve unique value coverage?

Analyzes the efficiency of deduplication in maximizing unique value coverage
and measures the overhead cost. Tests termination guard trigger rates.

Metrics:
- Unique/requested ratio: Proportion of requested samples that are unique
- Termination guard trigger rate: Proportion of trials hitting termination guard
- Time overhead: Ratio of deduping time to random time

Generates:
- deduplication.png: Unique coverage and termination guard analysis
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
from util import wilson_score_interval, format_ci, save_figure, cohens_h, effect_size_interpretation

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/deduplication.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=== Deduplication Efficiency Analysis ===\n")

    # Load data
    print(f"Loading: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")

    # Add derived columns
    df['unique_ratio'] = df['unique_count'] / df['requested_count']

    # Compute unique ratio statistics by arbitrary type × sampler type
    print("Unique Coverage Ratio by Arbitrary Type × Sampler:")
    print("=" * 80)

    coverage_stats = []
    for arb_type in ['exact', 'non_injective', 'filtered']:
        print(f"\n{arb_type.replace('_', ' ').title()}:")
        for sampler in ['deduping', 'random']:
            data = df[(df['arbitrary_type'] == arb_type) & (df['sampler_type'] == sampler)]

            mean_ratio = data['unique_ratio'].mean()
            median_ratio = data['unique_ratio'].median()
            std_ratio = data['unique_ratio'].std()

            print(f"  {sampler.capitalize():10s}: mean={mean_ratio:.3f}, median={median_ratio:.3f}, std={std_ratio:.3f}")

            coverage_stats.append({
                'arb_type': arb_type,
                'sampler': sampler,
                'mean_ratio': mean_ratio,
                'median_ratio': median_ratio,
                'std_ratio': std_ratio,
                'n': len(data)
            })

    print("=" * 80)

    # Analyze termination guard trigger rates
    print("\n\nTermination Guard Trigger Rates:")
    print("=" * 80)

    guard_stats = []
    for arb_type in ['exact', 'non_injective', 'filtered']:
        # Only deduping sampler can trigger guard
        data = df[(df['arbitrary_type'] == arb_type) & (df['sampler_type'] == 'deduping')]

        triggered = data['termination_guard_triggered'].sum()
        total = len(data)
        rate = triggered / total if total > 0 else 0
        ci = wilson_score_interval(triggered, total)

        print(f"{arb_type.replace('_', ' ').title():20s}: {rate*100:5.1f}% {format_ci(*ci)} ({triggered}/{total})")

        guard_stats.append({
            'arb_type': arb_type,
            'trigger_rate': rate,
            'ci_lower': ci[0],
            'ci_upper': ci[1],
            'triggered': triggered,
            'total': total
        })

    print("=" * 80)

    # Analyze time overhead
    print("\n\nTime Overhead (Deduping vs Random):")
    print("=" * 80)

    time_stats = []
    for arb_type in ['exact', 'non_injective', 'filtered']:
        dedup_data = df[(df['arbitrary_type'] == arb_type) & (df['sampler_type'] == 'deduping')]
        random_data = df[(df['arbitrary_type'] == arb_type) & (df['sampler_type'] == 'random')]

        dedup_mean_time = dedup_data['elapsed_micros'].mean()
        random_mean_time = random_data['elapsed_micros'].mean()
        overhead_ratio = dedup_mean_time / random_mean_time if random_mean_time > 0 else 0

        print(f"{arb_type.replace('_', ' ').title():20s}: {overhead_ratio:.2f}x " +
              f"({dedup_mean_time:.0f}µs vs {random_mean_time:.0f}µs)")

        time_stats.append({
            'arb_type': arb_type,
            'overhead_ratio': overhead_ratio,
            'dedup_mean': dedup_mean_time,
            'random_mean': random_mean_time
        })

    print("=" * 80)

    # Create visualizations
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Left panel: Unique coverage by requested count
    ax1 = axes[0]

    arb_types = ['exact', 'non_injective', 'filtered']
    arb_labels = {'exact': 'Exact (100 distinct)',
                  'non_injective': 'Non-injective (10 distinct)',
                  'filtered': 'Filtered (10 distinct)'}
    arb_colors = {'exact': '#2ecc71', 'non_injective': '#e74c3c', 'filtered': '#f39c12'}

    requested_counts = sorted(df['requested_count'].unique())

    for arb_type in arb_types:
        dedup_ratios = []
        random_ratios = []

        for req_count in requested_counts:
            dedup_data = df[(df['arbitrary_type'] == arb_type) &
                           (df['sampler_type'] == 'deduping') &
                           (df['requested_count'] == req_count)]
            random_data = df[(df['arbitrary_type'] == arb_type) &
                            (df['sampler_type'] == 'random') &
                            (df['requested_count'] == req_count)]

            dedup_ratios.append(dedup_data['unique_ratio'].mean())
            random_ratios.append(random_data['unique_ratio'].mean())

        # Plot with different line styles
        ax1.plot(requested_counts, dedup_ratios, marker='o',
                label=f'{arb_labels[arb_type]} (dedup)',
                color=arb_colors[arb_type], linewidth=2, linestyle='-')
        ax1.plot(requested_counts, random_ratios, marker='s',
                label=f'{arb_labels[arb_type]} (random)',
                color=arb_colors[arb_type], linewidth=2, linestyle='--', alpha=0.6)

    ax1.set_xlabel('Requested Sample Count')
    ax1.set_ylabel('Unique Sample Ratio')
    ax1.set_title('Deduplication Impact on Unique Coverage')
    ax1.set_xscale('log')
    ax1.set_ylim(0, 1.05)
    ax1.legend(fontsize=8, loc='lower left')
    ax1.grid(True, alpha=0.3)

    # Right panel: Termination guard trigger rates
    ax2 = axes[1]

    arb_type_labels = [arb_labels[at] for at in arb_types]
    trigger_rates = [next(s['trigger_rate'] for s in guard_stats if s['arb_type'] == at) * 100
                     for at in arb_types]
    trigger_errors = [
        (max(0, next(s for s in guard_stats if s['arb_type'] == at)['trigger_rate'] -
                next(s for s in guard_stats if s['arb_type'] == at)['ci_lower']),
         max(0, next(s for s in guard_stats if s['arb_type'] == at)['ci_upper'] -
                next(s for s in guard_stats if s['arb_type'] == at)['trigger_rate']))
        for at in arb_types
    ]
    trigger_errors_array = np.array(trigger_errors).T * 100

    x_pos = np.arange(len(arb_types))
    # Only add error bars if not all zeros
    if np.any(trigger_errors_array > 0):
        ax2.bar(x_pos, trigger_rates, yerr=trigger_errors_array, capsize=5,
                color=[arb_colors[at] for at in arb_types], alpha=0.8)
    else:
        ax2.bar(x_pos, trigger_rates, color=[arb_colors[at] for at in arb_types], alpha=0.8)
    ax2.set_xlabel('Arbitrary Type')
    ax2.set_ylabel('Termination Guard Trigger Rate (%)')
    ax2.set_title('Termination Guard Frequency')
    ax2.set_xticks(x_pos)
    ax2.set_xticklabels(arb_type_labels, rotation=15, ha='right')
    ax2.set_ylim(0, max(trigger_rates) * 1.2 if trigger_rates else 10)
    ax2.grid(True, axis='y', alpha=0.3)

    plt.tight_layout()
    output_path = OUTPUT_DIR / "deduplication.png"
    save_figure(fig, output_path)

    # Print conclusion
    print(f"\nConclusion:")
    print("-" * 80)

    # Check if deduplication improves coverage for limited arbitraries
    non_inj_dedup = next(s for s in coverage_stats if s['arb_type'] == 'non_injective' and s['sampler'] == 'deduping')
    non_inj_random = next(s for s in coverage_stats if s['arb_type'] == 'non_injective' and s['sampler'] == 'random')
    filtered_dedup = next(s for s in coverage_stats if s['arb_type'] == 'filtered' and s['sampler'] == 'deduping')
    filtered_random = next(s for s in coverage_stats if s['arb_type'] == 'filtered' and s['sampler'] == 'random')

    print(f"  Deduplication Impact:")
    if non_inj_dedup['mean_ratio'] > non_inj_random['mean_ratio'] * 1.1:
        improvement = (non_inj_dedup['mean_ratio'] / non_inj_random['mean_ratio'] - 1) * 100
        print(f"    ✓ Non-injective: {improvement:.1f}% improvement in unique coverage")
    else:
        print(f"    • Non-injective: Minimal improvement")

    if filtered_dedup['mean_ratio'] > filtered_random['mean_ratio'] * 1.1:
        improvement = (filtered_dedup['mean_ratio'] / filtered_random['mean_ratio'] - 1) * 100
        print(f"    ✓ Filtered: {improvement:.1f}% improvement in unique coverage")
    else:
        print(f"    • Filtered: Minimal improvement")

    # Check termination guard rates
    max_guard_rate = max(s['trigger_rate'] for s in guard_stats)
    if max_guard_rate > 0.10:
        print(f"\n  ⚠ Termination guard frequently triggered:")
        for s in guard_stats:
            if s['trigger_rate'] > 0.10:
                print(f"    • {s['arb_type']}: {s['trigger_rate']*100:.1f}% of trials")
    else:
        print(f"\n  ✓ Termination guard rarely triggered (max: {max_guard_rate*100:.1f}%)")

    # Check time overhead
    avg_overhead = np.mean([s['overhead_ratio'] for s in time_stats])
    if avg_overhead > 2.0:
        print(f"\n  ⚠ Significant time overhead: {avg_overhead:.1f}x average")
    else:
        print(f"\n  ✓ Acceptable time overhead: {avg_overhead:.1f}x average")

    print(f"\n✓ Deduplication analysis complete")

if __name__ == "__main__":
    main()
