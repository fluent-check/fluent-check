#!/usr/bin/env python3
"""
Composition Depth Analysis

Tests whether coverage degrades with nesting depth.

Hypotheses:
- D1: Coverage remains ≥90% for depth <= 3
- D2: Coverage remains ≥85% for depth <= 5
"""

import matplotlib.pyplot as plt
import pandas as pd
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
        return ['depth', 'structure', 'true_in_ci']

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
        plt.figure(figsize=(10, 6))
        
        depths = sorted(self.df['depth'].unique())
        
        # Split by structure
        for struct in self.df['structure'].unique():
            data = self.df[self.df['structure'] == struct]
            covs = [data[data['depth'] == d]['true_in_ci'].mean() for d in depths]
            plt.plot(depths, covs, marker='o', label=struct)
            
        plt.axhline(0.90, color='g', linestyle='--', label='Target 90%')
        plt.axhline(0.85, color='orange', linestyle='--', label='Min 85%')
        
        plt.xlabel('Nesting Depth')
        plt.ylabel('Coverage')
        plt.title('Coverage vs Nesting Depth')
        plt.legend()
        plt.grid(True)
        plt.ylim(0.5, 1.05)
        
        save_figure(plt.gcf(), self.get_output_path("composition-depth.png"))

    def _print_conclusion(self) -> None:
        self.print_section("CONCLUSION")
        print(f"D1 (Depth <= 3): {'PASS' if self.d1_pass else 'FAIL'}")
        print(f"D2 (Depth <= 5): {'PASS' if self.d2_pass else 'FAIL'}")

def main():
    analysis = CompositionDepthAnalysis()
    analysis.run()

if __name__ == "__main__":
    main()
