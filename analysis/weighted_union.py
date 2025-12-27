#!/usr/bin/env python3
"""
Weighted Union Probability Analysis: Does union sampling match size-based weighting?

Tests whether ArbitraryComposite selects branches with probability proportional
to their sizes. Uses chi-squared goodness-of-fit to compare observed frequencies
against theoretical expectations.

Metrics:
- Empirical branch 0 frequency per union type
- Chi-squared goodness-of-fit (observed vs expected)
- Residual deviation from theoretical probability

Generates:
- weighted-union.png: Observed vs expected frequencies and residual analysis
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from scipy import stats

from base import AnalysisBase
from stats import wilson_score_interval, format_ci
from viz import save_figure


class WeightedUnionAnalysis(AnalysisBase):
    """Analysis of weighted union probability distribution."""

    @property
    def name(self) -> str:
        return "Weighted Union Probability Analysis"

    @property
    def csv_filename(self) -> str:
        return "weighted-union.csv"

    def analyze(self) -> None:
        """Perform the weighted union analysis."""
        self._compute_chi_squared()
        self._create_visualization()
        self._print_conclusion()

    def _compute_chi_squared(self) -> None:
        """Compute chi-squared goodness-of-fit tests."""
        self.print_section("CHI-SQUARED GOODNESS-OF-FIT TEST")

        self.results = []
        for union_type in self.df['union_type'].unique():
            type_df = self.df[self.df['union_type'] == union_type]

            expected_p0 = self.safe_first(type_df, 'expected_p0', 0.5)

            total_branch0 = type_df['branch0_count'].sum()
            total_branch1 = type_df['branch1_count'].sum()
            total_samples = total_branch0 + total_branch1

            observed_p0 = total_branch0 / total_samples if total_samples > 0 else 0

            ci = wilson_score_interval(total_branch0, total_samples)

            observed = np.array([total_branch0, total_branch1])
            expected = np.array([expected_p0 * total_samples, (1 - expected_p0) * total_samples])
            chi2, p_value = stats.chisquare(observed, expected)

            residual = observed_p0 - expected_p0

            print(f"\n{union_type}:")
            print(f"  Expected P(branch 0): {expected_p0:.4f}")
            print(f"  Observed P(branch 0): {observed_p0:.4f} {format_ci(*ci)}")
            print(f"  Residual: {residual:+.4f}")
            print(f"  Total samples: {total_samples:,}")
            print(f"  chi2 = {chi2:.2f}, df = 1, p = {p_value:.4f} {'*' if p_value < 0.05 else ''}")

            self.results.append({
                'union_type': union_type,
                'expected_p0': expected_p0,
                'observed_p0': observed_p0,
                'ci_lower': ci[0],
                'ci_upper': ci[1],
                'residual': residual,
                'chi2': chi2,
                'p_value': p_value,
                'total_samples': total_samples
            })

    def _create_visualization(self) -> None:
        """Create weighted union visualization."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        self._create_comparison_chart(axes[0])
        self._create_residual_chart(axes[1])

        save_figure(fig, self.get_output_path("weighted-union.png"))

    def _create_comparison_chart(self, ax) -> None:
        """Create observed vs expected comparison chart."""
        union_labels = [r['union_type'].replace('_', '\n') for r in self.results]
        x = np.arange(len(union_labels))
        width = 0.35

        expected_values = [r['expected_p0'] for r in self.results]
        observed_values = [r['observed_p0'] for r in self.results]
        observed_errors = [(r['observed_p0'] - r['ci_lower'], r['ci_upper'] - r['observed_p0']) for r in self.results]

        observed_errors_array = np.array(observed_errors).T

        ax.scatter(x, expected_values, color='red', marker='D', s=100, label='Expected', zorder=3)
        ax.bar(x, observed_values, width, label='Observed',
               yerr=observed_errors_array, capsize=5, color='#3498db', alpha=0.7)

        ax.set_xlabel('Union Type')
        ax.set_ylabel('Probability of Selecting Branch 0')
        ax.set_title('Observed vs Expected Branch Selection Probability')
        ax.set_xticks(x)
        ax.set_xticklabels(union_labels, fontsize=8)
        ax.set_ylim(0, 1.05)
        ax.legend()
        ax.grid(True, axis='y', alpha=0.3)

        ax.axhline(y=0.5, color='gray', linestyle=':', alpha=0.5, linewidth=1)

    def _create_residual_chart(self, ax) -> None:
        """Create residual plot."""
        union_labels = [r['union_type'].replace('_', '\n') for r in self.results]
        x = np.arange(len(union_labels))
        width = 0.35

        residuals = [r['residual'] for r in self.results]
        colors = ['green' if abs(r) < 0.01 else 'orange' if abs(r) < 0.02 else 'red' for r in residuals]

        ax.bar(x, residuals, width, color=colors, alpha=0.7)
        ax.axhline(y=0, color='black', linestyle='-', linewidth=1)
        ax.axhline(y=0.01, color='red', linestyle='--', alpha=0.5, linewidth=1, label='+/-1% deviation')
        ax.axhline(y=-0.01, color='red', linestyle='--', alpha=0.5, linewidth=1)

        ax.set_xlabel('Union Type')
        ax.set_ylabel('Residual (Observed - Expected)')
        ax.set_title('Deviation from Theoretical Probability')
        ax.set_xticks(x)
        ax.set_xticklabels(union_labels, fontsize=8)
        ax.legend()
        ax.grid(True, axis='y', alpha=0.3)

    def _print_conclusion(self) -> None:
        """Print conclusion."""
        self.print_section("CONCLUSION")

        all_pass = all(r['p_value'] > 0.05 for r in self.results)
        small_residuals = all(abs(r['residual']) < 0.02 for r in self.results)

        if all_pass and small_residuals:
            print(f"  {self.check_mark} Hypothesis supported: Weighted union selection matches")
            print(f"    theoretical proportions (chi2 p > 0.05, residuals < 2%)")
        elif all_pass:
            print(f"  {self.check_mark} Hypothesis supported: Chi-squared tests pass (p > 0.05)")
            print(f"  Warning: Some residuals > 2% but within statistical noise")
        else:
            print(f"  x Hypothesis not supported: Some union types show")
            print(f"    significant deviation from expected proportions")

        for r in self.results:
            if r['p_value'] < 0.05:
                print(f"  Warning: {r['union_type']}: Significant deviation (p={r['p_value']:.4f})")
            elif abs(r['residual']) > 0.02:
                print(f"  - {r['union_type']}: Large residual ({r['residual']:+.4f}), but not statistically significant")

        print(f"\n  {self.check_mark} Weighted union analysis complete")


def main():
    analysis = WeightedUnionAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
