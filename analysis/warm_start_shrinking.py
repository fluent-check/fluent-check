#!/usr/bin/env python3
"""
Warm Start Shrinking Analysis: Does transferring posterior help?

Investigates whether transferring knowledge from parent to child (Warm Start)
improves CI precision and maintains calibration compared to Cold Start (scale=0).

Metrics:
- Coverage (Target: >= 90%)
- CI Width (Lower is better)
- Relative Error (Lower is better)

Comparisons:
- Cold Start (Scale 0) vs Warm Start (Scale 0.5, 1.0)
- Scenarios: Subset (Pass rate increases) vs Scaled (Pass rate constant)
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

from base import AnalysisBase
from stats import wilson_score_interval
from viz import save_figure


class WarmStartAnalysis(AnalysisBase):
    """Analysis of warm start shrinking impact."""

    @property
    def name(self) -> str:
        return "Warm Start Shrinking Analysis"

    @property
    def csv_filename(self) -> str:
        return "warm-start-shrinking.csv"

    def analyze(self) -> None:
        """Perform the analysis."""
        self._analyze_coverage()
        self._analyze_efficiency()
        self._create_visualization()

    def _analyze_coverage(self) -> None:
        """Analyze coverage consistency across scales."""
        self.print_section("COVERAGE ANALYSIS")

        summary = self.df.groupby(['scenario', 'warm_start_scale']).apply(
            lambda x: pd.Series({
                'coverage': x['true_in_ci'].mean(),
                'count': len(x)
            })
        ).reset_index()

        for _, row in summary.iterrows():
            cov = row['coverage']
            n = int(row['count'])
            ci_lo, ci_hi = wilson_score_interval(int(cov * n), n)
            
            print(f"Scenario: {row['scenario']}, Scale: {row['warm_start_scale']}")
            print(f"  Coverage: {cov:.1%} [{ci_lo:.1%}, {ci_hi:.1%}]")
            if ci_lo < 0.90:
                print("  ⚠️  Coverage potentially below 90% target")
            else:
                print("  ✓ Calibrated")
            print()

    def _analyze_efficiency(self) -> None:
        """Analyze precision and error."""
        self.print_section("EFFICIENCY ANALYSIS")

        summary = self.df.groupby(['scenario', 'warm_start_scale']).agg({
            'ci_width': 'median',
            'relative_error': 'mean'
        }).reset_index()

        for scenario in summary['scenario'].unique():
            print(f"Scenario: {scenario}")
            subset = summary[summary['scenario'] == scenario]
            base_width = subset[subset['warm_start_scale'] == 0]['ci_width'].values[0]
            
            for _, row in subset.iterrows():
                scale = row['warm_start_scale']
                width = row['ci_width']
                err = row['relative_error']
                improvement = (base_width - width) / base_width
                
                print(f"  Scale {scale}:")
                print(f"    Median Width: {width:.2f} ({improvement:+.1%} improvement)")
                print(f"    Mean Rel Error: {err:.1%}")
            print()

    def _create_visualization(self) -> None:
        """Create comparison charts."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        self._plot_metric(axes[0], 'true_in_ci', 'Coverage', True)
        self._plot_metric(axes[1], 'ci_width', 'Median CI Width', False)

        save_figure(fig, self.get_output_path("warm-start-shrinking.png"))

    def _plot_metric(self, ax, col, title, is_coverage):
        """Helper to plot metrics by scale and scenario."""
        scenarios = self.df['scenario'].unique()
        scales = sorted(self.df['warm_start_scale'].unique())
        x = np.arange(len(scales))
        width = 0.35

        for i, scenario in enumerate(scenarios):
            subset = self.df[self.df['scenario'] == scenario]
            means = []
            errs = []

            for scale in scales:
                s_data = subset[subset['warm_start_scale'] == scale]
                if is_coverage:
                    mean = s_data[col].mean()
                    lo, hi = wilson_score_interval(s_data[col].sum(), len(s_data))
                    means.append(mean)
                    errs.append([mean - lo, hi - mean])
                else:
                    means.append(s_data[col].median())
                    errs.append(0) # No error bars for median width for simplicity

            offset = width/2 if i == 1 else -width/2
            
            if is_coverage:
                yerr = np.array(errs).T
                # Ensure no negative error bars (floating point noise)
                yerr = np.maximum(yerr, 0)
                ax.bar(x + offset, means, width, label=scenario, yerr=yerr, capsize=5, alpha=0.8)
            else:
                ax.bar(x + offset, means, width, label=scenario, alpha=0.8)

        ax.set_xlabel('Warm Start Scale')
        ax.set_ylabel(title)
        ax.set_title(title + ' by Scale')
        ax.set_xticks(x)
        ax.set_xticklabels(scales)
        ax.legend()
        ax.grid(True, axis='y', alpha=0.3)
        
        if is_coverage:
            ax.axhline(0.90, color='red', linestyle='--', label='Target')
            ax.set_ylim(0.8, 1.05)


def main():
    analysis = WarmStartAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
