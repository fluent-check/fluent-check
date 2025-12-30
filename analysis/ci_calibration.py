#!/usr/bin/env python3
"""
Credible Interval Calibration Analysis

Tests whether the 90% credible intervals for arbitrary size estimation are
properly calibrated - i.e., whether the true size falls within the interval
~90% of the time.

Hypotheses:
- H1: Individual filter CIs achieve 90% ± 5% coverage
- H2: Product (tuple) CIs maintain ≥90% coverage (may be conservative)
- H3: Sum (union) CIs maintain ≥90% coverage (may be conservative)
- H4: CIs are not excessively conservative (coverage ≤99%)

Generates:
- ci-calibration.png: Coverage rates by scenario type
"""

import matplotlib.pyplot as plt
import numpy as np
from scipy import stats

from base import AnalysisBase
from viz import save_figure


class CICalibrationAnalysis(AnalysisBase):
    """Analysis of credible interval calibration for size estimation."""

    TARGET_COVERAGE = 0.90
    TOLERANCE = 0.05  # ±5%

    def __init__(self):
        super().__init__()
        self.h1_pass = None
        self.h2_pass = None
        self.h3_pass = None
        self.h4_pass = None

    @property
    def name(self) -> str:
        return "Credible Interval Calibration Analysis"

    @property
    def csv_filename(self) -> str:
        return "ci-calibration.csv"

    @property
    def required_columns(self) -> list:
        return ['scenario', 'true_size', 'estimated_size', 'ci_lower', 'ci_upper', 'true_in_ci']

    def analyze(self) -> None:
        """Perform the CI calibration analysis."""
        self._categorize_scenarios()
        self._compute_coverage_by_scenario()
        self._compute_coverage_by_type()
        self._test_hypotheses()
        self._analyze_interval_width()
        self._create_visualization()
        self._print_conclusion()

    def _categorize_scenarios(self) -> None:
        """Categorize scenarios by type."""
        def get_type(scenario: str) -> str:
            if scenario.startswith('filter_') and 'chain' not in scenario:
                return 'filter'
            if scenario.startswith('filter_chain'):
                return 'filter_chain'
            if scenario.startswith('tuple_exact'):
                return 'tuple_exact'
            if scenario.startswith('tuple_filtered'):
                return 'tuple_filtered'
            if scenario.startswith('union_exact'):
                return 'union_exact'
            if scenario.startswith('union_filtered'):
                return 'union_filtered'
            if scenario.startswith('tuple_of'):
                return 'nested_tuple'
            if scenario.startswith('union_of'):
                return 'nested_union'
            return 'other'

        self.df['scenario_type'] = self.df['scenario'].apply(get_type)
        self.scenario_types = self.df['scenario_type'].unique()

    def _compute_coverage_by_scenario(self) -> None:
        """Compute coverage rate for each scenario."""
        self.print_section("COVERAGE BY SCENARIO")
        print(f"{'Scenario':<30} {'Coverage':<10} {'N':<8} {'95% CI':<20}")
        self.print_divider()

        self.scenario_coverage = {}

        for scenario in sorted(self.df['scenario'].unique()):
            data = self.df[self.df['scenario'] == scenario]
            n = len(data)
            coverage = data['true_in_ci'].mean()

            # Wilson score confidence interval
            ci = self._wilson_ci(coverage, n)

            print(f"{scenario:<30} {coverage:>7.1%}   {n:<8} [{ci[0]:.1%}, {ci[1]:.1%}]")

            self.scenario_coverage[scenario] = {
                'coverage': coverage,
                'n': n,
                'ci': ci
            }

    def _compute_coverage_by_type(self) -> None:
        """Compute coverage rate by scenario type."""
        self.print_section("COVERAGE BY SCENARIO TYPE")
        print(f"{'Type':<20} {'Coverage':<10} {'N':<8} {'95% CI':<20}")
        self.print_divider()

        self.type_coverage = {}

        for stype in sorted(self.scenario_types):
            data = self.df[self.df['scenario_type'] == stype]
            n = len(data)
            coverage = data['true_in_ci'].mean()

            # Wilson score confidence interval
            ci = self._wilson_ci(coverage, n)

            print(f"{stype:<20} {coverage:>7.1%}   {n:<8} [{ci[0]:.1%}, {ci[1]:.1%}]")

            self.type_coverage[stype] = {
                'coverage': coverage,
                'n': n,
                'ci': ci
            }

    def _wilson_ci(self, p: float, n: int, confidence: float = 0.95) -> tuple:
        """Compute Wilson score confidence interval for a proportion."""
        if n == 0:
            return (0, 1)

        z = stats.norm.ppf(1 - (1 - confidence) / 2)
        denominator = 1 + z**2 / n
        center = (p + z**2 / (2*n)) / denominator
        margin = z * np.sqrt((p * (1 - p) + z**2 / (4*n)) / n) / denominator

        return (max(0, center - margin), min(1, center + margin))

    def _test_hypotheses(self) -> None:
        """Test the four hypotheses."""
        self.print_section("HYPOTHESIS TESTING")

        # H1: Filter CIs achieve 90% ± 5% coverage
        filter_data = self.df[self.df['scenario_type'] == 'filter']
        if len(filter_data) > 0:
            h1_coverage = filter_data['true_in_ci'].mean()
            h1_n = len(filter_data)
            h1_ci = self._wilson_ci(h1_coverage, h1_n)
            h1_pass = abs(h1_coverage - self.TARGET_COVERAGE) <= self.TOLERANCE

            print(f"\nH1 (Filter CI Calibration):")
            print(f"   Target: {self.TARGET_COVERAGE:.0%} ± {self.TOLERANCE:.0%}")
            print(f"   Observed: {h1_coverage:.1%} (95% CI: [{h1_ci[0]:.1%}, {h1_ci[1]:.1%}])")
            print(f"   Result: {'PASS' if h1_pass else 'FAIL'}")
            self.h1_pass = h1_pass
        else:
            print("\nH1: No filter data available")
            self.h1_pass = None

        # H2: Product CIs maintain ≥90% coverage
        product_data = self.df[self.df['scenario_type'].isin(['tuple_exact', 'tuple_filtered', 'nested_tuple'])]
        if len(product_data) > 0:
            h2_coverage = product_data['true_in_ci'].mean()
            h2_n = len(product_data)
            h2_ci = self._wilson_ci(h2_coverage, h2_n)
            # One-sided test: coverage ≥ 90%
            h2_pass = h2_ci[0] >= self.TARGET_COVERAGE - self.TOLERANCE  # Lower bound check

            print(f"\nH2 (Product CI Calibration):")
            print(f"   Target: ≥{self.TARGET_COVERAGE:.0%}")
            print(f"   Observed: {h2_coverage:.1%} (95% CI: [{h2_ci[0]:.1%}, {h2_ci[1]:.1%}])")
            print(f"   Result: {'PASS' if h2_pass else 'FAIL'}")
            self.h2_pass = h2_pass
        else:
            print("\nH2: No product data available")
            self.h2_pass = None

        # H3: Sum CIs maintain ≥90% coverage
        sum_data = self.df[self.df['scenario_type'].isin(['union_exact', 'union_filtered', 'nested_union'])]
        if len(sum_data) > 0:
            h3_coverage = sum_data['true_in_ci'].mean()
            h3_n = len(sum_data)
            h3_ci = self._wilson_ci(h3_coverage, h3_n)
            h3_pass = h3_ci[0] >= self.TARGET_COVERAGE - self.TOLERANCE

            print(f"\nH3 (Sum CI Calibration):")
            print(f"   Target: ≥{self.TARGET_COVERAGE:.0%}")
            print(f"   Observed: {h3_coverage:.1%} (95% CI: [{h3_ci[0]:.1%}, {h3_ci[1]:.1%}])")
            print(f"   Result: {'PASS' if h3_pass else 'FAIL'}")
            self.h3_pass = h3_pass
        else:
            print("\nH3: No sum data available")
            self.h3_pass = None

        # H4: CIs are not excessively conservative (≤99%)
        overall_coverage = self.df['true_in_ci'].mean()
        overall_n = len(self.df)
        overall_ci = self._wilson_ci(overall_coverage, overall_n)
        h4_pass = overall_coverage <= 0.99

        print(f"\nH4 (Not Excessively Conservative):")
        print(f"   Target: ≤99% (too wide = wasted precision)")
        print(f"   Observed: {overall_coverage:.1%} (95% CI: [{overall_ci[0]:.1%}, {overall_ci[1]:.1%}])")
        print(f"   Result: {'PASS' if h4_pass else 'FAIL (intervals too conservative)'}")
        self.h4_pass = h4_pass

    def _analyze_interval_width(self) -> None:
        """Analyze interval width characteristics."""
        self.print_section("INTERVAL WIDTH ANALYSIS")

        # Relative width = (upper - lower) / true_size
        self.df['relative_width'] = np.where(
            self.df['true_size'] > 0,
            (self.df['ci_upper'] - self.df['ci_lower']) / self.df['true_size'],
            np.nan
        )

        print(f"{'Type':<20} {'Median Width':<15} {'Mean Width':<15} {'Max Width':<15}")
        self.print_divider()

        for stype in sorted(self.scenario_types):
            data = self.df[self.df['scenario_type'] == stype]
            widths = data['relative_width'].dropna()

            if len(widths) > 0:
                print(f"{stype:<20} {widths.median():>12.1%}    {widths.mean():>12.1%}    {widths.max():>12.1%}")

    def _create_visualization(self) -> None:
        """Create visualization of CI calibration results."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        # Left: Coverage by scenario type
        ax1 = axes[0]
        types = sorted(self.type_coverage.keys())
        coverages = [self.type_coverage[t]['coverage'] for t in types]
        ci_lowers = [self.type_coverage[t]['ci'][0] for t in types]
        ci_uppers = [self.type_coverage[t]['ci'][1] for t in types]

        x_pos = np.arange(len(types))
        colors = ['#2ecc71' if c >= 0.85 else '#e74c3c' for c in coverages]

        ax1.bar(x_pos, coverages, color=colors, alpha=0.7, edgecolor='black')
        ax1.errorbar(x_pos, coverages,
                     yerr=[np.array(coverages) - np.array(ci_lowers),
                           np.array(ci_uppers) - np.array(coverages)],
                     fmt='none', color='black', capsize=5)

        ax1.axhline(y=0.90, color='blue', linestyle='--', alpha=0.7, label='Target (90%)')
        ax1.axhspan(0.85, 0.95, alpha=0.1, color='blue', label='Acceptable range (±5%)')

        ax1.set_xlabel('Scenario Type', fontsize=12)
        ax1.set_ylabel('Coverage Rate', fontsize=12)
        ax1.set_title('CI Coverage by Scenario Type', fontsize=14)
        ax1.set_xticks(x_pos)
        ax1.set_xticklabels([t.replace('_', '\n') for t in types], fontsize=9, rotation=0)
        ax1.set_ylim(0, 1.05)
        ax1.legend(loc='lower right')
        ax1.grid(True, axis='y', alpha=0.3)

        # Right: Relative error vs coverage
        ax2 = axes[1]

        for stype in self.scenario_types:
            data = self.df[self.df['scenario_type'] == stype]
            ax2.scatter(data['relative_error'], data['true_in_ci'].astype(int),
                        alpha=0.3, s=10, label=stype)

        ax2.set_xlabel('Relative Error (|estimated - true| / true)', fontsize=12)
        ax2.set_ylabel('True Size in CI (0=No, 1=Yes)', fontsize=12)
        ax2.set_title('Coverage vs Estimation Error', fontsize=14)
        ax2.set_xlim(-0.1, 2.0)
        ax2.legend(loc='center right', fontsize=8)
        ax2.grid(True, alpha=0.3)

        save_figure(fig, self.get_output_path("ci-calibration.png"))

    def _print_conclusion(self) -> None:
        """Print conclusion."""
        self.print_section("CONCLUSION")

        hypotheses = [
            ('H1 (Filter CI Calibration)', self.h1_pass),
            ('H2 (Product CI Calibration)', self.h2_pass),
            ('H3 (Sum CI Calibration)', self.h3_pass),
            ('H4 (Not Excessively Conservative)', self.h4_pass)
        ]

        passed = sum(1 for _, p in hypotheses if p == True and p is not None)
        failed = sum(1 for _, p in hypotheses if p == False and p is not None)
        skipped = sum(1 for _, p in hypotheses if p is None)

        print("\nHypothesis Summary:")
        for name, result in hypotheses:
            if result is None:
                print(f"  - {name}: SKIPPED (no data)")
            elif result:
                print(f"  {self.check_mark} {name}: PASS")
            else:
                print(f"  x {name}: FAIL")

        print(f"\nOverall: {passed} passed, {failed} failed, {skipped} skipped")

        overall_coverage = self.df['true_in_ci'].mean()

        if overall_coverage < 0.85:
            print(f"\n  WARNING: Overall coverage ({overall_coverage:.1%}) is below target (90%).")
            print("  The credible intervals are too narrow and undercover the true size.")
            print("  Consider:")
            print("    1. More warmup samples before calling size()")
            print("    2. Using a different prior (e.g., Beta(1,1) instead of Beta(2,1))")
            print("    3. Using proper Bayesian interval propagation instead of interval arithmetic")
        elif overall_coverage > 0.99:
            print(f"\n  NOTE: Overall coverage ({overall_coverage:.1%}) is above 99%.")
            print("  The credible intervals may be too conservative (overly wide).")
            print("  This wastes precision but is not a correctness issue.")
        else:
            print(f"\n  {self.check_mark} Overall coverage ({overall_coverage:.1%}) is within acceptable range.")


def main():
    analysis = CICalibrationAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
