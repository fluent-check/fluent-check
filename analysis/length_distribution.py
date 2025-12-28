#!/usr/bin/env python3
"""
Length Distribution Analysis: Finding boundary bugs faster with biased distributions

This analysis examines if different length distributions affect the detection rate
of length-related bugs.

Metrics:
- Detection Rate: Proportion of trials where the bug was detected
- Tests to Detection: Average number of tests run before finding the bug

Generates:
- length-distribution.png: Grouped bar chart of detection rates
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

from base import AnalysisBase
from stats import wilson_score_interval
from viz import save_figure


class LengthDistributionAnalysis(AnalysisBase):
    """Analysis of length distribution impact on bug detection."""

    @property
    def name(self) -> str:
        return "Length Distribution Analysis"

    @property
    def csv_filename(self) -> str:
        return "length-distribution.csv"

    def analyze(self) -> None:
        """Perform the length distribution analysis."""
        print("H_0: Length distribution (uniform, geometric, edge-biased) has no effect on bug detection rates or efficiency.")
        print("H_1: Biased distributions significantly improve detection speed for specific length-related bugs.\n")

        self._compute_summary()
        self._create_visualization()
        self._print_conclusion()

    def _compute_summary(self) -> None:
        """Compute aggregate statistics."""
        self.summary = self.df.groupby(['bug_type', 'length_distribution']).agg({
            'bug_detected': ['sum', 'count', 'mean'],
            'tests_to_detection': 'median'
        }).reset_index()
        self.summary.columns = ['bug_type', 'length_distribution', 'detected_sum', 'total_count', 'detection_rate', 'median_tests']

        # Add Wilson CIs
        cis = [wilson_score_interval(s, n) for s, n in zip(self.summary['detected_sum'], self.summary['total_count'])]
        self.summary['ci_lower'] = [ci[0] for ci in cis]
        self.summary['ci_upper'] = [ci[1] for ci in cis]
        self.summary['ci_err_lower'] = self.summary['detection_rate'] - self.summary['ci_lower']
        self.summary['ci_err_upper'] = self.summary['ci_upper'] - self.summary['detection_rate']

        self.print_section("SUMMARY STATISTICS")
        print(self.summary[['bug_type', 'length_distribution', 'detection_rate', 'median_tests']].to_string(index=False))

    def _create_visualization(self) -> None:
        """Create length distribution visualization."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        # Consistent palette mapping for distributions
        dists = sorted(self.df['length_distribution'].unique())
        palette = dict(zip(dists, sns.color_palette("muted", len(dists))))

        self._create_detection_chart(axes[0], palette)
        self._create_tests_chart(axes[1], palette)

        save_figure(fig, self.get_output_path("length-distribution.png"))

    def _create_detection_chart(self, ax, palette) -> None:
        """Create detection rate chart."""
        sns.barplot(x='bug_type', y='detection_rate', hue='length_distribution',
                    data=self.summary, ax=ax, palette=palette)
        ax.set_xlabel('Bug Type')
        ax.set_ylabel('Detection Rate')
        ax.set_title('Detection Rate by Bug Type and Distribution')
        ax.set_ylim(0, 1.1)
        ax.grid(True, axis='y', alpha=0.3)

    def _create_tests_chart(self, ax, palette) -> None:
        """Create tests to detection chart."""
        detected_df = self.df[self.df['bug_detected'] == True]
        sns.boxplot(x='bug_type', y='tests_to_detection', hue='length_distribution',
                    data=detected_df, ax=ax, palette=palette)
        ax.set_xlabel('Bug Type')
        ax.set_ylabel('Tests to Detection')
        ax.set_title('Tests to Detection (Detected Trials Only)')
        ax.grid(True, axis='y', alpha=0.3)

    def _print_conclusion(self) -> None:
        """Print conclusion with scientific rigor."""
        self.print_section("SCIENTIFIC CONCLUSION")

        from scipy.stats import kruskal
        
        # Test if tests_to_detection differs across distributions for 'empty' bug
        groups = []
        for dist in self.df['length_distribution'].unique():
            groups.append(self.df[(self.df['bug_type'] == 'empty') & 
                                  (self.df['length_distribution'] == dist) & 
                                  (self.df['bug_detected'])]['tests_to_detection'])
        
        stat, p_val = kruskal(*groups)
        
        if p_val < 0.05:
            print(f"  {self.check_mark} We reject the null hypothesis H_0 (p={p_val:.4e}).")
            print("    Statistically significant evidence that length distribution affects bug detection efficiency.")
        else:
            print(f"  ✗ We fail to reject the null hypothesis H_0 (p={p_val:.4f}).")
            print("    No significant difference in detection efficiency was observed across the tested distributions.")

        print(f"\n  {self.check_mark} Length Distribution analysis complete")


def main():
    analysis = LengthDistributionAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()