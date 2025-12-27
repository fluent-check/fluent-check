#!/usr/bin/env python3
"""
Chained Distribution Analysis: Predictability of flatMap distributions

This analysis verifies that chained arbitraries produce the expected
theoretical distribution.

Metrics:
- Empirical Frequency: Observed count for each result value (1-10)
- Theoretical Frequency: Expected count based on P(k) = (11-k)/55
- Chi-squared: Goodness-of-fit test

Generates:
- chained-distribution.png: Histogram with theoretical overlay and pair heatmap
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from scipy.stats import chisquare

from base import AnalysisBase
from viz import save_figure


class ChainedDistributionAnalysis(AnalysisBase):
    """Analysis of chained distribution predictability."""

    @property
    def name(self) -> str:
        return "Chained Distribution Analysis"

    @property
    def csv_filename(self) -> str:
        return "chained-distribution.csv"

    def analyze(self) -> None:
        """Perform the chained distribution analysis."""
        self._compute_statistics()
        self._run_hypothesis_test()
        self._create_visualization()
        self._print_conclusion()

    def _compute_statistics(self) -> None:
        """Compute distribution statistics."""
        self.observed_counts = self.df['result_value'].value_counts().sort_index()
        self.total_samples = len(self.df)

        # Theoretical P(k) = (1/10) * sum_{n=k}^{10} (1/n)
        self.k_values = np.arange(1, 11)
        self.theoretical_probs = np.array([
            np.sum(1.0 / np.arange(k, 11)) / 10.0 for k in self.k_values
        ])
        self.expected_counts = self.theoretical_probs * self.total_samples

        self.print_section("SUMMARY STATISTICS")
        print(f"{'Value':>6} | {'Observed %':>12} | {'Expected %':>12} | {'Residual %':>12}")
        self.print_divider(width=60)

        for i, k in enumerate(self.k_values):
            obs_p = (self.observed_counts.get(k, 0) / self.total_samples) * 100
            exp_p = self.theoretical_probs[i] * 100
            res_p = obs_p - exp_p
            print(f"{k:>6} | {obs_p:>11.2f}% | {exp_p:>11.2f}% | {res_p:>11.2f}%")

    def _run_hypothesis_test(self) -> None:
        """Run chi-squared goodness-of-fit test."""
        self.print_section("GOODNESS-OF-FIT TEST")

        self.chi2, self.p_val = chisquare(self.observed_counts.values, f_exp=self.expected_counts)

        print(f"  χ² = {self.chi2:.4f}")
        print(f"  p-value = {self.p_val:.4f}")
        print(f"  Interpretation: {'Matches theory' if self.p_val > 0.05 else 'Significant deviation'}")

    def _create_visualization(self) -> None:
        """Create chained distribution visualization."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        self._create_distribution_chart(axes[0])
        self._create_heatmap(axes[1])

        save_figure(fig, self.get_output_path("chained-distribution.png"))

    def _create_distribution_chart(self, ax) -> None:
        """Create empirical vs theoretical distribution chart."""
        sns.barplot(x=self.observed_counts.index, y=self.observed_counts.values / self.total_samples,
                    ax=ax, alpha=0.7, color='skyblue', label='Observed')
        ax.plot(np.arange(0, 10), self.theoretical_probs, 'r--', marker='o', label='Theoretical')
        ax.set_xlabel('Result Value (k)')
        ax.set_ylabel('Probability')
        ax.set_title('Empirical vs Theoretical Distribution')
        ax.legend()
        ax.grid(True, axis='y', alpha=0.3)

    def _create_heatmap(self, ax) -> None:
        """Create heatmap of (base, result) pairs."""
        heatmap_data = pd.crosstab(self.df['result_value'], self.df['base_value'])
        # Ensure all 1-10 are present
        for i in range(1, 11):
            if i not in heatmap_data.index:
                heatmap_data.loc[i] = 0
            if i not in heatmap_data.columns:
                heatmap_data[i] = 0
        heatmap_data = heatmap_data.sort_index(axis=0).sort_index(axis=1)

        sns.heatmap(heatmap_data, ax=ax, annot=False, cmap='YlGnBu')
        ax.set_xlabel('Base Value (n)')
        ax.set_ylabel('Result Value (k)')
        ax.set_title('Frequency Heatmap of (base, result) Pairs')

    def _print_conclusion(self) -> None:
        """Print conclusion."""
        self.print_section("CONCLUSION")

        if self.p_val > 0.05:
            print(f"  {self.check_mark} Hypothesis supported: flatMap produces the expected distribution.")
        else:
            print(f"  x Hypothesis rejected: Significant deviation from theoretical distribution.")

        print(f"\n  {self.check_mark} Chained Distribution analysis complete")


def main():
    analysis = ChainedDistributionAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
