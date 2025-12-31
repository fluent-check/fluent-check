#!/usr/bin/env python3
"""
Study D: Composition Depth Impact Analysis

Tests whether coverage degrades with nesting depth and how precision changes.

SEPARATED HYPOTHESES (Calibration vs Precision):

Calibration:
- D1: Coverage ≥ 90% for depth ≤ 3
- D2: Coverage ≥ 85% for depth ≤ 5
- D3: Coverage ≤ 99% for all depths (not excessively conservative)

Precision:
- D4: Width growth ≤ 2× per composition level
- D5: Median relative width ≤ 2× oracle width

Oracle Baseline: True Bayesian propagation via Monte Carlo
"""

import matplotlib.pyplot as plt
import numpy as np
from base import AnalysisBase
from viz import save_figure
from stats import wilson_score_interval

class CompositionDepthAnalysis(AnalysisBase):
    def __init__(self):
        super().__init__()
        self.d1_pass = None
        self.d2_pass = None
        self.d3_pass = None
        self.d4_pass = None
        self.d5_pass = None
        self.depth_stats = {}

    @property
    def name(self) -> str:
        return "Composition Depth Analysis (Calibration vs Precision)"

    @property
    def csv_filename(self) -> str:
        return "composition-depth.csv"

    @property
    def required_columns(self) -> list:
        return ['depth', 'true_size', 'ci_lower', 'ci_upper', 'ci_width',
                'relative_width', 'true_in_ci', 'oracle_width', 'true_in_oracle',
                'width_ratio_vs_oracle']

    def analyze(self) -> None:
        self._compute_depth_statistics()
        self._check_calibration_hypotheses()
        self._check_precision_hypotheses()
        self._create_visualization()
        self._print_conclusion()

    def _compute_depth_statistics(self) -> None:
        self.print_section("DEPTH STATISTICS")

        print(f"{'Depth':<8} {'n':<8} {'Coverage':<12} {'95% CI':<18} {'Oracle Cov':<12} {'Width Ratio':<12}")
        self.print_divider()

        depths = sorted(self.df['depth'].unique())

        for d in depths:
            data = self.df[self.df['depth'] == d]
            n = len(data)

            # Interval arithmetic coverage
            coverage = data['true_in_ci'].mean()
            lower, upper = wilson_score_interval(coverage * n, n, confidence=0.95)

            # Oracle coverage
            oracle_coverage = data['true_in_oracle'].mean()

            # Width ratio vs oracle
            median_width_ratio = data['width_ratio_vs_oracle'].median()
            mean_width_ratio = data['width_ratio_vs_oracle'].mean()

            self.depth_stats[d] = {
                'n': n,
                'coverage': coverage,
                'coverage_ci': (lower, upper),
                'oracle_coverage': oracle_coverage,
                'median_width_ratio': median_width_ratio,
                'mean_width_ratio': mean_width_ratio,
                'mean_ci_width': data['ci_width'].mean(),
                'mean_oracle_width': data['oracle_width'].mean(),
                'mean_relative_width': data['relative_width'].mean()
            }

            print(f"{d:<8} {n:<8} {coverage:>7.1%}      [{lower:.1%}, {upper:.1%}]   "
                  f"{oracle_coverage:>7.1%}      {median_width_ratio:>7.2f}×")

    def _check_calibration_hypotheses(self) -> None:
        self.print_section("CALIBRATION HYPOTHESES")

        depths = sorted(self.depth_stats.keys())

        # D1: Coverage ≥ 90% for depth ≤ 3
        d1_depths = [d for d in depths if d <= 3]
        d1_coverages = [self.depth_stats[d]['coverage'] for d in d1_depths]
        self.d1_pass = all(c >= 0.90 for c in d1_coverages)
        print(f"D1 (Coverage ≥90% for depth ≤ 3): {'PASS' if self.d1_pass else 'FAIL'}")
        for d in d1_depths:
            cov = self.depth_stats[d]['coverage']
            print(f"   Depth {d}: {cov:.1%} {'✓' if cov >= 0.90 else '✗'}")

        # D2: Coverage ≥ 85% for depth ≤ 5
        d2_depths = [d for d in depths if d <= 5]
        d2_coverages = [self.depth_stats[d]['coverage'] for d in d2_depths]
        self.d2_pass = all(c >= 0.85 for c in d2_coverages)
        print(f"\nD2 (Coverage ≥85% for depth ≤ 5): {'PASS' if self.d2_pass else 'FAIL'}")
        for d in d2_depths:
            cov = self.depth_stats[d]['coverage']
            print(f"   Depth {d}: {cov:.1%} {'✓' if cov >= 0.85 else '✗'}")

        # D3: Coverage ≤ 99% for all depths (not excessively conservative)
        all_coverages = [self.depth_stats[d]['coverage'] for d in depths]
        self.d3_pass = all(c <= 0.99 for c in all_coverages)
        print(f"\nD3 (Coverage ≤99% for all depths): {'PASS' if self.d3_pass else 'FAIL'}")
        for d in depths:
            cov = self.depth_stats[d]['coverage']
            print(f"   Depth {d}: {cov:.1%} {'✓' if cov <= 0.99 else '✗ (too conservative)'}")

    def _check_precision_hypotheses(self) -> None:
        self.print_section("PRECISION HYPOTHESES")

        depths = sorted(self.depth_stats.keys())

        # D4: Width growth ≤ 2× per composition level
        # Compare relative width at depth d+1 vs depth d
        width_growth_ratios = []
        print("D4 (Width growth ≤ 2× per level):")
        for i in range(len(depths) - 1):
            d1, d2 = depths[i], depths[i + 1]
            w1 = self.depth_stats[d1]['mean_relative_width']
            w2 = self.depth_stats[d2]['mean_relative_width']
            ratio = w2 / w1 if w1 > 0 else float('inf')
            width_growth_ratios.append(ratio)
            print(f"   Depth {d1}→{d2}: {ratio:.2f}× {'✓' if ratio <= 2.0 else '✗'}")

        self.d4_pass = all(r <= 2.0 for r in width_growth_ratios) if width_growth_ratios else True
        print(f"   Result: {'PASS' if self.d4_pass else 'FAIL'}")

        # D5: Median width ratio vs oracle ≤ 2.0
        print("\nD5 (Width ≤ 2× oracle width):")
        width_ratios = [self.depth_stats[d]['median_width_ratio'] for d in depths]
        for d in depths:
            ratio = self.depth_stats[d]['median_width_ratio']
            print(f"   Depth {d}: {ratio:.2f}× oracle {'✓' if ratio <= 2.0 else '✗'}")

        self.d5_pass = all(r <= 2.0 for r in width_ratios)
        print(f"   Result: {'PASS' if self.d5_pass else 'FAIL'}")

    def _create_visualization(self) -> None:
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))

        depths = sorted(self.depth_stats.keys())
        coverages = [self.depth_stats[d]['coverage'] for d in depths]
        oracle_coverages = [self.depth_stats[d]['oracle_coverage'] for d in depths]
        ci_lowers = [self.depth_stats[d]['coverage_ci'][0] for d in depths]
        ci_uppers = [self.depth_stats[d]['coverage_ci'][1] for d in depths]
        errors = [[c - l for c, l in zip(coverages, ci_lowers)],
                  [u - c for c, u in zip(coverages, ci_uppers)]]

        # Top-left: Coverage by depth (Calibration)
        ax1 = axes[0, 0]
        x = np.array(depths)
        ax1.errorbar(x - 0.1, coverages, yerr=errors, fmt='o-', capsize=5,
                     label='Interval Arithmetic', color='#3498db', linewidth=2)
        ax1.plot(x + 0.1, oracle_coverages, 's--', label='Oracle (Monte Carlo)',
                 color='#2ecc71', linewidth=2)
        ax1.axhline(0.90, color='blue', linestyle=':', linewidth=1.5, label='Target 90%')
        ax1.axhline(0.85, color='orange', linestyle=':', linewidth=1.5, label='Minimum 85%')
        ax1.axhline(0.99, color='red', linestyle=':', linewidth=1.5, label='Max 99%')
        ax1.axhspan(0.85, 0.99, color='gray', alpha=0.1)
        ax1.set_xticks(depths)
        ax1.set_xlabel('Nesting Depth')
        ax1.set_ylabel('Coverage')
        ax1.set_title('D1-D3: Calibration vs Depth')
        ax1.set_ylim(0.7, 1.02)
        ax1.legend(loc='lower left', fontsize='small')
        ax1.grid(True, alpha=0.3)

        # Top-right: Width ratio vs oracle (Precision)
        ax2 = axes[0, 1]
        width_ratios = [self.depth_stats[d]['median_width_ratio'] for d in depths]
        colors = ['#2ecc71' if r <= 2.0 else '#e74c3c' for r in width_ratios]
        ax2.bar(depths, width_ratios, color=colors, alpha=0.7)
        ax2.axhline(2.0, color='red', linestyle='--', linewidth=2, label='2× threshold')
        ax2.axhline(1.0, color='blue', linestyle=':', linewidth=1.5, label='1× (same as oracle)')
        ax2.set_xticks(depths)
        ax2.set_xlabel('Nesting Depth')
        ax2.set_ylabel('Width Ratio (CI / Oracle)')
        ax2.set_title('D5: Interval Width vs Oracle')
        ax2.legend()
        ax2.grid(True, axis='y', alpha=0.3)

        # Bottom-left: Absolute widths
        ax3 = axes[1, 0]
        ci_widths = [self.depth_stats[d]['mean_ci_width'] for d in depths]
        oracle_widths = [self.depth_stats[d]['mean_oracle_width'] for d in depths]
        ax3.semilogy(depths, ci_widths, 'o-', label='Interval Arithmetic', linewidth=2)
        ax3.semilogy(depths, oracle_widths, 's--', label='Oracle', linewidth=2)
        ax3.set_xticks(depths)
        ax3.set_xlabel('Nesting Depth')
        ax3.set_ylabel('Mean CI Width (log scale)')
        ax3.set_title('Absolute Width Growth')
        ax3.legend()
        ax3.grid(True, alpha=0.3)

        # Bottom-right: Summary table
        ax4 = axes[1, 1]
        ax4.axis('off')

        # Create summary table
        cell_text = []
        for d in depths:
            stats = self.depth_stats[d]
            cell_text.append([
                str(d),
                f"{stats['coverage']:.1%}",
                f"{stats['oracle_coverage']:.1%}",
                f"{stats['median_width_ratio']:.2f}×",
                '✓' if stats['coverage'] >= 0.85 else '✗'
            ])

        table = ax4.table(cellText=cell_text,
                         colLabels=['Depth', 'IA Coverage', 'Oracle Cov', 'Width Ratio', 'Pass'],
                         loc='center',
                         cellLoc='center')
        table.auto_set_font_size(False)
        table.set_fontsize(10)
        table.scale(1.2, 1.5)
        ax4.set_title('Summary by Depth', pad=20)

        plt.tight_layout()
        save_figure(fig, self.get_output_path("composition-depth.png"))

    def _print_conclusion(self) -> None:
        self.print_section("CONCLUSION")

        print("Calibration Hypotheses:")
        print(f"  D1 (Coverage ≥90% for depth ≤ 3): {'PASS' if self.d1_pass else 'FAIL'}")
        print(f"  D2 (Coverage ≥85% for depth ≤ 5): {'PASS' if self.d2_pass else 'FAIL'}")
        print(f"  D3 (Coverage ≤99%, not too conservative): {'PASS' if self.d3_pass else 'FAIL'}")

        print("\nPrecision Hypotheses:")
        print(f"  D4 (Width growth ≤ 2× per level): {'PASS' if self.d4_pass else 'FAIL'}")
        print(f"  D5 (Width ≤ 2× oracle): {'PASS' if self.d5_pass else 'FAIL'}")

        all_pass = all([self.d1_pass, self.d2_pass, self.d3_pass, self.d4_pass, self.d5_pass])
        print(f"\nOverall Study D: {'PASS' if all_pass else 'PARTIAL'}")

        if all_pass:
            print("Interval arithmetic maintains calibration and acceptable precision at all depths.")
        else:
            failing = []
            if not self.d1_pass: failing.append('D1')
            if not self.d2_pass: failing.append('D2')
            if not self.d3_pass: failing.append('D3')
            if not self.d4_pass: failing.append('D4')
            if not self.d5_pass: failing.append('D5')
            print(f"Failing hypotheses: {', '.join(failing)}")


def main():
    analysis = CompositionDepthAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
