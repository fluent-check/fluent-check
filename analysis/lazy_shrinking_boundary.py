#!/usr/bin/env python3
"""
Lazy Shrinking Boundary Analysis

Analyzes the boundary shrinking study results, which correctly model
the property-testing shrinking problem.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import sys

def main():
    data_path = Path(__file__).parent.parent / 'docs/evidence/raw/lazy-shrinking-boundary.csv'
    if not data_path.exists():
        print(f"Error: Data file not found at {data_path}")
        sys.exit(1)

    df = pd.read_csv(data_path)

    print("=" * 100)
    print("LAZY SHRINKING BOUNDARY ANALYSIS")
    print("=" * 100)
    print()

    print("This study models the REAL shrinking problem:")
    print("  - Property fails when value >= threshold")
    print("  - We want to find the smallest failing value (threshold)")
    print("  - Random sampling toward 0 often overshoots and gets rejected")
    print()

    # Group by scenario for detailed analysis
    scenarios = df.groupby(['start_value', 'threshold']).apply(
        lambda x: {
            'n': len(x),
            'reject_ratio': x.iloc[0]['threshold'] / x.iloc[0]['start_value']
        }
    )

    print("=" * 100)
    print("CONVERGENCE RATES BY SCENARIO AND ALGORITHM")
    print("=" * 100)

    for (start, threshold), info in scenarios.items():
        scenario_data = df[(df['start_value'] == start) & (df['threshold'] == threshold)]
        reject_pct = info['reject_ratio'] * 100

        print(f"\n{'='*80}")
        print(f"SCENARIO: {start:,} → {threshold:,}")
        print(f"  Rejection zone: [0, {threshold-1}] ({reject_pct:.1f}% of range)")
        print(f"  Binary search steps needed: {int(np.ceil(np.log2(start)))}")
        print(f"{'='*80}")

        pivot = scenario_data.pivot_table(
            values='converged',
            index='budget',
            columns='algorithm',
            aggfunc='mean'
        ).round(3) * 100

        print("\nConvergence Rate (%):")
        print(pivot.to_string())

        # Distance analysis
        print("\nAverage Distance from Optimal:")
        dist_pivot = scenario_data.pivot_table(
            values='distance',
            index='budget',
            columns='algorithm',
            aggfunc='mean'
        ).round(0)
        print(dist_pivot.to_string())

        # Rejection analysis
        print("\nAverage Rejections (wasted attempts):")
        rej_pivot = scenario_data.pivot_table(
            values='rejections',
            index='budget',
            columns='algorithm',
            aggfunc='mean'
        ).round(1)
        print(rej_pivot.to_string())

    print("\n" + "=" * 100)
    print("KEY COMPARISON: 10M → 10 (Main Use Case)")
    print("=" * 100)

    main_case = df[(df['start_value'] == 10_000_000) & (df['threshold'] == 10)]

    print("\nThis is the scenario from the shrinking strategies study.")
    print("Threshold at 10 means only values >= 10 fail the property.\n")

    for budget in [100, 200, 500]:
        budget_data = main_case[main_case['budget'] == budget]

        print(f"\nBudget = {budget} attempts:")
        print("-" * 60)

        for algo in ['binary-search', 'random-weighted', 'random-100']:
            algo_data = budget_data[budget_data['algorithm'] == algo]
            if algo_data.empty:
                continue

            conv = algo_data['converged'].mean() * 100
            dist = algo_data['distance'].mean()
            rej = algo_data['rejections'].mean()
            attempts = algo_data['attempts_used'].mean()

            print(f"  {algo:18s}: {conv:5.1f}% converge, dist={dist:8,.0f}, "
                  f"rejections={rej:5.1f}, attempts={attempts:5.1f}")

    print("\n" + "=" * 100)
    print("KEY COMPARISON: 10M → 100K (Far Boundary)")
    print("=" * 100)

    far_case = df[(df['start_value'] == 10_000_000) & (df['threshold'] == 100_000)]

    print("\nWhen threshold is 100,000 (1% of range), random sampling wastes")
    print("many attempts on values < 100,000 that PASS the property.\n")

    for budget in [100, 200, 500]:
        budget_data = far_case[far_case['budget'] == budget]

        print(f"\nBudget = {budget} attempts:")
        print("-" * 60)

        for algo in ['binary-search', 'random-weighted', 'random-100']:
            algo_data = budget_data[budget_data['algorithm'] == algo]
            if algo_data.empty:
                continue

            conv = algo_data['converged'].mean() * 100
            dist = algo_data['distance'].mean()
            rej = algo_data['rejections'].mean()
            attempts = algo_data['attempts_used'].mean()

            print(f"  {algo:18s}: {conv:5.1f}% converge, dist={dist:8,.0f}, "
                  f"rejections={rej:5.1f}, attempts={attempts:5.1f}")

    print("\n" + "=" * 100)
    print("ANALYSIS: WHY BINARY SEARCH IS BETTER")
    print("=" * 100)

    print("""
    1. REJECTION PROBLEM
       Random sampling toward 0 often samples values below threshold.
       These values PASS the property and must be rejected.
       This wastes budget on values that can't be the answer.

    2. BINARY SEARCH EFFICIENCY
       Binary search uses rejections as INFORMATION.
       If mid PASSES, we know threshold > mid, so search [mid+1, current].
       If mid FAILS, we know threshold <= mid, so search [0, mid].
       Every attempt narrows the search space by half.

    3. BUDGET EFFECTIVENESS
       With budget 100:
       - Random: May hit threshold by luck, but often doesn't
       - Binary: Guaranteed to find threshold in ~24 steps for 10M range

    4. FAIR STRATEGIES BENEFIT
       Round-Robin with binary search means each quantifier converges
       efficiently. Currently, random sampling means later quantifiers
       get poor shrinking because budget is wasted on rejections.
    """)

    # Calculate overall statistics
    print("\n" + "=" * 100)
    print("OVERALL IMPROVEMENT SUMMARY")
    print("=" * 100)

    overall = df.groupby('algorithm').agg({
        'converged': 'mean',
        'distance': 'mean',
        'rejections': 'mean',
        'attempts_used': 'mean'
    }).round(2)

    print("\nAcross all scenarios and budgets:")
    print(overall.to_string())

    binary = df[df['algorithm'] == 'binary-search']
    random = df[df['algorithm'] == 'random-100']

    print(f"\n  Binary search convergence: {binary['converged'].mean()*100:.1f}%")
    print(f"  Random sampling convergence: {random['converged'].mean()*100:.1f}%")
    if random['converged'].mean() > 0:
        improvement = (binary['converged'].mean() - random['converged'].mean()) / random['converged'].mean() * 100
        print(f"  Relative improvement: {improvement:+.1f}%")

    print(f"\n  Binary search avg rejections: {binary['rejections'].mean():.1f}")
    print(f"  Random sampling avg rejections: {random['rejections'].mean():.1f}")

    print("\n" + "=" * 100)
    print("RECOMMENDATIONS")
    print("=" * 100)
    print("""
    1. Phase 1 (Lazy Iterators) provides GUARANTEED convergence
       - Binary search finds boundary in O(log N) attempts
       - Random sampling may fail to converge for far boundaries

    2. The benefit is most pronounced when:
       - Value ranges are large (10M+)
       - Optimal values are not at 0 (threshold > 0)
       - Budget is limited (100-500 attempts)

    3. Current weighted 80/20 sampling helps but doesn't solve the problem
       - Still wastes attempts on rejected candidates
       - Still has random element that may miss boundary

    4. Combining with fair strategies (Round-Robin)
       - Each quantifier gets efficient binary search
       - All positions converge together
       - No positional bias due to budget exhaustion
    """)

    print("\n✓ Lazy Shrinking Boundary Analysis complete")

if __name__ == '__main__':
    main()
