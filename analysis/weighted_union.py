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
        bars = ax.bar(x, observed_values, width, label='Observed',
               yerr=observed_errors_array, capsize=5, color='#3498db', alpha=0.7)

        # Annotate significant deviations
        for idx, rect in enumerate(bars):
            p_val = self.results[idx]['p_value']
            if p_val < 0.05:
                height = rect.get_height()
                ax.text(rect.get_x() + rect.get_width()/2., 1.05 * height,
                        f'p={p_val:.3f}',
                        ha='center', va='bottom', color='red', fontweight='bold', fontsize=9)

        ax.set_xlabel('Union Type')
        ax.set_ylabel('Probability of Selecting Branch 0')
        ax.set_title('Observed vs Expected (with Significance)')
        ax.set_xticks(x)
        ax.set_xticklabels(union_labels, fontsize=8)
        ax.set_ylim(0, 1.1)
        ax.legend()
        ax.grid(True, axis='y', alpha=0.3)

        ax.axhline(y=0.5, color='gray', linestyle=':', alpha=0.5, linewidth=1)

    def _create_residual_chart(self, ax) -> None:
        """Create residual plot."""
        union_labels = [r['union_type'].replace('_', '\n') for r in self.results]
        x = np.arange(len(union_labels))
        width = 0.35

        residuals = [r['residual'] for r in self.results]
        p_values = [r['p_value'] for r in self.results]
        
        # Color logic:
        # Green: Within 1% tolerance OR Not Significant
        # Yellow: > 1% but Not Significant (just noise) - unlikely if sample size is large
        # Red: > 1% AND Significant (Real Deviation)
        colors = []
        for r, p in zip(residuals, p_values):
            if abs(r) <= 0.01:
                colors.append('green') # Within tolerance
            elif p >= 0.05:
                colors.append('orange') # Large deviation but not significant (high variance?)
            else:
                colors.append('red') # Significant deviation outside tolerance

        ax.bar(x, residuals, width, color=colors, alpha=0.7)
        ax.axhline(y=0, color='black', linestyle='-', linewidth=1)
        ax.axhline(y=0.01, color='red', linestyle='--', alpha=0.5, linewidth=1, label='+/-1% Tolerance')
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
        
        # Pass if (Not Significant) OR (Within 1% Tolerance)
        # We fail only if we have a Significant Deviation > 1%
        
        failures = []
        for r in self.results:
            is_significant = r['p_value'] < 0.05
            is_outside_tolerance = abs(r['residual']) > 0.01
            
            if is_significant and is_outside_tolerance:
                failures.append(r)

        if not failures:
            print(f"  {self.check_mark} Hypothesis supported: All deviations are either")
            print(f"    statistically insignificant (p > 0.05) or within tolerance (< 1%)")
        else:
            print(f"  x Hypothesis not supported: Found significant deviations > 1%")
            for f in failures:
                print(f"    - {f['union_type']}: Residual {f['residual']:+.4f}, p={f['p_value']:.4f}")

        print(f"\n  {self.check_mark} Weighted union analysis complete")


def main():
    analysis = WeightedUnionAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
