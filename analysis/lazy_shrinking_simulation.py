#!/usr/bin/env python3
"""
Lazy Shrinking Simulation Analysis

Analyzes the simulation results comparing random sampling vs binary search
for shrink candidate generation.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import sys

def main():
    # Load data
    data_path = Path(__file__).parent.parent / 'docs/evidence/raw/lazy-shrinking-simulation.csv'
    if not data_path.exists():
        print(f"Error: Data file not found at {data_path}")
        print("Run the simulation study first:")
        print("  QUICK_MODE=1 npx tsx scripts/evidence/lazy-shrinking-simulation.study.ts")
        sys.exit(1)

    df = pd.read_csv(data_path)

    print("=" * 100)
    print("LAZY SHRINKING SIMULATION ANALYSIS")
    print("=" * 100)
    print()

    # Summary by algorithm and scenario
    print("CONVERGENCE RATES BY ALGORITHM AND SCENARIO")
    print("-" * 80)


    print("\nConvergence Rate (% reaching optimal):")
    pivot_converge = df.pivot_table(
        values='converged',
        index=['start_value', 'budget'],
        columns='algorithm',
        aggfunc='mean'
    ).round(3) * 100
    print(pivot_converge.to_string())

    print("\n" + "=" * 100)
    print("DETAILED ANALYSIS BY START VALUE")
    print("=" * 100)

    for start_val in sorted(df['start_value'].unique()):
        subset = df[df['start_value'] == start_val]
        target = subset['target_value'].iloc[0]
        theoretical_steps = int(np.ceil(np.log2(start_val - target)))

        print(f"\n{'='*80}")
        print(f"SCENARIO: {start_val:,} → {target} (theoretical binary search: {theoretical_steps} steps)")
        print(f"{'='*80}")

        for budget in sorted(subset['budget'].unique()):
            budget_data = subset[subset['budget'] == budget]
            print(f"\n  Budget: {budget} attempts")
            print(f"  {'-'*60}")

            for algo in ['random-100', 'random-weighted', 'binary-search']:
                algo_data = budget_data[budget_data['algorithm'] == algo]
                if algo_data.empty:
                    continue

                conv_rate = algo_data['converged'].mean() * 100
                avg_dist = algo_data['distance'].mean()
                avg_attempts = algo_data['attempts_used'].mean()
                converged_attempts = algo_data[algo_data['converged'] == 1]['convergence_attempt']
                avg_conv_attempt = converged_attempts.mean() if len(converged_attempts) > 0 else np.nan

                print(f"    {algo:20s}: {conv_rate:6.1f}% converged, "
                      f"avg distance: {avg_dist:12,.1f}, "
                      f"avg attempts: {avg_attempts:5.1f}", end="")
                if not np.isnan(avg_conv_attempt):
                    print(f", converge@: {avg_conv_attempt:5.1f}")
                else:
                    print()

    print("\n" + "=" * 100)
    print("KEY FINDINGS")
    print("=" * 100)

    # Compare algorithms for the main scenario (10M → 10)
    main_scenario = df[df['start_value'] == 10_000_000]

    print("\n1. LARGE RANGE SHRINKING (10,000,000 → 10)")
    print("-" * 60)

    for budget in [50, 100, 200]:
        budget_data = main_scenario[main_scenario['budget'] == budget]

        binary = budget_data[budget_data['algorithm'] == 'binary-search']
        weighted = budget_data[budget_data['algorithm'] == 'random-weighted']
        random = budget_data[budget_data['algorithm'] == 'random-100']

        print(f"\n  Budget = {budget}:")
        print(f"    Binary Search:    {binary['converged'].mean()*100:6.1f}% converge, avg dist = {binary['distance'].mean():,.0f}")
        print(f"    Random Weighted:  {weighted['converged'].mean()*100:6.1f}% converge, avg dist = {weighted['distance'].mean():,.0f}")
        print(f"    Random (current): {random['converged'].mean()*100:6.1f}% converge, avg dist = {random['distance'].mean():,.0f}")

        if binary['converged'].mean() > 0 and random['converged'].mean() == 0:
            print(f"    → Binary search achieves {binary['converged'].mean()*100:.0f}% convergence where random cannot converge")
        elif binary['distance'].mean() < random['distance'].mean():
            improvement = (1 - binary['distance'].mean() / random['distance'].mean()) * 100
            print(f"    → Binary search reduces distance by {improvement:.1f}%")

    print("\n2. CONVERGENCE SPEED COMPARISON")
    print("-" * 60)

    # For binary search, what's the typical convergence attempt?
    binary_all = df[df['algorithm'] == 'binary-search']
    binary_converged = binary_all[binary_all['converged'] == 1]

    if len(binary_converged) > 0:
        by_scenario = binary_converged.groupby('start_value')['convergence_attempt'].agg(['mean', 'std', 'count'])
        print("\n  Binary search convergence speed:")
        for start_val, row in by_scenario.iterrows():
            theoretical = int(np.ceil(np.log2(start_val - 10)))
            print(f"    {start_val:>12,} → 10: avg {row['mean']:.1f} ± {row['std']:.1f} attempts "
                  f"(theoretical: {theoretical}, n={int(row['count'])})")

    print("\n3. IMPROVEMENT SUMMARY")
    print("-" * 60)

    # Calculate overall improvement for main scenario
    main_binary = main_scenario[main_scenario['algorithm'] == 'binary-search']
    main_weighted = main_scenario[main_scenario['algorithm'] == 'random-weighted']

    binary_conv = main_binary['converged'].mean()
    weighted_conv = main_weighted['converged'].mean()
    binary_dist = main_binary['distance'].mean()
    weighted_dist = main_weighted['distance'].mean()

    print(f"\n  For 10M → 10 range (all budgets combined):")
    print(f"    Binary Search convergence rate: {binary_conv*100:.1f}%")
    print(f"    Weighted Random convergence rate: {weighted_conv*100:.1f}%")
    print(f"    Convergence improvement: {(binary_conv - weighted_conv)*100:.1f} percentage points")
    print()
    print(f"    Binary Search avg distance: {binary_dist:,.0f}")
    print(f"    Weighted Random avg distance: {weighted_dist:,.0f}")
    if weighted_dist > 0:
        print(f"    Distance reduction: {(1 - binary_dist/weighted_dist)*100:.1f}%")

    print("\n" + "=" * 100)
    print("RECOMMENDATIONS FOR PHASE 1")
    print("=" * 100)

    print("""
    1. IMPLEMENT LAZY ITERATOR-BASED SHRINKING
       - Binary search achieves guaranteed O(log N) convergence
       - Current random sampling cannot reliably converge for large ranges
       - The improvement is most dramatic for large value ranges (10M+)

    2. EXPECTED IMPACT
       - For shrinking from 10M to 10: ~24 attempts with binary search
       - Current approach may never converge with typical budgets (100-500)
       - This explains why positions 3-5 remain far from optimal in current studies

    3. FAIR STRATEGIES WILL BENEFIT
       - Round-Robin with binary search: each quantifier converges in ~24 attempts
       - With 5 quantifiers: ~120 total attempts for full convergence
       - Current approach: 2000+ attempts still leaves most positions unconverged

    4. IMPLEMENTATION PRIORITY
       - Phase 1 (lazy iterators) should be implemented first
       - This provides the foundation for fair strategy effectiveness
       - Phase 2 (choice shrinking) builds on this improvement
    """)

    print("\n✓ Lazy Shrinking Simulation Analysis complete")

if __name__ == '__main__':
    main()
