#!/usr/bin/env python3
"""
Caching Trade-off Analysis: Detection diversity vs time savings

This analysis examines the impact of CachedSampler on bug detection and diversity.

Metrics:
- Detection Rate: Proportion of trials where the bug was found
- Time Savings: Relative execution time (cache enabled vs disabled)

Generates:
- caching-tradeoff.png: Detection rates comparison
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

from base import AnalysisBase
from viz import save_figure


class CachingTradeoffAnalysis(AnalysisBase):
    """Analysis of caching trade-offs on bug detection."""

    @property
    def name(self) -> str:
        return "Caching Trade-off Analysis"

    @property
    def csv_filename(self) -> str:
        return "caching-tradeoff.csv"

    def analyze(self) -> None:
        """Perform the caching trade-off analysis."""
        print("H_0: Caching samples from reused arbitraries does not significantly affect bug detection rates.")
        print("H_1: Caching significantly reduces detection diversity and finding specific 'any-value' bugs.\n")

        self._compute_summary()
        self._create_visualization()
        self._print_conclusion()

    def _compute_summary(self) -> None:
        """Compute aggregate statistics."""
        self.summary = self.df.groupby(['bug_type', 'cache_enabled']).agg({
            'bug_detected': ['sum', 'count', 'mean'],
            'elapsed_micros': 'mean'
        }).reset_index()
        self.summary.columns = ['bug_type', 'cache_enabled', 'detected_sum', 'total_count', 'detection_rate', 'mean_time']

        self.print_section("SUMMARY STATISTICS")
        print(self.summary[['bug_type', 'cache_enabled', 'detection_rate', 'mean_time']].to_string(index=False))

    def _create_visualization(self) -> None:
        """Create caching trade-off visualization."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        # Consistent color mapping
        palette = {True: '#2ca02c', False: '#ff7f0e'} # True=Cached (Green), False=Fresh (Orange)

        self._create_detection_chart(axes[0], palette)
        self._create_time_chart(axes[1], palette)

        save_figure(fig, self.get_output_path("caching-tradeoff.png"))

    def _create_detection_chart(self, ax, palette) -> None:
        """Create detection rate chart."""
        sns.barplot(x='bug_type', y='detection_rate', hue='cache_enabled',
                    data=self.summary, ax=ax, palette=palette)
        ax.set_xlabel('Bug Type')
        ax.set_ylabel('Detection Rate')
        ax.set_title('Bug Detection Rate (Cache Enabled vs Disabled)')
        ax.set_ylim(0, 1.1)
        ax.grid(True, axis='y', alpha=0.3)

    def _create_time_chart(self, ax, palette) -> None:
        """Create execution time chart."""
        sns.barplot(x='bug_type', y='mean_time', hue='cache_enabled',
                    data=self.summary, ax=ax, palette=palette)
        ax.set_xlabel('Bug Type')
        ax.set_ylabel('Mean Execution Time (µs)')
        ax.set_title('Execution Time')
        ax.grid(True, axis='y', alpha=0.3)

    def _print_conclusion(self) -> None:
        """Print conclusion with scientific rigor."""
        self.print_section("SCIENTIFIC CONCLUSION")

        from scipy.stats import chi2_contingency
        
        # Test for any_value bug type
        group_any = self.df[self.df['bug_type'] == 'any_value']
        contingency = pd.crosstab(group_any['cache_enabled'], group_any['bug_detected'])
        
        if contingency.size == 4:
            chi2, p_val, dof, ex = chi2_contingency(contingency)
            
            if p_val < 0.05:
                print(f"  {self.check_mark} We reject the null hypothesis H_0 (p={p_val:.4e}) for 'any-value' bugs.")
                print("    Statistically significant evidence that caching reduces detection rates for non-combinatorial bugs.")
            else:
                print(f"  ✗ We fail to reject the null hypothesis H_0 (p={p_val:.4f}).")
                print("    No significant difference in detection was found between cached and fresh sampling for this bug type.")
        else:
            print("  Note: Insufficient variance in outcomes to perform chi-squared test.")

        print(f"\n  {self.check_mark} Caching Trade-off analysis complete")


def main():
    analysis = CachingTradeoffAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()