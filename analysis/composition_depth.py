#!/usr/bin/env python3
"""
Composition Depth Analysis

Tests whether coverage degrades with nesting depth.

Hypotheses:
- D1: Coverage remains ≥90% for depth <= 3
- D2: Coverage remains ≥85% for depth <= 5
"""

import matplotlib.pyplot as plt
import numpy as np
from base import AnalysisBase
from viz import save_figure

class CompositionDepthAnalysis(AnalysisBase):
    def __init__(self):
        super().__init__()
        self.d1_pass = None
        self.d2_pass = None

    @property
    def name(self) -> str:
        return "Composition Depth Analysis"

    @property
    def csv_filename(self) -> str:
        return "composition-depth.csv"

    @property
    def required_columns(self) -> list:
        return ['depth', 'structure', 'true_in_ci', 'ci_lower', 'ci_upper', 'true_size']

    def analyze(self) -> None:
        self._check_depth_impact()
        self._create_visualization()
        self._print_conclusion()

    def _check_depth_impact(self) -> None:
        self.print_section("DEPTH IMPACT")
        
        depths = sorted(self.df['depth'].unique())
        print(f"{'Depth':<10} {'Coverage':<10}")
        self.print_divider()
        
        coverage_map = {}
        for d in depths:
            cov = self.df[self.df['depth'] == d]['true_in_ci'].mean()
            coverage_map[d] = cov
            print(f"{d:<10} {cov:.1%}")
            
        # D1: Depth <= 3 >= 90%
        d1_ok = all(coverage_map[d] >= 0.90 for d in depths if d <= 3)
        self.d1_pass = d1_ok
        
        # D2: Depth <= 5 >= 85%
        d2_ok = all(coverage_map[d] >= 0.85 for d in depths if d <= 5)
        self.d2_pass = d2_ok

    def _create_visualization(self) -> None:
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))
        
        depths = sorted(self.df['depth'].unique())
        
        # Calculate Relative Width: (Upper - Lower) / TrueSize (handle 0 size)
        self.df['ci_width'] = self.df['ci_upper'] - self.df['ci_lower']
        # Avoid division by zero by using 1 for denominator if true_size is 0 (width is absolute then)
        # But relative width is more meaningful. Let's use Normalized Width = Width / max(1, TrueSize)
        self.df['rel_width'] = self.df['ci_width'] / self.df['true_size'].replace(0, 1)

        # 1. Coverage Chart
        ax1 = axes[0]
        for struct in self.df['structure'].unique():
            data = self.df[self.df['structure'] == struct]
            covs = [data[data['depth'] == d]['true_in_ci'].mean() for d in depths]
            # Add small jitter to x to avoid perfect overlap
            jitter = np.random.uniform(-0.1, 0.1, len(depths)) if len(self.df['structure'].unique()) > 1 else 0
            ax1.plot(np.array(depths) + jitter, covs, marker='o', label=struct, linewidth=2)
            
        ax1.axhline(0.90, color='g', linestyle='--', label='Target 90%')
        ax1.set_xlabel('Nesting Depth (Integer)')
        ax1.set_ylabel('Coverage Proportion')
        ax1.set_title('Coverage vs Nesting Depth')
        ax1.set_xticks(depths) # Force integer ticks
        ax1.set_ylim(0.8, 1.05)
        ax1.legend()
        ax1.grid(True)

        # 2. Interval Width Chart (Conservativeness)
        ax2 = axes[1]
        for struct in self.df['structure'].unique():
            data = self.df[self.df['structure'] == struct]
            # Calculate mean relative width per depth
            widths = [data[data['depth'] == d]['rel_width'].mean() for d in depths]
            ax2.plot(depths, widths, marker='s', label=f"{struct} Width", linestyle='-')

        ax2.set_xlabel('Nesting Depth')
        ax2.set_ylabel('Mean Relative CI Width (Width / TrueSize)')
        ax2.set_title('Interval Conservativeness vs Depth')
        ax2.set_xticks(depths)
        ax2.grid(True)
        ax2.legend()
        
        # Add annotation explaining "Precision Sacrifice"
        ax2.text(0.5, 0.9, 'Higher Depth -> Wider Intervals\n(Safe but imprecise)', 
                 transform=ax2.transAxes, ha='center', fontsize=10, 
                 bbox=dict(boxstyle="round", fc="w", alpha=0.9))
        
        save_figure(fig, self.get_output_path("composition-depth.png"))

    def _print_conclusion(self) -> None:
        self.print_section("CONCLUSION")
        print(f"D1 (Depth <= 3): {'PASS' if self.d1_pass else 'FAIL'}")
        print(f"D2 (Depth <= 5): {'PASS' if self.d2_pass else 'FAIL'}")

def main():
    analysis = CompositionDepthAnalysis()
    analysis.run()

if __name__ == "__main__":
    main()
