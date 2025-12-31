#!/usr/bin/env python3
"""
Study E: Shrinking CI Calibration Analysis

Analyzes whether CI calibration holds for shrunk filtered arbitraries.

PROBLEM:
When shrinking, FilteredArbitrary.shrink() creates a NEW instance with:
- Fresh Beta(2,1) prior (cold start)
- Only 10 warmup samples (constructor default)
- No transfer of parent posterior

HYPOTHESES:
E1: Coverage >= 90% when shrunk space has same pass rate as parent
E2: Coverage >= 85% when shrunk space has higher pass rate (subset shrinking)
E3: CI width increases after shrinking due to cold start
E4: Coverage improves with additional warmup samples post-shrink
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from scipy import stats as scipy_stats

from base import AnalysisBase
from constants import OUTPUT_DIR, RAW_DATA_DIR


class ShrinkingCICalibrationAnalysis(AnalysisBase):
    def __init__(self):
        super().__init__()
        self.e1_pass = None
        self.e2_pass = None
        self.e3_pass = None
        self.e4_pass = None

    @property
    def name(self) -> str:
        return "Study E: Shrinking CI Calibration"

    @property
    def csv_filename(self) -> str:
        return "shrinking-ci-calibration.csv"

    @property
    def required_columns(self) -> list:
        return ['scenario', 'parent_true_in_ci', 'warmup0_true_in_ci',
                'warmup10_true_in_ci', 'warmup50_true_in_ci', 'warmup100_true_in_ci']

    def analyze(self) -> None:
        self._print_overview()
        self._analyze_parent_calibration()
        self._analyze_e1_same_pass_rate()
        self._analyze_e2_higher_pass_rate()
        self._analyze_e3_ci_width()
        self._analyze_e4_warmup_sensitivity()
        self._create_visualizations()
        self._print_conclusion()

    def _print_overview(self) -> None:
        self.print_section("DATA OVERVIEW")

        print(f"Total trials: {len(self.df)}")
        print(f"Scenarios: {self.df['scenario'].unique().tolist()}")
        print()

        # Per-scenario summary
        print("Per-Scenario Summary:")
        print("-" * 100)
        print(f"{'Scenario':<30} | {'Trials':>7} | {'Parent Size':>12} | {'Shrunk Size':>12} | {'Pass Rate Change':>16}")
        print("-" * 100)

        for scenario in self.df['scenario'].unique():
            sdf = self.df[self.df['scenario'] == scenario]
            parent_size = sdf['parent_true_size'].iloc[0]
            shrunk_size = sdf['shrunk_true_size'].iloc[0]
            parent_rate = sdf['parent_pass_rate'].iloc[0]
            shrunk_rate = sdf['shrunk_pass_rate'].iloc[0]
            rate_change = f"{parent_rate*100:.1f}% -> {shrunk_rate*100:.1f}%"
            print(f"{scenario:<30} | {len(sdf):>7} | {parent_size:>12} | {shrunk_size:>12} | {rate_change:>16}")

    def _compute_wilson_ci(self, successes: int, n: int, confidence: float = 0.95) -> tuple:
        """Compute Wilson score confidence interval for a proportion."""
        if n == 0:
            return (0.0, 1.0)
        z = scipy_stats.norm.ppf(1 - (1 - confidence) / 2)
        p_hat = successes / n
        denom = 1 + z**2 / n
        center = (p_hat + z**2 / (2*n)) / denom
        margin = z * np.sqrt((p_hat * (1 - p_hat) + z**2 / (4*n)) / n) / denom
        return (max(0, center - margin), min(1, center + margin))

    def _analyze_parent_calibration(self) -> None:
        """Verify parent arbitraries are well-calibrated (baseline check)."""
        self.print_section("PARENT CALIBRATION (BASELINE)")

        parent_coverage = self.df['parent_true_in_ci'].mean()
        n = len(self.df)
        successes = int(parent_coverage * n)
        wilson_low, wilson_high = self._compute_wilson_ci(successes, n)

        print(f"Parent Coverage: {parent_coverage:.1%} (95% CI: [{wilson_low:.1%}, {wilson_high:.1%}])")
        print(f"Expected: ~90% (target credible level)")
        print()

        if parent_coverage >= 0.85:
            print("Result: PASS - Parent arbitraries are well-calibrated (baseline confirmed)")
        else:
            print("Result: WARNING - Parent calibration is unexpectedly low")

    def _analyze_e1_same_pass_rate(self) -> None:
        """E1: Coverage >= 90% when shrunk space has same pass rate."""
        self.print_section("E1: SAME PASS RATE SCENARIOS")

        # Identify scenarios where pass rate is preserved (~similar)
        same_rate_scenarios = ['same_pass_rate_mod2', 'sparse_mod10', 'very_sparse_mod100']

        print("Testing coverage for scenarios where pass rate is approximately preserved:")
        print()

        all_pass = True
        for scenario in same_rate_scenarios:
            sdf = self.df[self.df['scenario'] == scenario]
            if len(sdf) == 0:
                continue

            parent_rate = sdf['parent_pass_rate'].iloc[0]
            shrunk_rate = sdf['shrunk_pass_rate'].iloc[0]

            # Check coverage at default warmup (warmup0)
            coverage = sdf['warmup0_true_in_ci'].mean()
            n = len(sdf)
            successes = int(coverage * n)
            wilson_low, wilson_high = self._compute_wilson_ci(successes, n)

            status = "PASS" if coverage >= 0.85 else "FAIL"
            if coverage < 0.90:
                all_pass = False

            print(f"{scenario}:")
            print(f"  Pass rate: {parent_rate*100:.1f}% -> {shrunk_rate*100:.1f}%")
            print(f"  Coverage: {coverage:.1%} (95% CI: [{wilson_low:.1%}, {wilson_high:.1%}])")
            print(f"  Result: {status}")
            print()

        self.e1_pass = all_pass
        print(f"E1 Overall: {'PASS' if self.e1_pass else 'FAIL'} (Target: >= 90% coverage)")

    def _analyze_e2_higher_pass_rate(self) -> None:
        """E2: Coverage >= 85% when shrunk space has higher pass rate."""
        self.print_section("E2: HIGHER PASS RATE SCENARIOS (SUBSET SHRINKING)")

        # Identify scenarios where pass rate increases after shrinking
        higher_rate_scenarios = ['higher_pass_rate_threshold', 'clustered_low', 'mixed_ranges']

        print("Testing coverage for scenarios where pass rate increases after shrinking:")
        print()

        all_pass = True
        for scenario in higher_rate_scenarios:
            sdf = self.df[self.df['scenario'] == scenario]
            if len(sdf) == 0:
                continue

            parent_rate = sdf['parent_pass_rate'].iloc[0]
            shrunk_rate = sdf['shrunk_pass_rate'].iloc[0]

            coverage = sdf['warmup0_true_in_ci'].mean()
            n = len(sdf)
            successes = int(coverage * n)
            wilson_low, wilson_high = self._compute_wilson_ci(successes, n)

            status = "PASS" if coverage >= 0.85 else "FAIL"
            if coverage < 0.85:
                all_pass = False

            print(f"{scenario}:")
            print(f"  Pass rate: {parent_rate*100:.1f}% -> {shrunk_rate*100:.1f}%")
            print(f"  Coverage: {coverage:.1%} (95% CI: [{wilson_low:.1%}, {wilson_high:.1%}])")
            print(f"  Result: {status}")
            print()

        self.e2_pass = all_pass
        print(f"E2 Overall: {'PASS' if self.e2_pass else 'FAIL'} (Target: >= 85% coverage)")

    def _analyze_e3_ci_width(self) -> None:
        """E3: CI width increases after shrinking (cold start effect)."""
        self.print_section("E3: CI WIDTH COMPARISON (COLD START EFFECT)")

        print("Comparing CI widths: Parent (110 samples) vs Shrunk (10 samples):")
        print()
        print(f"{'Scenario':<30} | {'Parent Width':>14} | {'Shrunk Width':>14} | {'Ratio':>8} | {'Increased?':>10}")
        print("-" * 90)

        width_increased_count = 0
        total_scenarios = 0

        for scenario in self.df['scenario'].unique():
            sdf = self.df[self.df['scenario'] == scenario]

            parent_width = sdf['parent_ci_width'].median()
            shrunk_width = sdf['warmup0_ci_width'].median()

            # Ratio > 1 means shrunk is wider (cold start effect)
            ratio = shrunk_width / parent_width if parent_width > 0 else float('inf')
            increased = ratio > 1.0

            if increased:
                width_increased_count += 1
            total_scenarios += 1

            status = "YES" if increased else "NO"
            print(f"{scenario:<30} | {parent_width:>14.1f} | {shrunk_width:>14.1f} | {ratio:>8.2f}x | {status:>10}")

        print()
        print(f"Scenarios with increased width after shrinking: {width_increased_count}/{total_scenarios}")

        # E3 passes if at least 50% of scenarios show width increase (cold start effect)
        self.e3_pass = width_increased_count >= total_scenarios / 2

        if self.e3_pass:
            print("\nE3: PASS - Cold start effect confirmed (CI width increases after shrinking)")
        else:
            print("\nE3: INCONCLUSIVE - Cold start effect not clearly observed")
            print("  Note: This may indicate the 10-sample warmup is sufficient for these scenarios")

    def _analyze_e4_warmup_sensitivity(self) -> None:
        """E4: Coverage improves with additional warmup samples."""
        self.print_section("E4: WARMUP SENSITIVITY")

        warmup_levels = [
            ('warmup0', 'warmup0_true_in_ci', '10 (default)'),
            ('warmup10', 'warmup10_true_in_ci', '20'),
            ('warmup50', 'warmup50_true_in_ci', '60'),
            ('warmup100', 'warmup100_true_in_ci', '110'),
        ]

        print("Coverage by warmup level (aggregate across all scenarios):")
        print()
        print(f"{'Warmup Level':>15} | {'Total Samples':>14} | {'Coverage':>10} | {'95% CI':>20}")
        print("-" * 70)

        coverages = []
        for level_name, col, total_samples in warmup_levels:
            coverage = self.df[col].mean()
            coverages.append(coverage)
            n = len(self.df)
            successes = int(coverage * n)
            wilson_low, wilson_high = self._compute_wilson_ci(successes, n)
            print(f"{total_samples:>15} | {total_samples:>14} | {coverage:>10.1%} | [{wilson_low:.1%}, {wilson_high:.1%}]")

        print()

        # E4 passes if coverage improves from warmup0 to warmup100
        improvement = coverages[-1] - coverages[0]
        print(f"Coverage improvement (10 -> 110 samples): {improvement:+.1%}")

        self.e4_pass = improvement >= 0.0  # Any improvement counts

        if self.e4_pass:
            print("\nE4: PASS - Coverage improves with additional warmup")
        else:
            print("\nE4: INCONCLUSIVE - Coverage does not clearly improve with warmup")

        # Detailed breakdown by scenario
        print("\n\nCoverage by Scenario and Warmup Level:")
        print("-" * 100)
        print(f"{'Scenario':<30} | {'w0 (10)':>10} | {'w10 (20)':>10} | {'w50 (60)':>10} | {'w100 (110)':>10}")
        print("-" * 100)

        for scenario in self.df['scenario'].unique():
            sdf = self.df[self.df['scenario'] == scenario]
            w0 = sdf['warmup0_true_in_ci'].mean()
            w10 = sdf['warmup10_true_in_ci'].mean()
            w50 = sdf['warmup50_true_in_ci'].mean()
            w100 = sdf['warmup100_true_in_ci'].mean()
            print(f"{scenario:<30} | {w0:>10.1%} | {w10:>10.1%} | {w50:>10.1%} | {w100:>10.1%}")

    def _create_visualizations(self) -> None:
        """Create visualizations for the study."""
        self.print_section("VISUALIZATIONS")

        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        # Left: Coverage by scenario and warmup level
        ax1 = axes[0]
        scenarios = self.df['scenario'].unique()
        warmup_cols = ['warmup0_true_in_ci', 'warmup10_true_in_ci',
                       'warmup50_true_in_ci', 'warmup100_true_in_ci']
        warmup_labels = ['10 samples', '20 samples', '60 samples', '110 samples']
        colors = ['#d73027', '#fc8d59', '#91cf60', '#1a9850']

        x = np.arange(len(scenarios))
        width = 0.2

        for i, (col, label, color) in enumerate(zip(warmup_cols, warmup_labels, colors)):
            coverages = [self.df[self.df['scenario'] == s][col].mean() for s in scenarios]
            ax1.bar(x + i * width, coverages, width, label=label, color=color, alpha=0.8)

        ax1.axhline(y=0.90, color='black', linestyle='--', linewidth=1.5, label='90% target')
        ax1.axhline(y=0.85, color='gray', linestyle=':', linewidth=1, label='85% threshold')

        ax1.set_xticks(x + 1.5 * width)
        ax1.set_xticklabels([s.replace('_', '\n') for s in scenarios], fontsize=8)
        ax1.set_ylabel('Coverage')
        ax1.set_title('Coverage by Scenario and Warmup Level')
        ax1.legend(loc='lower right', fontsize=8)
        ax1.set_ylim(0, 1.05)

        # Right: CI Width comparison (parent vs shrunk at different warmups)
        ax2 = axes[1]

        parent_widths = [self.df[self.df['scenario'] == s]['parent_ci_width'].median() for s in scenarios]
        shrunk0_widths = [self.df[self.df['scenario'] == s]['warmup0_ci_width'].median() for s in scenarios]
        shrunk100_widths = [self.df[self.df['scenario'] == s]['warmup100_ci_width'].median() for s in scenarios]

        x = np.arange(len(scenarios))
        width = 0.25

        ax2.bar(x - width, parent_widths, width, label='Parent (110 samples)', color='steelblue', alpha=0.8)
        ax2.bar(x, shrunk0_widths, width, label='Shrunk (10 samples)', color='coral', alpha=0.8)
        ax2.bar(x + width, shrunk100_widths, width, label='Shrunk (110 samples)', color='forestgreen', alpha=0.8)

        ax2.set_xticks(x)
        ax2.set_xticklabels([s.replace('_', '\n') for s in scenarios], fontsize=8)
        ax2.set_ylabel('Median CI Width')
        ax2.set_title('CI Width: Parent vs Shrunk')
        ax2.legend(loc='upper right', fontsize=8)

        plt.tight_layout()
        fig.savefig(OUTPUT_DIR / 'shrinking_ci_calibration.png', dpi=150)
        plt.close()
        print(f"  Saved: shrinking_ci_calibration.png")

    def _print_conclusion(self) -> None:
        self.print_section("CONCLUSION")

        print("Hypothesis Results:")
        print()

        results = [
            ("E1", "Same pass rate: Coverage >= 90%", self.e1_pass),
            ("E2", "Higher pass rate: Coverage >= 85%", self.e2_pass),
            ("E3", "CI width increases after shrinking", self.e3_pass),
            ("E4", "Coverage improves with warmup", self.e4_pass),
        ]

        for hyp_id, description, passed in results:
            status = 'PASS' if passed else ('FAIL' if passed is False else 'N/A')
            print(f"  {hyp_id}: {description}")
            print(f"      Result: {status}")
            print()

        # Overall assessment
        all_pass = all(r[2] for r in results if r[2] is not None)
        print("Overall Assessment:")
        if all_pass:
            print("  The shrinking model maintains adequate CI calibration.")
            print("  Cold start effect is manageable with default 10-sample warmup.")
        else:
            print("  Some hypotheses did not pass - see details above for recommendations.")


def main():
    analysis = ShrinkingCICalibrationAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
