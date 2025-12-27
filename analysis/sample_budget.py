#!/usr/bin/env python3
"""
Sample Budget Distribution Analysis

Metrics:
- Effective Sample Size: Unique values tested per quantifier
- Detection Efficiency: Effective / Total Budget

Generates:
- sample-budget.png: Effective sample size vs Depth
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns

from base import AnalysisBase
from viz import save_figure


class SampleBudgetAnalysis(AnalysisBase):
    """Analysis of sample budget distribution."""

    @property
    def name(self) -> str:
        return "Sample Budget Distribution Analysis"

    @property
    def csv_filename(self) -> str:
        return "sample-budget.csv"

    def analyze(self) -> None:
        """Perform the sample budget analysis."""
        self._compute_summary()
        self._create_visualization()
        self._print_conclusion()

    def _compute_summary(self) -> None:
        """Compute aggregate statistics."""
        self.summary = self.df.groupby(['depth', 'quantifier_index', 'explorer']).agg({
            'unique_values': 'mean',
            'expected_unique': 'mean'
        }).reset_index()

        self.print_section("SUMMARY STATISTICS")
        print(f"{'Explorer':<10} {'Depth':<10} {'Quantifier':<10} {'Observed':<10} {'Expected':<10} {'Efficiency':<10}")
        self.print_divider(width=70)

        for explorer in ['nested', 'flat']:
            explorer_data = self.summary[self.summary['explorer'] == explorer]
            unique_depths = sorted(explorer_data['depth'].unique())
            for d in unique_depths:
                d_data = explorer_data[explorer_data['depth'] == d]
                observed = d_data['unique_values'].mean()
                expected = d_data['expected_unique'].mean()
                efficiency = observed / 1000 * 100  # Assuming N=1000
                print(f"{explorer:<10} {d:<10} {'Avg':<10} {observed:<10.1f} {expected:<10.1f} {efficiency:<9.1f}%")

    def _create_visualization(self) -> None:
        """Create sample budget visualization."""
        fig, ax = plt.subplots(figsize=(10, 6))

        # Plot observed vs expected with hue for explorer
        sns.lineplot(x='depth', y='unique_values', hue='explorer', data=self.df, marker='o', ax=ax, linewidth=2)

        # Plot theoretical N^(1/d)
        x = np.linspace(1, 5, 50)
        y = 1000 ** (1/x)
        ax.plot(x, y, 'r--', label='Theoretical Nested $N^{1/d}$', linewidth=2, alpha=0.5)

        # Plot ideal (N)
        ax.axhline(1000, color='green', linestyle=':', label='Ideal (Flat Target)', alpha=0.5)

        ax.set_xlabel('Chain Depth (Number of Quantifiers)')
        ax.set_ylabel('Effective Sample Size (Unique Values)')
        ax.set_title('Effective Sample Size: Flat vs Nested (N=1000)')
        ax.grid(True, alpha=0.3)
        ax.legend()
        ax.set_yscale('log')

        save_figure(fig, self.get_output_path("sample-budget.png"))

    def _print_conclusion(self) -> None:
        """Print conclusion."""
        self.print_section("CONCLUSION")

        nested_d3 = self.summary[(self.summary['depth'] == 3) & (self.summary['explorer'] == 'nested')]['unique_values'].mean()
        flat_d3 = self.summary[(self.summary['depth'] == 3) & (self.summary['explorer'] == 'flat')]['unique_values'].mean()

        print(f"  Nested Depth 3 Mean: {nested_d3:.1f}")
        print(f"  Flat Depth 3 Mean:   {flat_d3:.1f}")

        if flat_d3 > nested_d3 * 5:
            print(f"  {self.check_mark} Hypothesis supported: FlatExplorer significantly outperforms Nested at depth.")
            print(f"    Improvement factor: {flat_d3/nested_d3:.1f}x")
        else:
            print(f"  x Hypothesis not supported or improvement marginal.")

        print(f"\n  {self.check_mark} Sample Budget analysis complete")


def main():
    analysis = SampleBudgetAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
