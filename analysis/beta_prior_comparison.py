#!/usr/bin/env python3
"""
Beta Prior Comparison Analysis

Analyzes the impact of different Beta priors on CI calibration:
- Beta(2,1): Current implementation (mode at 1.0, optimistic)
- Beta(1,1): Uniform prior (non-informative)
- Beta(0.5,0.5): Jeffreys prior (scale-invariant)

Hypotheses:
- H1: All priors achieve coverage ≥90% asymptotically (at high sample counts)
- H2: Beta(2,1) converges slower for low true pass rates
- H3: Jeffreys prior has best calibration across all pass rates
- H4: Uniform prior Beta(1,1) provides best balance of bias and variance
"""

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from base import AnalysisBase
from viz import save_figure
from stats import wilson_score_interval

class BetaPriorComparisonAnalysis(AnalysisBase):
    def __init__(self):
        super().__init__()
        self.h1_pass = None
        self.h2_pass = None
        self.h3_pass = None
        self.h4_pass = None

    @property
    def name(self) -> str:
        return "Beta Prior Comparison Analysis"

    @property
    def csv_filename(self) -> str:
        return "beta-prior-comparison.csv"

    @property
    def required_columns(self) -> list:
        return ['prior_name', 'pass_rate', 'warmup_count', 'true_size',
                'estimated_size', 'ci_width', 'true_in_ci', 'relative_error', 'bias']

    def analyze(self) -> None:
        self._check_asymptotic_coverage()
        self._check_convergence_speed()
        self._check_calibration_by_prior()
        self._check_bias_variance_tradeoff()
        self._create_visualization()
        self._print_summary_table()
        self._print_recommendations()
        self._print_conclusion()

    def _check_asymptotic_coverage(self) -> None:
        """H1: All priors achieve coverage ≥90% asymptotically (at high sample counts)."""
        self.print_section("H1: ASYMPTOTIC COVERAGE (warmup ≥ 200)")

        # Filter to high warmup counts
        high_warmup = self.df[self.df['warmup_count'] >= 200]

        coverage_by_prior = high_warmup.groupby('prior_name')['true_in_ci'].agg(['mean', 'count'])

        # Calculate Wilson score CIs
        coverage_by_prior['ci_lower'] = coverage_by_prior.apply(
            lambda row: wilson_score_interval(int(row['mean'] * row['count']), int(row['count']))[0], axis=1)
        coverage_by_prior['ci_upper'] = coverage_by_prior.apply(
            lambda row: wilson_score_interval(int(row['mean'] * row['count']), int(row['count']))[1], axis=1)

        print(f"{'Prior':<30} {'Coverage':<12} {'95% CI':<20} {'Result'}")
        self.print_divider()

        all_pass = True
        for prior, row in coverage_by_prior.iterrows():
            coverage = row['mean']
            ci_str = f"[{row['ci_lower']*100:.1f}%, {row['ci_upper']*100:.1f}%]"
            result = "PASS" if coverage >= 0.90 else "FAIL"
            if coverage < 0.90:
                all_pass = False
            print(f"{prior:<30} {coverage*100:.1f}%        {ci_str:<20} {result}")

        self.h1_pass = all_pass
        print(f"\nResult: {'PASS' if self.h1_pass else 'FAIL'} (All priors have asymptotic coverage ≥ 90%)")

    def _check_convergence_speed(self) -> None:
        """H2: Beta(2,1) converges slower for low true pass rates."""
        self.print_section("H2: CONVERGENCE SPEED BY PRIOR")

        # Focus on sparse pass rates (1%, 5%, 10%)
        sparse = self.df[self.df['pass_rate'] <= 0.10]

        print("Coverage by warmup count for sparse filters (pass rate ≤ 10%):")
        print()

        pivot = sparse.pivot_table(
            values='true_in_ci',
            index='warmup_count',
            columns='prior_name',
            aggfunc='mean'
        )

        # Reorder columns
        column_order = ['Beta(2,1)_current', 'Beta(1,1)_uniform', 'Beta(0.5,0.5)_jeffreys']
        pivot = pivot[[c for c in column_order if c in pivot.columns]]

        print(f"{'Warmup':<10}", end="")
        for col in pivot.columns:
            short_name = col.split('_')[0]
            print(f"{short_name:<15}", end="")
        print()
        self.print_divider()

        for warmup, row in pivot.iterrows():
            print(f"{warmup:<10}", end="")
            for val in row.values:
                print(f"{val*100:.1f}%          ", end="")
            print()

        # Calculate convergence speed: warmup needed to reach 90% coverage
        def warmup_for_90(df_subset):
            for w in sorted(df_subset['warmup_count'].unique()):
                cov = df_subset[df_subset['warmup_count'] == w]['true_in_ci'].mean()
                if cov >= 0.90:
                    return w
            return None

        print(f"\nWarmup needed to reach 90% coverage (sparse filters):")
        convergence = {}
        for prior in self.df['prior_name'].unique():
            prior_sparse = sparse[sparse['prior_name'] == prior]
            w = warmup_for_90(prior_sparse)
            convergence[prior] = w
            short_name = prior.split('_')[0]
            print(f"  {short_name}: {w if w else '>500'}")

        # Beta(2,1) should converge slower (need more warmup) for sparse
        current_warmup = convergence.get('Beta(2,1)_current')
        uniform_warmup = convergence.get('Beta(1,1)_uniform')
        jeffreys_warmup = convergence.get('Beta(0.5,0.5)_jeffreys')

        # H2 passes if Beta(2,1) needs more warmup than others for sparse filters
        self.h2_pass = (current_warmup is not None and
                       ((uniform_warmup is not None and current_warmup > uniform_warmup) or
                        (jeffreys_warmup is not None and current_warmup > jeffreys_warmup)))

        print(f"\nResult: {'PASS' if self.h2_pass else 'FAIL/INCONCLUSIVE'} (Beta(2,1) converges slower for sparse)")

    def _check_calibration_by_prior(self) -> None:
        """H3: Jeffreys prior has best calibration across all pass rates."""
        self.print_section("H3: CALIBRATION BY PRIOR (all pass rates, warmup ≥ 100)")

        # Use moderate warmup to see calibration
        moderate = self.df[self.df['warmup_count'] >= 100]

        # Coverage by prior and pass rate
        pivot = moderate.pivot_table(
            values='true_in_ci',
            index='pass_rate',
            columns='prior_name',
            aggfunc='mean'
        )

        column_order = ['Beta(2,1)_current', 'Beta(1,1)_uniform', 'Beta(0.5,0.5)_jeffreys']
        pivot = pivot[[c for c in column_order if c in pivot.columns]]

        print(f"{'Pass Rate':<12}", end="")
        for col in pivot.columns:
            short_name = col.split('_')[0]
            print(f"{short_name:<15}", end="")
        print()
        self.print_divider()

        for pass_rate, row in pivot.iterrows():
            print(f"{pass_rate*100:>6.0f}%     ", end="")
            for val in row.values:
                print(f"{val*100:.1f}%          ", end="")
            print()

        # Calculate mean absolute deviation from 90% target
        target = 0.90
        mad_by_prior = {}
        for prior in pivot.columns:
            mad = np.abs(pivot[prior] - target).mean()
            mad_by_prior[prior] = mad

        print(f"\nMean absolute deviation from 90% target:")
        best_prior = min(mad_by_prior, key=mad_by_prior.get)
        for prior, mad in sorted(mad_by_prior.items(), key=lambda x: x[1]):
            short_name = prior.split('_')[0]
            marker = " <-- BEST" if prior == best_prior else ""
            print(f"  {short_name}: {mad*100:.2f}%{marker}")

        self.h3_pass = 'jeffreys' in best_prior.lower()
        print(f"\nResult: {'PASS' if self.h3_pass else 'FAIL'} (Jeffreys has best calibration)")

    def _check_bias_variance_tradeoff(self) -> None:
        """H4: Uniform prior Beta(1,1) provides best balance of bias and variance."""
        self.print_section("H4: BIAS-VARIANCE TRADEOFF")

        moderate = self.df[self.df['warmup_count'] >= 50]

        stats = moderate.groupby('prior_name').agg({
            'bias': ['mean', 'std'],
            'relative_error': ['mean', 'std'],
            'true_in_ci': 'mean'
        }).round(4)

        print(f"{'Prior':<30} {'Mean Bias':<12} {'Bias Std':<12} {'MAE':<12} {'Coverage'}")
        self.print_divider()

        best_balance = None
        best_score = float('inf')

        for prior in stats.index:
            mean_bias = stats.loc[prior, ('bias', 'mean')]
            std_bias = stats.loc[prior, ('bias', 'std')]
            mae = stats.loc[prior, ('relative_error', 'mean')]
            coverage = stats.loc[prior, ('true_in_ci', 'mean')]

            short_name = prior.split('_')[0]
            print(f"{short_name:<30} {mean_bias:>+8.1f}    {std_bias:>8.1f}    {mae*100:>6.1f}%    {coverage*100:.1f}%")

            # Score: lower is better (penalize both bias and variance)
            score = abs(mean_bias) + std_bias + (abs(coverage - 0.90) * 1000)
            if score < best_score:
                best_score = score
                best_balance = prior

        self.h4_pass = 'uniform' in best_balance.lower()
        print(f"\nBest overall balance: {best_balance.split('_')[0]}")
        print(f"Result: {'PASS' if self.h4_pass else 'FAIL'} (Uniform has best balance)")

    def _create_visualization(self) -> None:
        """Create comprehensive visualization."""
        fig, axes = plt.subplots(2, 2, figsize=(14, 12))

        # Define consistent colors
        prior_colors = {
            'Beta(2,1)_current': '#e41a1c',      # Red
            'Beta(1,1)_uniform': '#377eb8',      # Blue
            'Beta(0.5,0.5)_jeffreys': '#4daf4a'  # Green
        }
        prior_labels = {
            'Beta(2,1)_current': 'Beta(2,1) [current]',
            'Beta(1,1)_uniform': 'Beta(1,1) [uniform]',
            'Beta(0.5,0.5)_jeffreys': 'Beta(0.5,0.5) [Jeffreys]'
        }

        # Top-left: Coverage vs Warmup Count (all pass rates combined)
        ax1 = axes[0, 0]
        for prior in self.df['prior_name'].unique():
            prior_data = self.df[self.df['prior_name'] == prior]
            coverage_by_warmup = prior_data.groupby('warmup_count')['true_in_ci'].mean()
            ax1.plot(coverage_by_warmup.index, coverage_by_warmup.values * 100,
                    marker='o', color=prior_colors.get(prior, 'gray'),
                    label=prior_labels.get(prior, prior), linewidth=2, markersize=6)

        ax1.axhline(y=90, color='black', linestyle='--', alpha=0.5, label='Target 90%')
        ax1.set_xscale('log')
        ax1.set_xlabel('Warmup Count')
        ax1.set_ylabel('Coverage (%)')
        ax1.set_title('Coverage vs Warmup Count (All Pass Rates)')
        ax1.legend(loc='lower right')
        ax1.grid(True, alpha=0.3)
        ax1.set_ylim(70, 102)

        # Top-right: Coverage by Pass Rate (at warmup=200)
        ax2 = axes[0, 1]
        warmup_200 = self.df[self.df['warmup_count'] == 200]
        for prior in self.df['prior_name'].unique():
            prior_data = warmup_200[warmup_200['prior_name'] == prior]
            coverage_by_rate = prior_data.groupby('pass_rate')['true_in_ci'].mean()
            ax2.plot(coverage_by_rate.index * 100, coverage_by_rate.values * 100,
                    marker='s', color=prior_colors.get(prior, 'gray'),
                    label=prior_labels.get(prior, prior), linewidth=2, markersize=6)

        ax2.axhline(y=90, color='black', linestyle='--', alpha=0.5, label='Target 90%')
        ax2.set_xlabel('True Pass Rate (%)')
        ax2.set_ylabel('Coverage (%)')
        ax2.set_title('Coverage by Pass Rate (warmup=200)')
        ax2.legend(loc='lower right')
        ax2.grid(True, alpha=0.3)
        ax2.set_ylim(70, 102)

        # Bottom-left: Mean Bias by Pass Rate (at warmup=100)
        ax3 = axes[1, 0]
        warmup_100 = self.df[self.df['warmup_count'] == 100]
        width = 0.25
        pass_rates = sorted(warmup_100['pass_rate'].unique())
        x = np.arange(len(pass_rates))

        for i, prior in enumerate(['Beta(2,1)_current', 'Beta(1,1)_uniform', 'Beta(0.5,0.5)_jeffreys']):
            if prior in warmup_100['prior_name'].unique():
                prior_data = warmup_100[warmup_100['prior_name'] == prior]
                bias_by_rate = prior_data.groupby('pass_rate')['bias'].mean()
                offset = (i - 1) * width
                ax3.bar(x + offset, bias_by_rate.values, width,
                       color=prior_colors.get(prior, 'gray'),
                       label=prior_labels.get(prior, prior), alpha=0.8)

        ax3.axhline(y=0, color='black', linestyle='-', alpha=0.3)
        ax3.set_xlabel('True Pass Rate (%)')
        ax3.set_ylabel('Mean Bias (estimated - true size)')
        ax3.set_title('Estimation Bias by Pass Rate (warmup=100)')
        ax3.set_xticks(x)
        ax3.set_xticklabels([f'{r*100:.0f}%' for r in pass_rates])
        ax3.legend(loc='upper right', fontsize=8)
        ax3.grid(True, axis='y', alpha=0.3)

        # Bottom-right: Convergence for sparse filters (pass rate ≤ 10%)
        ax4 = axes[1, 1]
        sparse = self.df[self.df['pass_rate'] <= 0.10]
        for prior in self.df['prior_name'].unique():
            prior_data = sparse[sparse['prior_name'] == prior]
            coverage_by_warmup = prior_data.groupby('warmup_count')['true_in_ci'].mean()
            ax4.plot(coverage_by_warmup.index, coverage_by_warmup.values * 100,
                    marker='o', color=prior_colors.get(prior, 'gray'),
                    label=prior_labels.get(prior, prior), linewidth=2, markersize=6)

        ax4.axhline(y=90, color='black', linestyle='--', alpha=0.5, label='Target 90%')
        ax4.set_xscale('log')
        ax4.set_xlabel('Warmup Count')
        ax4.set_ylabel('Coverage (%)')
        ax4.set_title('Coverage for Sparse Filters (pass rate ≤ 10%)')
        ax4.legend(loc='lower right')
        ax4.grid(True, alpha=0.3)
        ax4.set_ylim(50, 102)

        save_figure(fig, self.get_output_path("beta-prior-comparison.png"))

    def _print_summary_table(self) -> None:
        """Print summary statistics table."""
        self.print_section("SUMMARY BY PRIOR")

        # Overall stats at warmup=200
        warmup_200 = self.df[self.df['warmup_count'] == 200]

        summary = warmup_200.groupby('prior_name').agg({
            'true_in_ci': 'mean',
            'relative_error': 'mean',
            'bias': 'mean',
            'ci_width': 'mean'
        }).round(4)

        print(f"{'Prior':<30} {'Coverage':<12} {'MAE':<12} {'Mean Bias':<12} {'CI Width'}")
        self.print_divider()

        for prior in summary.index:
            coverage = summary.loc[prior, 'true_in_ci']
            mae = summary.loc[prior, 'relative_error']
            bias = summary.loc[prior, 'bias']
            width = summary.loc[prior, 'ci_width']
            short_name = prior.split('_')[0]
            print(f"{short_name:<30} {coverage*100:.1f}%        {mae*100:.1f}%        {bias:>+.1f}        {width:.1f}")

    def _print_recommendations(self) -> None:
        """Print recommendations based on findings."""
        self.print_section("RECOMMENDATIONS")

        # Analyze key findings
        warmup_200 = self.df[self.df['warmup_count'] == 200]
        sparse_200 = warmup_200[warmup_200['pass_rate'] <= 0.10]

        sparse_coverage = sparse_200.groupby('prior_name')['true_in_ci'].mean()
        overall_coverage = warmup_200.groupby('prior_name')['true_in_ci'].mean()

        print("Based on the analysis:")
        print()

        # Find best for sparse
        best_sparse = sparse_coverage.idxmax()
        print(f"1. For SPARSE filters (≤10% pass rate):")
        print(f"   Best prior: {best_sparse.split('_')[0]}")
        print(f"   Coverage: {sparse_coverage[best_sparse]*100:.1f}%")
        print()

        # Find most balanced overall
        target = 0.90
        deviation = (overall_coverage - target).abs()
        most_calibrated = deviation.idxmin()
        print(f"2. For OVERALL calibration:")
        print(f"   Best prior: {most_calibrated.split('_')[0]}")
        print(f"   Deviation from 90%: {deviation[most_calibrated]*100:.2f}%")
        print()

        # Current implementation assessment
        current_coverage = overall_coverage.get('Beta(2,1)_current', 0)
        current_sparse = sparse_coverage.get('Beta(2,1)_current', 0)

        print(f"3. CURRENT implementation Beta(2,1):")
        print(f"   Overall coverage: {current_coverage*100:.1f}%")
        print(f"   Sparse filter coverage: {current_sparse*100:.1f}%")

        if current_sparse >= 0.90:
            print("   Status: ACCEPTABLE for all scenarios")
        else:
            print(f"   Status: PROBLEMATIC for sparse filters (coverage < 90%)")
            print(f"   Recommendation: Consider switching to {best_sparse.split('_')[0]}")

    def _print_conclusion(self) -> None:
        self.print_section("CONCLUSION")
        print(f"H1 (Asymptotic ≥90%):     {'PASS' if self.h1_pass else 'FAIL'}")
        print(f"H2 (Beta(2,1) slower):    {'PASS' if self.h2_pass else 'FAIL'}")
        print(f"H3 (Jeffreys best cal.):  {'PASS' if self.h3_pass else 'FAIL'}")
        print(f"H4 (Uniform best bal.):   {'PASS' if self.h4_pass else 'FAIL'}")
        print()

        # Overall assessment
        if all([self.h1_pass]):
            print("KEY FINDING: All priors achieve acceptable asymptotic coverage.")
            print("The choice of prior affects convergence speed and bias, not final calibration.")

        # Document the Beta(2,1) behavior
        sparse = self.df[(self.df['pass_rate'] <= 0.10) & (self.df['warmup_count'] == 10)]
        current_sparse_low = sparse[sparse['prior_name'] == 'Beta(2,1)_current']['true_in_ci'].mean()
        uniform_sparse_low = sparse[sparse['prior_name'] == 'Beta(1,1)_uniform']['true_in_ci'].mean()

        print()
        print("PRIOR CHOICE IMPACT (at warmup=10, sparse filters):")
        print(f"  Beta(2,1) coverage: {current_sparse_low*100:.1f}%")
        print(f"  Beta(1,1) coverage: {uniform_sparse_low*100:.1f}%")

        if current_sparse_low < 0.85 and uniform_sparse_low >= 0.85:
            print()
            print("RECOMMENDATION: Consider Beta(1,1) for better sparse filter handling")
        elif current_sparse_low >= 0.85:
            print()
            print("FINDING: Beta(2,1) is acceptable even for sparse filters with default warmup")


def main():
    analysis = BetaPriorComparisonAnalysis()
    analysis.run()

if __name__ == "__main__":
    main()
