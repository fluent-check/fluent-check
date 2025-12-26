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

        self._create_detection_chart(axes[0])
        self._create_time_chart(axes[1])

        save_figure(fig, self.get_output_path("caching-tradeoff.png"))

    def _create_detection_chart(self, ax) -> None:
        """Create detection rate chart."""
        sns.barplot(x='bug_type', y='detection_rate', hue='cache_enabled',
                    data=self.summary, ax=ax, palette='muted')
        ax.set_xlabel('Bug Type')
        ax.set_ylabel('Detection Rate')
        ax.set_title('Bug Detection Rate (Cache Enabled vs Disabled)')
        ax.set_ylim(0, 1.1)
        ax.grid(True, axis='y', alpha=0.3)

    def _create_time_chart(self, ax) -> None:
        """Create execution time chart."""
        sns.barplot(x='bug_type', y='mean_time', hue='cache_enabled',
                    data=self.summary, ax=ax, palette='muted')
        ax.set_xlabel('Bug Type')
        ax.set_ylabel('Mean Execution Time (µs)')
        ax.set_title('Execution Time')
        ax.grid(True, axis='y', alpha=0.3)

    def _print_conclusion(self) -> None:
        """Print conclusion."""
        self.print_section("CONCLUSION")

        any_val_cache = self.summary[
            (self.summary['bug_type'] == 'any_value') & (self.summary['cache_enabled'] == True)
        ]['detection_rate'].values[0]
        any_val_fresh = self.summary[
            (self.summary['bug_type'] == 'any_value') & (self.summary['cache_enabled'] == False)
        ]['detection_rate'].values[0]

        print(f"  Any-Value Bug Detection:")
        print(f"    Cached: {any_val_cache*100:.1f}%")
        print(f"    Fresh : {any_val_fresh*100:.1f}%")

        if any_val_fresh > any_val_cache * 1.5:
            print(f"  {self.check_mark} Hypothesis supported: Caching significantly reduces detection for 'any-value' bugs.")
        else:
            print(f"  x Hypothesis not supported: Detection rates similar.")

        print(f"\n  {self.check_mark} Caching Trade-off analysis complete")


def main():
    analysis = CachingTradeoffAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
