#!/usr/bin/env python3
"""
Shrinking Strategies Comparison Analysis

Analyzes the empirical comparison of shrinking strategies to validate
fairness improvements and performance trade-offs.

Metrics analyzed:
1. Variance (fairness) - Lower is better
2. Attempts (efficiency) - Lower is better
3. Rounds (convergence) - Lower is better
4. Quantifier order independence

Statistical tests:
1. ANOVA - Test if strategy affects variance
2. Tukey HSD - Pairwise comparisons between strategies
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.stats import f_oneway
from scipy.stats import tukey_hsd

from base import AnalysisBase
from viz import save_figure


class ShrinkingStrategiesComparisonAnalysis(AnalysisBase):
    """Analysis comparing different shrinking strategies."""

    @property
    def name(self) -> str:
        return "Shrinking Strategies Comparison Analysis"

    @property
    def csv_filename(self) -> str:
        return "shrinking-strategies.csv"

    def analyze(self) -> None:
        """Perform the comparison analysis."""
        self._prepare_data()
        self._compute_summary()
        self._test_quantifier_order_independence()
        self._run_anova()
        self._run_tukey_hsd()
        self._create_visualizations()
        self._validate_benchmarks()
        self._print_conclusion()

    def _prepare_data(self) -> None:
        """Prepare data for analysis."""
        # Filter to sum constraint for main analysis (most symmetric property)
        self.sum_df = self.df[self.df['property'] == 'sum'].copy()
        print(f"  Loaded {len(self.sum_df)} trials for sum constraint\n")

        # Calculate derived metrics
        self.sum_df['variance_reduction'] = (
            self.sum_df.groupby('strategy')['variance']
            .transform(lambda x: 1 - (x.mean() / self.sum_df[self.sum_df['strategy'] == 'sequential-exhaustive']['variance'].mean()))
        )

    def _compute_summary(self) -> None:
        """Compute summary statistics by strategy."""
        summary = self.sum_df.groupby('strategy').agg({
            'variance': ['mean', 'std', 'min', 'max'],
            'mean_distance': ['mean', 'std'],
            'attempts': ['mean', 'std'],
            'rounds': ['mean', 'std'],
            'elapsed_micros': ['mean', 'std']
        })

        self.print_section("SUMMARY STATISTICS BY STRATEGY")
        print(summary)
        print()

        # Calculate improvement percentages
        baseline_variance = summary.loc['sequential-exhaustive', ('variance', 'mean')]
        baseline_attempts = summary.loc['sequential-exhaustive', ('attempts', 'mean')]
        baseline_time = summary.loc['sequential-exhaustive', ('elapsed_micros', 'mean')]

        self.print_section("IMPROVEMENTS VS BASELINE (Sequential Exhaustive)")

        for strategy in ['round-robin', 'delta-debugging']:
            if strategy not in summary.index:
                continue

            var_reduction = (1 - summary.loc[strategy, ('variance', 'mean')] / baseline_variance) * 100
            attempt_increase = (summary.loc[strategy, ('attempts', 'mean')] / baseline_attempts - 1) * 100
            time_increase = (summary.loc[strategy, ('elapsed_micros', 'mean')] / baseline_time - 1) * 100

            print(f"\n{strategy.upper()}:")
            print(f"  Variance reduction: {var_reduction:.1f}%")
            print(f"  Attempt overhead:   {attempt_increase:+.1f}%")
            print(f"  Time overhead:      {time_increase:+.1f}%")

        print()

    def _test_quantifier_order_independence(self) -> None:
        """Test if quantifier order affects results."""
        self.print_section("QUANTIFIER ORDER INDEPENDENCE")

        for strategy in self.sum_df['strategy'].unique():
            strategy_df = self.sum_df[self.sum_df['strategy'] == strategy]

            # Group by quantifier order and calculate variance
            order_variances = strategy_df.groupby('quantifier_order')['variance'].mean()

            # Calculate coefficient of variation across orders
            cv = order_variances.std() / order_variances.mean() if order_variances.mean() > 0 else 0

            print(f"\n{strategy}:")
            print(f"  Variance by order:")
            for order, var in order_variances.items():
                print(f"    {order}: {var:.1f}")
            print(f"  Coefficient of variation: {cv:.3f}")
            print(f"  Order independence: {self._interpret_cv(cv)}")

        print()

    def _interpret_cv(self, cv: float) -> str:
        """Interpret coefficient of variation for order independence."""
        if cv < 0.1:
            return "✓ Excellent (order-independent)"
        elif cv < 0.3:
            return "≈ Good (minimal order effect)"
        elif cv < 0.5:
            return "≈ Moderate (some order effect)"
        else:
            return "✗ Poor (high order dependence)"

    def _run_anova(self) -> None:
        """Run ANOVA test for variance across strategies."""
        self.print_section("ANOVA: VARIANCE ACROSS STRATEGIES")

        # Prepare groups
        groups = [
            self.sum_df[self.sum_df['strategy'] == s]['variance']
            for s in self.sum_df['strategy'].unique()
        ]

        self.f_stat, self.p_val = f_oneway(*groups)

        print(f"  F-statistic: {self.f_stat:.2f}")
        print(f"  p-value: {self.p_val:.4f}")

        if self.p_val < 0.05:
            print(f"  {self.check_mark} Significant difference detected (reject null hypothesis)")
        else:
            print(f"  ✗ No significant difference (fail to reject null hypothesis)")

        print()

    def _run_tukey_hsd(self) -> None:
        """Run Tukey HSD post-hoc test."""
        self.print_section("TUKEY HSD POST-HOC TEST")

        strategies = self.sum_df['strategy'].unique()

        # Prepare data for Tukey HSD
        variances_by_strategy = [
            self.sum_df[self.sum_df['strategy'] == s]['variance'].values
            for s in strategies
        ]

        # Run Tukey HSD
        res = tukey_hsd(*variances_by_strategy)

        print("  Pairwise comparisons:")
        for i, strat1 in enumerate(strategies):
            for j, strat2 in enumerate(strategies):
                if i < j:
                    mean_diff = (
                        self.sum_df[self.sum_df['strategy'] == strat1]['variance'].mean() -
                        self.sum_df[self.sum_df['strategy'] == strat2]['variance'].mean()
                    )
                    p_value = res.pvalue[i, j]
                    sig = "✓ Significant" if p_value < 0.05 else "✗ Not significant"
                    print(f"    {strat1} vs {strat2}:")
                    print(f"      Mean difference: {mean_diff:.1f}")
                    print(f"      p-value: {p_value:.4f} ({sig})")

        print()

    def _create_visualizations(self) -> None:
        """Create comparison visualizations."""
        fig, axes = plt.subplots(2, 2, figsize=(14, 12))

        # 1. Variance distribution by strategy (box plot)
        ax1 = axes[0, 0]
        sns.boxplot(
            x='strategy',
            y='variance',
            data=self.sum_df,
            ax=ax1,
            palette='muted'
        )
        ax1.set_xlabel('Strategy')
        ax1.set_ylabel('Variance (lower = fairer)')
        ax1.set_title('Variance Distribution by Strategy')
        ax1.tick_params(axis='x', rotation=15)

        # 2. Attempts comparison (bar chart)
        ax2 = axes[0, 1]
        attempts_mean = self.sum_df.groupby('strategy')['attempts'].mean()
        attempts_mean.plot(kind='bar', ax=ax2, color='steelblue')
        ax2.set_xlabel('Strategy')
        ax2.set_ylabel('Mean Attempts')
        ax2.set_title('Average Shrink Attempts by Strategy')
        ax2.tick_params(axis='x', rotation=15)

        # 3. Fairness vs Efficiency trade-off (scatter)
        ax3 = axes[1, 0]
        strategy_summary = self.sum_df.groupby('strategy').agg({
            'variance': 'mean',
            'attempts': 'mean'
        })
        ax3.scatter(
            strategy_summary['attempts'],
            strategy_summary['variance'],
            s=200,
            alpha=0.6
        )
        for idx, row in strategy_summary.iterrows():
            ax3.annotate(
                idx,
                (row['attempts'], row['variance']),
                xytext=(5, 5),
                textcoords='offset points'
            )
        ax3.set_xlabel('Mean Attempts (efficiency)')
        ax3.set_ylabel('Mean Variance (fairness)')
        ax3.set_title('Fairness vs Efficiency Trade-off')
        ax3.invert_yaxis()  # Lower variance is better

        # 4. Quantifier order effect matrix (heatmap)
        ax4 = axes[1, 1]
        order_matrix = self.sum_df.pivot_table(
            values='variance',
            index='strategy',
            columns='quantifier_order',
            aggfunc='mean'
        )
        sns.heatmap(order_matrix, annot=True, fmt='.0f', ax=ax4, cmap='YlOrRd')
        ax4.set_title('Mean Variance by Strategy and Order')

        plt.tight_layout()
        save_figure(fig, self.get_output_path("shrinking-strategies-comparison.png"))

    def _validate_benchmarks(self) -> None:
        """Validate against expected benchmarks."""
        self.print_section("BENCHMARK VALIDATION")

        baseline_variance = self.sum_df[self.sum_df['strategy'] == 'sequential-exhaustive']['variance'].mean()
        baseline_attempts = self.sum_df[self.sum_df['strategy'] == 'sequential-exhaustive']['attempts'].mean()
        baseline_time = self.sum_df[self.sum_df['strategy'] == 'sequential-exhaustive']['elapsed_micros'].mean()

        # Round-Robin benchmarks
        if 'round-robin' in self.sum_df['strategy'].values:
            rr_variance = self.sum_df[self.sum_df['strategy'] == 'round-robin']['variance'].mean()
            rr_attempts = self.sum_df[self.sum_df['strategy'] == 'round-robin']['attempts'].mean()
            rr_time = self.sum_df[self.sum_df['strategy'] == 'round-robin']['elapsed_micros'].mean()

            var_reduction = (1 - rr_variance / baseline_variance) * 100
            attempt_overhead = (rr_attempts / baseline_attempts - 1) * 100
            time_overhead = (rr_time / baseline_time - 1) * 100

            print("Round-Robin vs Sequential Exhaustive:\n")

            # Benchmark 1: Variance reduction 50-80%
            check = self.check_mark if 50 <= var_reduction <= 80 else "✗"
            print(f"  {check} Variance reduction: {var_reduction:.1f}% (expected: 50-80%)")

            # Benchmark 2: Overhead <10%
            check = self.check_mark if attempt_overhead < 10 and time_overhead < 10 else "✗"
            print(f"  {check} Attempt overhead: {attempt_overhead:+.1f}% (expected: <10%)")
            print(f"  {check} Time overhead: {time_overhead:+.1f}% (expected: <10%)")

        print()

        # Delta Debugging benchmarks
        if 'delta-debugging' in self.sum_df['strategy'].values:
            dd_variance = self.sum_df[self.sum_df['strategy'] == 'delta-debugging']['variance'].mean()
            dd_attempts = self.sum_df[self.sum_df['strategy'] == 'delta-debugging']['attempts'].mean()
            dd_time = self.sum_df[self.sum_df['strategy'] == 'delta-debugging']['elapsed_micros'].mean()

            var_reduction = (1 - dd_variance / baseline_variance) * 100
            attempt_overhead = (dd_attempts / baseline_attempts - 1) * 100
            time_overhead = (dd_time / baseline_time - 1) * 100

            print("Delta Debugging vs Sequential Exhaustive:\n")

            # Benchmark 1: Variance reduction 90-97%
            check = self.check_mark if 90 <= var_reduction <= 98 else "✗"
            print(f"  {check} Variance reduction: {var_reduction:.1f}% (expected: 90-97%)")

            # Benchmark 2: Overhead <100%
            check = self.check_mark if attempt_overhead < 100 and time_overhead < 100 else "✗"
            print(f"  {check} Attempt overhead: {attempt_overhead:+.1f}% (expected: <100%)")
            print(f"  {check} Time overhead: {time_overhead:+.1f}% (expected: <100%)")

        # ANOVA significance
        check = self.check_mark if self.p_val < 0.05 else "✗"
        print(f"\n  {check} ANOVA significance: p={self.p_val:.4f} (expected: <0.05)")
        print()

    def _print_conclusion(self) -> None:
        """Print conclusion."""
        self.print_section("CONCLUSION")

        if self.p_val < 0.05:
            print(f"  {self.check_mark} Strategies have statistically significant differences")
        else:
            print(f"  ✗ No significant difference between strategies")

        if 'round-robin' in self.sum_df['strategy'].values:
            baseline_variance = self.sum_df[self.sum_df['strategy'] == 'sequential-exhaustive']['variance'].mean()
            rr_variance = self.sum_df[self.sum_df['strategy'] == 'round-robin']['variance'].mean()
            var_reduction = (1 - rr_variance / baseline_variance) * 100

            if var_reduction >= 50:
                print(f"  {self.check_mark} Round-Robin achieves {var_reduction:.1f}% variance reduction")
                print(f"  {self.check_mark} Recommendation: Use Round-Robin as default")
            else:
                print(f"  ⚠ Round-Robin only achieves {var_reduction:.1f}% variance reduction")

        if 'delta-debugging' in self.sum_df['strategy'].values:
            baseline_variance = self.sum_df[self.sum_df['strategy'] == 'sequential-exhaustive']['variance'].mean()
            dd_variance = self.sum_df[self.sum_df['strategy'] == 'delta-debugging']['variance'].mean()
            var_reduction = (1 - dd_variance / baseline_variance) * 100

            if var_reduction >= 90:
                print(f"  {self.check_mark} Delta Debugging achieves {var_reduction:.1f}% variance reduction")
                print(f"  {self.check_mark} Recommendation: Use Delta Debugging for maximum quality")
            else:
                print(f"  ⚠ Delta Debugging only achieves {var_reduction:.1f}% variance reduction")

        print(f"\n  {self.check_mark} Shrinking Strategies Comparison analysis complete")


def main():
    analysis = ShrinkingStrategiesComparisonAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
