#!/usr/bin/env python3
"""
Advanced Credible Interval Calibration Analysis

Deep dive into filter chain calibration degradation.
Investigates impact of depth, warmup, and pass rate on coverage.
"""

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy import stats

from base import AnalysisBase
from viz import save_figure


class AdvancedCICalibrationAnalysis(AnalysisBase):
    """Deep dive into filter chain calibration."""

    TARGET_COVERAGE = 0.90

    @property
    def name(self) -> str:
        return "Advanced Credible Interval Calibration Analysis"

    @property
    def csv_filename(self) -> str:
        return "ci-calibration-advanced.csv"

    @property
    def required_columns(self) -> list:
        return ['depth', 'warmup', 'pass_rate', 'true_in_ci']

    def analyze(self) -> None:
        """Perform the analysis."""
        self._analyze_by_depth()
        self._analyze_by_warmup()
        self._analyze_by_pass_rate()
        self._create_visualization()

    def _wilson_ci(self, p: float, n: int, confidence: float = 0.95) -> tuple:
        if n == 0: return (0, 1)
        z = stats.norm.ppf(1 - (1 - confidence) / 2)
        denominator = 1 + z**2 / n
        center = (p + z**2 / (2*n)) / denominator
        margin = z * np.sqrt((p * (1 - p) + z**2 / (4*n)) / n) / denominator
        return (max(0, center - margin), min(1, center + margin))

    def _analyze_by_depth(self) -> None:
        self.print_section("COVERAGE BY DEPTH")
        depth_stats = self.df.groupby('depth')['true_in_ci'].agg(['mean', 'count']).reset_index()
        print(f"{'Depth':<10} {'Coverage':<10} {'N':<8} {'95% CI':<20}")
        self.print_divider()
        for _, row in depth_stats.iterrows():
            ci = self._wilson_ci(row['mean'], int(row['count']))
            print(f"{int(row['depth']):<10} {row['mean']:>7.1%}   {int(row['count']):<8} [{ci[0]:.1%}, {ci[1]:.1%}]")

    def _analyze_by_warmup(self) -> None:
        self.print_section("COVERAGE BY WARMUP SAMPLES")
        warmup_stats = self.df.groupby('warmup')['true_in_ci'].agg(['mean', 'count']).reset_index()
        print(f"{'Warmup':<10} {'Coverage':<10} {'N':<8} {'95% CI':<20}")
        self.print_divider()
        for _, row in warmup_stats.iterrows():
            ci = self._wilson_ci(row['mean'], int(row['count']))
            print(f"{int(row['warmup']):<10} {row['mean']:>7.1%}   {int(row['count']):<8} [{ci[0]:.1%}, {ci[1]:.1%}]")

    def _analyze_by_pass_rate(self) -> None:
        self.print_section("COVERAGE BY PASS RATE")
        rate_stats = self.df.groupby('pass_rate')['true_in_ci'].agg(['mean', 'count']).reset_index()
        print(f"{'Pass Rate':<10} {'Coverage':<10} {'N':<8} {'95% CI':<20}")
        self.print_divider()
        for _, row in rate_stats.iterrows():
            ci = self._wilson_ci(row['mean'], int(row['count']))
            print(f"{row['pass_rate']:<10.2f} {row['mean']:>7.1%}   {int(row['count']):<8} [{ci[0]:.1%}, {ci[1]:.1%}]")

    def _create_visualization(self) -> None:
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

        # 1. Depth vs Coverage (colored by warmup)
        for warmup in sorted(self.df['warmup'].unique()):
            data = self.df[self.df['warmup'] == warmup]
            stats = data.groupby('depth')['true_in_ci'].agg(['mean', 'count']).reset_index()
            depths = stats['depth']
            means = stats['mean']
            err = [self._wilson_ci(m, int(c)) for m, c in zip(means, stats['count'])]
            
            yerr_lower = [max(0, m - e[0]) for m, e in zip(means, err)]
            yerr_upper = [max(0, e[1] - m) for m, e in zip(means, err)]
            yerr = [yerr_lower, yerr_upper]
            
            ax1.errorbar(depths, means, yerr=yerr, label=f'Warmup={warmup}', fmt='o-', capsize=4)

        ax1.axhline(y=0.90, color='r', linestyle='--', label='Target 90%')
        ax1.set_xlabel('Filter Chain Depth')
        ax1.set_ylabel('Coverage Rate')
        ax1.set_title('Coverage vs Depth and Warmup')
        ax1.set_ylim(0.75, 1.05)
        ax1.legend()
        ax1.grid(True, alpha=0.3)

        # 2. Warmup vs Coverage (colored by depth)
        for depth in sorted(self.df['depth'].unique()):
            if depth not in [1, 2, 5, 10]: continue
            data = self.df[self.df['depth'] == depth]
            stats = data.groupby('warmup')['true_in_ci'].agg(['mean', 'count']).reset_index()
            warmups = stats['warmup']
            means = stats['mean']
            ax2.plot(warmups, means, 'o-', label=f'Depth={depth}')

        ax2.axhline(y=0.90, color='r', linestyle='--')
        ax2.set_xlabel('Warmup Samples')
        ax2.set_ylabel('Coverage Rate')
        ax2.set_title('Impact of Warmup on Convergence')
        ax2.set_ylim(0.75, 1.05)
        ax2.legend()
        ax2.grid(True, alpha=0.3)

        plt.tight_layout()
        save_figure(fig, self.get_output_path("ci-calibration-advanced.png"))


def main():
    analysis = AdvancedCICalibrationAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()