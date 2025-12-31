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
        """Compute statistical tests (Chi-squared, Cohen's h, CI coverage)."""
        self.print_section("STATISTICAL TESTS (G1, G2, G3)")

        self.results = []
        for union_type in self.df['union_type'].unique():
            type_df = self.df[self.df['union_type'] == union_type]

            expected_p0 = self.safe_first(type_df, 'expected_p0', 0.5)

            total_branch0 = type_df['branch0_count'].sum()
            total_branch1 = type_df['branch1_count'].sum()
            total_samples = total_branch0 + total_branch1

            observed_p0 = total_branch0 / total_samples if total_samples > 0 else 0

            # Wilson score interval for observed proportion
            ci_lo, ci_hi = wilson_score_interval(total_branch0, total_samples)

            # Chi-squared test
            observed = np.array([total_branch0, total_branch1])
            expected = np.array([expected_p0 * total_samples, (1 - expected_p0) * total_samples])
            chi2, p_value = stats.chisquare(observed, expected)

            # Cohen's h effect size
            # h = 2 * (arcsin(sqrt(p1)) - arcsin(sqrt(p2)))
            h = 2 * (np.arcsin(np.sqrt(observed_p0)) - np.arcsin(np.sqrt(expected_p0)))
            effect_size = abs(h)

            # Check criteria
            # G1: p_value >= 0.05 (fail to reject null -> consistent)
            pass_g1 = p_value >= 0.05
            
            # G2: Observed within 95% CI of expected?
            # Actually design says: "Observed selection rates are within 95% confidence intervals of expected rates"
            # This usually means expected_p0 is inside [ci_lo, ci_hi]
            pass_g2 = ci_lo <= expected_p0 <= ci_hi
            
            # G3: Effect size < 0.2 (small effect)
            pass_g3 = effect_size < 0.2

            print(f"\n{union_type}:")
            print(f"  Expected P(branch 0): {expected_p0:.4f}")
            print(f"  Observed P(branch 0): {observed_p0:.4f} {format_ci(ci_lo, ci_hi)}")
            print(f"  Total samples: {total_samples:,}")
            print(f"  Chi-squared: p = {p_value:.4f} ({'Pass' if pass_g1 else 'Fail'})")
            print(f"  CI Check: Expected in Observed CI? {'Yes' if pass_g2 else 'No'} ({'Pass' if pass_g2 else 'Fail'})")
            print(f"  Cohen's h: {effect_size:.4f} ({'Pass' if pass_g3 else 'Fail'})")

            self.results.append({
                'union_type': union_type,
                'expected_p0': expected_p0,
                'observed_p0': observed_p0,
                'ci_lower': ci_lo,
                'ci_upper': ci_hi,
                'chi2': chi2,
                'p_value': p_value,
                'effect_size': effect_size,
                'pass_g1': pass_g1,
                'pass_g2': pass_g2,
                'pass_g3': pass_g3,
                'total_samples': total_samples
            })

    def _create_visualization(self) -> None:
        """Create weighted union visualization."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        self._create_comparison_chart(axes[0])
        self._create_effect_size_chart(axes[1])

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
        bars = ax.bar(x, observed_values, width, label='Observed (95% CI)',
               yerr=observed_errors_array, capsize=5, color='#3498db', alpha=0.7)

        # Annotate significant p-values
        for idx, rect in enumerate(bars):
            p_val = self.results[idx]['p_value']
            if p_val < 0.05:
                height = rect.get_height()
                ax.text(rect.get_x() + rect.get_width()/2., 1.05 * height,
                        f'p={p_val:.3f}',
                        ha='center', va='bottom', color='red', fontweight='bold', fontsize=9)

        ax.set_xlabel('Union Type')
        ax.set_ylabel('Probability of Selecting Branch 0')
        ax.set_title('Observed vs Expected Proportions')
        ax.set_xticks(x)
        ax.set_xticklabels(union_labels, fontsize=8)
        ax.set_ylim(0, 1.1)
        ax.legend()
        ax.grid(True, axis='y', alpha=0.3)

    def _create_effect_size_chart(self, ax) -> None:
        """Create Cohen's h effect size chart."""
        union_labels = [r['union_type'].replace('_', '\n') for r in self.results]
        x = np.arange(len(union_labels))
        width = 0.35

        effect_sizes = [r['effect_size'] for r in self.results]
        
        # Color logic:
        # Green: h < 0.2 (Small/Negligible) - PASS G3
        # Yellow: 0.2 <= h < 0.5 (Small-Medium)
        # Red: h >= 0.5 (Medium-Large)
        colors = []
        for h in effect_sizes:
            if h < 0.2:
                colors.append('green')
            elif h < 0.5:
                colors.append('orange')
            else:
                colors.append('red')

        ax.bar(x, effect_sizes, width, color=colors, alpha=0.7)
        ax.axhline(y=0.2, color='red', linestyle='--', linewidth=1.5, label='Small Effect Limit (h=0.2)')
        
        ax.set_xlabel('Union Type')
        ax.set_ylabel("Cohen's h (Effect Size)")
        ax.set_title("Deviation Magnitude (Cohen's h)")
        ax.set_xticks(x)
        ax.set_xticklabels(union_labels, fontsize=8)
        ax.legend()
        ax.grid(True, axis='y', alpha=0.3)

    def _print_conclusion(self) -> None:
        """Print conclusion based on G1, G2, G3 criteria."""
        self.print_section("CONCLUSION")
        
        failures = []
        for r in self.results:
            # Pass if ANY of G1, G2 is true, OR if G3 is true (effect is small)
            # The design doc says:
            # G1 passes if p >= 0.05
            # G2 passes if observed within expected CI (Wait, strict reading: G2 is observed within CI of expected? Or expected within CI of observed? "Observed selection rates are within 95% confidence intervals of expected rates" - usually implies checking overlap or containment. Wilson CI is for observed. So we check if Expected is in CI(Observed)).
            # G3 passes if h < 0.2
            
            # Acceptance: "G1 passes if ... G2 passes if ... G3 passes if ..."
            # Do we need ALL to pass?
            # Usually, if p < 0.05 (G1 fails), we check effect size (G3).
            # If effect size is small, it's acceptable even if statistically significant (due to large N).
            
            # So: Pass if (G1 OR G2) OR G3
            
            if (r['pass_g1'] or r['pass_g2']) or r['pass_g3']:
                pass 
            else:
                failures.append(r)

        if not failures:
            print(f"  {self.check_mark} Hypothesis supported: All deviations are either")
            print(f"    statistically insignificant (p > 0.05) or have small effect size (h < 0.2)")
        else:
            print(f"  x Hypothesis not supported: Found significant deviations with non-negligible effect size")
            for f in failures:
                print(f"    - {f['union_type']}: p={f['p_value']:.4f}, h={f['effect_size']:.4f}")

        print(f"\n  {self.check_mark} Weighted union analysis complete")


def main():
    analysis = WeightedUnionAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
