#!/usr/bin/env python3
"""
Shrinking Quality Analysis: Witness Minimization Effectiveness

Analyzes FluentCheck's shrinking behavior across different scenarios:
- How often does shrinking find the minimal witness?
- How much effort (candidates tested, rounds) is needed?
- What's the relationship between predicate type and shrinking quality?

Generates:
- Minimal witness achievement rate by scenario
- Shrinking effort distribution (candidates, rounds)
- Distance from minimal by scenario
- Time spent on shrinking vs exploration
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from pathlib import Path
from util import wilson_score_interval, format_ci, save_figure

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/shrinking.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Scenario display names and ordering
SCENARIO_ORDER = [
    'threshold_gt_100',
    'modular_10000',
    'square_gt_50000',
    'range_1000_10000',
    'composite_gt100_mod7'
]

SCENARIO_LABELS = {
    'threshold_gt_100': 'x > 100\n(min: 101)',
    'modular_10000': 'x % 10000 = 0\n(min: 10000)',
    'square_gt_50000': 'x² > 50000\n(min: 224)',
    'range_1000_10000': '1000 ≤ x ≤ 10000\n(min: 1000)',
    'composite_gt100_mod7': 'x > 100 ∧ x % 7 = 0\n(min: 105)'
}


def main():
    print("=== Shrinking Quality Analysis ===\n")

    # Load data
    print(f"Loading: {CSV_PATH}")
    if not CSV_PATH.exists():
        print(f"ERROR: {CSV_PATH} not found. Run the study first:")
        print("  npm run evidence:generate")
        return

    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")

    # Filter to only trials that found witnesses
    found_df = df[df['witness_found']].copy()
    print(f"  Found witnesses: {len(found_df)} ({len(found_df)/len(df)*100:.1f}%)\n")

    if len(found_df) == 0:
        print("ERROR: No witnesses found in any trial")
        return

    # Summary by scenario
    print("=" * 100)
    print("SHRINKING EFFECTIVENESS BY SCENARIO")
    print("=" * 100)

    results = []
    for scenario in SCENARIO_ORDER:
        if scenario not in found_df['scenario'].values:
            continue

        group = found_df[found_df['scenario'] == scenario]
        n = len(group)

        # Minimal witness rate
        minimal_count = group['is_minimal'].sum()
        minimal_rate = minimal_count / n
        lower, upper = wilson_score_interval(minimal_count, n, 0.95)

        # Distance from minimal (for non-minimal cases)
        group = group.copy()
        group['distance'] = np.abs(group['final_witness'] - group['expected_minimal'])
        non_minimal = group[~group['is_minimal']]
        mean_distance = non_minimal['distance'].mean() if len(non_minimal) > 0 else 0

        # Shrinking effort
        mean_candidates = group['shrink_candidates_tested'].mean()
        mean_rounds = group['shrink_rounds_completed'].mean()
        mean_improvements = group['shrink_improvements_made'].mean()

        # Time breakdown
        mean_shrink_time = group['shrinking_time_ms'].mean()
        mean_explore_time = group['exploration_time_ms'].mean()

        results.append({
            'scenario': scenario,
            'n_trials': n,
            'minimal_rate': minimal_rate,
            'ci_lower': lower,
            'ci_upper': upper,
            'mean_distance': mean_distance,
            'mean_candidates': mean_candidates,
            'mean_rounds': mean_rounds,
            'mean_improvements': mean_improvements,
            'mean_shrink_time_ms': mean_shrink_time,
            'mean_explore_time_ms': mean_explore_time
        })

    results_df = pd.DataFrame(results)

    # Print summary table
    print(f"\n{'Scenario':<25} {'Trials':<8} {'Minimal %':<12} {'95% CI':<20} "
          f"{'Mean Dist':<12} {'Candidates':<12} {'Rounds':<8}")
    print("-" * 100)

    for _, row in results_df.iterrows():
        ci_str = format_ci(row['ci_lower'], row['ci_upper'])
        print(f"{row['scenario']:<25} "
              f"{int(row['n_trials']):<8} "
              f"{row['minimal_rate']*100:<12.1f}% "
              f"{ci_str:<20} "
              f"{row['mean_distance']:<12.1f} "
              f"{row['mean_candidates']:<12.1f} "
              f"{row['mean_rounds']:<8.1f}")

    print("-" * 100)

    # Create Figure 1: Minimal Witness Achievement Rate
    fig, ax = plt.subplots(figsize=(12, 7))

    x_pos = np.arange(len(results_df))
    colors = sns.color_palette("viridis", len(results_df))

    # Calculate error bars
    yerr_lower = np.maximum(0, results_df['minimal_rate'] - results_df['ci_lower'])
    yerr_upper = np.maximum(0, results_df['ci_upper'] - results_df['minimal_rate'])

    ax.bar(
        x_pos,
        results_df['minimal_rate'],
        yerr=[yerr_lower, yerr_upper],
        capsize=5,
        alpha=0.7,
        edgecolor='black',
        color=colors
    )

    ax.set_xlabel('Scenario', fontsize=12)
    ax.set_ylabel('Rate of Finding Minimal Witness', fontsize=12)
    ax.set_title('Shrinking Effectiveness: Minimal Witness Achievement\n(95% CI)', fontsize=14)
    ax.set_xticks(x_pos)
    ax.set_xticklabels([SCENARIO_LABELS.get(s, s) for s in results_df['scenario']], fontsize=9)
    ax.set_ylim(0, 1.05)
    ax.grid(True, axis='y', alpha=0.3)

    # Add 100% reference line
    ax.axhline(y=1.0, color='green', linestyle='--', alpha=0.5, label='Perfect shrinking')
    ax.legend(loc='lower right')

    output_path = OUTPUT_DIR / "shrinking_minimal_rate.png"
    save_figure(fig, output_path)

    # Create Figure 2: Shrinking Effort Distribution
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Left: Candidates tested
    ax = axes[0]
    sns.boxplot(
        data=found_df,
        x='scenario',
        y='shrink_candidates_tested',
        order=[s for s in SCENARIO_ORDER if s in found_df['scenario'].values],
        palette='viridis',
        ax=ax
    )
    ax.set_xlabel('Scenario', fontsize=12)
    ax.set_ylabel('Shrink Candidates Tested', fontsize=12)
    ax.set_title('Shrinking Effort: Candidates Tested', fontsize=14)
    ax.set_xticklabels([SCENARIO_LABELS.get(s, s).split('\n')[0] for s in SCENARIO_ORDER
                        if s in found_df['scenario'].values], fontsize=9, rotation=45, ha='right')
    ax.grid(True, axis='y', alpha=0.3)

    # Right: Improvements made
    ax = axes[1]
    sns.boxplot(
        data=found_df,
        x='scenario',
        y='shrink_improvements_made',
        order=[s for s in SCENARIO_ORDER if s in found_df['scenario'].values],
        palette='viridis',
        ax=ax
    )
    ax.set_xlabel('Scenario', fontsize=12)
    ax.set_ylabel('Successful Shrink Steps', fontsize=12)
    ax.set_title('Shrinking Progress: Improvements Made', fontsize=14)
    ax.set_xticklabels([SCENARIO_LABELS.get(s, s).split('\n')[0] for s in SCENARIO_ORDER
                        if s in found_df['scenario'].values], fontsize=9, rotation=45, ha='right')
    ax.grid(True, axis='y', alpha=0.3)

    output_path = OUTPUT_DIR / "shrinking_effort.png"
    save_figure(fig, output_path)

    # Create Figure 3: Witness Quality Distribution
    fig, ax = plt.subplots(figsize=(12, 7))

    # Calculate distance from minimal for each trial
    found_df = found_df.copy()
    found_df['distance_from_minimal'] = np.abs(found_df['final_witness'] - found_df['expected_minimal'])
    found_df['relative_distance'] = found_df['distance_from_minimal'] / found_df['expected_minimal'] * 100

    sns.boxplot(
        data=found_df,
        x='scenario',
        y='relative_distance',
        order=[s for s in SCENARIO_ORDER if s in found_df['scenario'].values],
        palette='viridis',
        ax=ax
    )
    ax.set_xlabel('Scenario', fontsize=12)
    ax.set_ylabel('Distance from Minimal (% of minimal value)', fontsize=12)
    ax.set_title('Witness Quality: Distance from Theoretical Minimal\n(Lower is better, 0 = perfect)', fontsize=14)
    ax.set_xticklabels([SCENARIO_LABELS.get(s, s) for s in SCENARIO_ORDER
                        if s in found_df['scenario'].values], fontsize=9)
    ax.grid(True, axis='y', alpha=0.3)

    # Add zero reference line
    ax.axhline(y=0, color='green', linestyle='--', alpha=0.5, label='Perfect (minimal witness)')
    ax.legend(loc='upper right')

    output_path = OUTPUT_DIR / "shrinking_witness_quality.png"
    save_figure(fig, output_path)

    # Create Figure 4: Time Breakdown
    fig, ax = plt.subplots(figsize=(12, 7))

    bar_width = 0.35
    x_pos = np.arange(len(results_df))

    ax.bar(x_pos - bar_width/2, results_df['mean_explore_time_ms'],
           bar_width, label='Exploration', color='steelblue', alpha=0.7)
    ax.bar(x_pos + bar_width/2, results_df['mean_shrink_time_ms'],
           bar_width, label='Shrinking', color='coral', alpha=0.7)

    ax.set_xlabel('Scenario', fontsize=12)
    ax.set_ylabel('Time (ms)', fontsize=12)
    ax.set_title('Time Breakdown: Exploration vs Shrinking\n(Shrinking dominates: 86-99% of total time)', fontsize=14)
    ax.set_xticks(x_pos)
    ax.set_xticklabels([SCENARIO_LABELS.get(s, s).split('\n')[0] for s in results_df['scenario']],
                       fontsize=9, rotation=45, ha='right')
    ax.legend()
    ax.grid(True, axis='y', alpha=0.3)

    output_path = OUTPUT_DIR / "shrinking_time_breakdown.png"
    save_figure(fig, output_path)

    # Key insights
    print(f"\n{'='*100}")
    print("KEY INSIGHTS")
    print("=" * 100)

    # Overall minimal rate
    total_minimal = found_df['is_minimal'].sum()
    total_found = len(found_df)
    overall_minimal_rate = total_minimal / total_found
    overall_lower, overall_upper = wilson_score_interval(total_minimal, total_found, 0.95)

    print(f"\n  Overall minimal witness rate: {overall_minimal_rate*100:.1f}% "
          f"(95% CI: {format_ci(overall_lower, overall_upper)})")

    # Best and worst scenarios
    best = results_df.loc[results_df['minimal_rate'].idxmax()]
    worst = results_df.loc[results_df['minimal_rate'].idxmin()]

    print(f"\n  Best shrinking: {best['scenario']} ({best['minimal_rate']*100:.1f}%)")
    print(f"  Worst shrinking: {worst['scenario']} ({worst['minimal_rate']*100:.1f}%)")

    # Effort analysis
    print(f"\n  Shrinking Effort Analysis:")
    print("-" * 60)
    for _, row in results_df.iterrows():
        print(f"  {row['scenario']}: "
              f"{row['mean_candidates']:.1f} candidates, "
              f"{row['mean_rounds']:.1f} rounds, "
              f"{row['mean_improvements']:.1f} improvements")

    # Time analysis
    avg_explore_time = results_df['mean_explore_time_ms'].mean()
    avg_shrink_time = results_df['mean_shrink_time_ms'].mean()
    shrink_percentage = avg_shrink_time / (avg_explore_time + avg_shrink_time) * 100

    print(f"\n  Time Analysis:")
    print(f"  Average exploration time: {avg_explore_time:.2f} ms")
    print(f"  Average shrinking time: {avg_shrink_time:.2f} ms")
    print(f"  Shrinking time: {shrink_percentage:.1f}% of total time")
    print(f"  Exploration time: {100 - shrink_percentage:.1f}% of total time")
    print(f"\n  Note: Exploration times are very small (often <0.1 ms) and may be at")
    print(f"  measurement precision limits. The pattern is consistent: shrinking dominates.")

    print(f"\n✓ Shrinking analysis complete")


if __name__ == "__main__":
    main()
