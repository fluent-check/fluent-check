#!/usr/bin/env python3
"""
Lazy Shrinking Boundary Analysis

Analyzes the boundary shrinking study results, which correctly model
the property-testing shrinking problem.
"""

import numpy as np
from pathlib import Path
import sys

from base import AnalysisBase


class LazyShrinkingBoundaryAnalysis(AnalysisBase):
    """Analysis of lazy shrinking boundary convergence."""

    @property
    def name(self) -> str:
        return "Lazy Shrinking Boundary Analysis"

    @property
    def csv_filename(self) -> str:
        return "lazy-shrinking-boundary.csv"

    def analyze(self) -> None:
        """Perform the lazy shrinking boundary analysis."""
        print("This study models the REAL shrinking problem:")
        print("  - Property fails when value >= threshold")
        print("  - We want to find the smallest failing value (threshold)")
        print("  - Random sampling toward 0 often overshoots and gets rejected")
        print()

        self._analyze_scenarios()
        self._analyze_key_comparisons()
        self._print_analysis()
        self._compute_overall_improvement()
        self._print_recommendations()

    def _analyze_scenarios(self) -> None:
        """Analyze convergence rates by scenario."""
        # Group by scenario for detailed analysis
        scenarios = self.df.groupby(['start_value', 'threshold']).apply(
            lambda x: {
                'n': len(x),
                'reject_ratio': x.iloc[0]['threshold'] / x.iloc[0]['start_value']
            }
        )

        self.print_section("CONVERGENCE RATES BY SCENARIO AND ALGORITHM")

        for (start, threshold), info in scenarios.items():
            scenario_data = self.df[(self.df['start_value'] == start) & (self.df['threshold'] == threshold)]
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

    def _analyze_key_comparisons(self) -> None:
        """Analyze key scenarios."""
        self.print_section("KEY COMPARISON: 10M → 10 (Main Use Case)")

        main_case = self.df[(self.df['start_value'] == 10_000_000) & (self.df['threshold'] == 10)]

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

        self.print_section("KEY COMPARISON: 10M → 100K (Far Boundary)")

        far_case = self.df[(self.df['start_value'] == 10_000_000) & (self.df['threshold'] == 100_000)]

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

    def _print_analysis(self) -> None:
        """Print analysis of why binary search is better."""
        self.print_section("ANALYSIS: WHY BINARY SEARCH IS BETTER")

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

    def _compute_overall_improvement(self) -> None:
        """Compute and print overall improvement summary."""
        self.print_section("OVERALL IMPROVEMENT SUMMARY")

        overall = self.df.groupby('algorithm').agg({
            'converged': 'mean',
            'distance': 'mean',
            'rejections': 'mean',
            'attempts_used': 'mean'
        }).round(2)

        print("\nAcross all scenarios and budgets:")
        print(overall.to_string())

        binary = self.df[self.df['algorithm'] == 'binary-search']
        random = self.df[self.df['algorithm'] == 'random-100']

        print(f"\n  Binary search convergence: {binary['converged'].mean()*100:.1f}%")
        print(f"  Random sampling convergence: {random['converged'].mean()*100:.1f}%")
        if random['converged'].mean() > 0:
            improvement = (binary['converged'].mean() - random['converged'].mean()) / random['converged'].mean() * 100
            print(f"  Relative improvement: {improvement:+.1f}%")

        print(f"\n  Binary search avg rejections: {binary['rejections'].mean():.1f}")
        print(f"  Random sampling avg rejections: {random['rejections'].mean():.1f}")

    def _print_recommendations(self) -> None:
        """Print recommendations based on the study."""
        self.print_section("RECOMMENDATIONS")
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

        print(f"\n  {self.check_mark} Lazy Shrinking Boundary Analysis complete")


def main():
    analysis = LazyShrinkingBoundaryAnalysis()
    analysis.run()


if __name__ == '__main__':
    main()
