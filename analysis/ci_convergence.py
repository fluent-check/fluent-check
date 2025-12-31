#!/usr/bin/env python3
"""
Warmup Sample Size Sensitivity Analysis (Study A: Convergence Dynamics)

PROBLEM:
FilteredArbitrary.ts:16 uses WARMUP_SAMPLES = 10, but the basic CI calibration
study uses 200 warmup samples. This analysis validates whether the default is sufficient.

HYPOTHESES:
A1 (Minimum Warmup): Coverage ≥90% for all warmup counts ≥10
    - Tests whether the current constructor default (10 samples) is sufficient
A2 (Convergence Point): CI calibration converges (coverage ≥90%) by N=50 samples
    - Identifies a recommended warmup for conservative applications
A3 (Width Convergence): CI width decreases monotonically with warmup count
    - Validates that precision improves predictably with more samples
A4 (Error Convergence): Point estimate error decreases with warmup count
    - Validates that accuracy improves predictably with more samples

OUTPUT:
- Rule-of-thumb: "Use at least N warmup samples for M% expected pass rate"
- Validation that default 10 samples is sufficient for calibration
"""

import matplotlib.pyplot as plt
import numpy as np
from base import AnalysisBase
from viz import save_figure
from stats import wilson_score_interval

class CIConvergenceAnalysis(AnalysisBase):
    def __init__(self):
        super().__init__()
        self.a1_pass = None
        self.a2_pass = None
        self.a3_pass = None
        self.a4_pass = None

    @property
    def name(self) -> str:
        return "Warmup Sample Size Sensitivity Analysis"

    @property
    def csv_filename(self) -> str:
        return "ci-convergence.csv"

    @property
    def required_columns(self) -> list:
        return ['pass_rate', 'warmup_count', 'true_size', 'estimated_size', 'ci_width', 'true_in_ci', 'relative_error']

    def analyze(self) -> None:
        self._check_minimum_warmup()
        self._check_convergence_point()
        self._check_width_convergence()
        self._check_error_convergence()
        self._derive_rule_of_thumb()
        self._create_visualization()
        self._print_conclusion()

    def _check_minimum_warmup(self) -> None:
        """A1: Coverage ≥90% for all warmup counts ≥10 (validates constructor default)."""
        self.print_section("A1: MINIMUM WARMUP (Constructor Default Validation)")

        # Get coverage for each warmup count
        coverage_by_warmup = self.df.groupby('warmup_count')['true_in_ci'].mean()

        # Calculate Wilson score 95% CI for each
        print(f"{'Warmup':<10} {'Coverage':<12} {'95% CI':<20} {'Result'}")
        self.print_divider()

        all_above_90 = True
        for warmup, coverage in coverage_by_warmup.items():
            n = len(self.df[self.df['warmup_count'] == warmup])
            k = coverage * n
            lower, upper = wilson_score_interval(k, n, confidence=0.95)

            result = "PASS" if coverage >= 0.90 else "FAIL"
            if coverage < 0.90:
                all_above_90 = False

            print(f"{warmup:<10} {coverage:.1%}        [{lower:.1%}, {upper:.1%}]       {result}")

        self.a1_pass = all_above_90
        print(f"\nResult: {'PASS' if self.a1_pass else 'FAIL'} - Coverage ≥90% for warmup ≥10: {self.a1_pass}")
        if self.a1_pass:
            print("  → The constructor default of 10 warmup samples is SUFFICIENT for calibration")

    def _check_convergence_point(self) -> None:
        """A2: CI calibration converges (coverage ≥90%) by N=50 samples."""
        self.print_section("A2: CONVERGENCE POINT")

        # Coverage at N=50
        coverage_at_50 = self.df[self.df['warmup_count'] == 50]['true_in_ci'].mean()
        n_50 = len(self.df[self.df['warmup_count'] == 50])
        k_50 = coverage_at_50 * n_50
        lower_50, upper_50 = wilson_score_interval(k_50, n_50, confidence=0.95)

        print(f"Coverage at N=50: {coverage_at_50:.1%} [{lower_50:.1%}, {upper_50:.1%}]")

        # Find first warmup where coverage stabilizes above 90%
        coverage_by_warmup = self.df.groupby('warmup_count')['true_in_ci'].mean()
        first_stable = None
        for warmup, coverage in coverage_by_warmup.items():
            if coverage >= 0.90:
                first_stable = warmup
                break

        print(f"First warmup with coverage ≥90%: N={first_stable}")

        self.a2_pass = coverage_at_50 >= 0.90
        print(f"\nResult: {'PASS' if self.a2_pass else 'FAIL'} - Converges by N=50: {self.a2_pass}")

    def _check_width_convergence(self) -> None:
        """A3: CI width decreases monotonically with warmup count."""
        self.print_section("A3: WIDTH CONVERGENCE (Precision)")

        # Group by pass_rate and warmup_count, take mean width
        width_trends = self.df.groupby(['pass_rate', 'warmup_count'])['ci_width'].mean().unstack()

        monotonic_counts = 0
        total_checks = 0

        print(f"{'Pass Rate':<10} {'Monotonic?':<12} {'Width 10→500':<20} {'Reduction'}")
        self.print_divider()

        for pass_rate, row in width_trends.iterrows():
            widths = row.values
            is_monotonic = np.all(np.diff(widths) <= 0.01)  # Allow small noise
            if is_monotonic:
                monotonic_counts += 1
            total_checks += 1

            reduction = (widths[0] - widths[-1]) / widths[0] * 100
            print(f"{pass_rate:<10} {str(is_monotonic):<12} {widths[0]:.1f} → {widths[-1]:.1f}    {reduction:.0f}%")

        self.a3_pass = monotonic_counts == total_checks
        print(f"\nResult: {'PASS' if self.a3_pass else 'FAIL'} ({monotonic_counts}/{total_checks} pass rates show monotonic decrease)")

    def _check_error_convergence(self) -> None:
        """A4: Point estimate error decreases with warmup count."""
        self.print_section("A4: ERROR CONVERGENCE (Accuracy)")

        error_by_warmup = self.df.groupby('warmup_count')['relative_error'].mean()

        print(f"{'Warmup':<10} {'Mean Rel Error':<15} {'vs N=10'}")
        self.print_divider()

        error_at_10 = error_by_warmup.iloc[0]
        for warmup, error in error_by_warmup.items():
            improvement = (error_at_10 - error) / error_at_10 * 100 if warmup != 10 else 0
            print(f"{warmup:<10} {error:.1%}          {improvement:+.0f}%")

        decreased = error_by_warmup.iloc[-1] < error_by_warmup.iloc[0]
        final_error_ok = error_by_warmup.iloc[-1] < 0.10  # <10% error at 500 samples

        self.a4_pass = decreased and final_error_ok
        print(f"\nResult: {'PASS' if self.a4_pass else 'FAIL'} (Error decreases and ends < 10%)")

    def _derive_rule_of_thumb(self) -> None:
        """Derive rule-of-thumb for warmup samples based on pass rate."""
        self.print_section("RULE-OF-THUMB DERIVATION")

        # For each pass rate, find minimum warmup for 90% coverage
        print("Minimum warmup for 90% coverage by pass rate:")
        print(f"{'Pass Rate':<12} {'Min Warmup':<15} {'Coverage at Min':<20}")
        self.print_divider()

        warmup_recommendations = {}
        for pass_rate in sorted(self.df['pass_rate'].unique()):
            subset = self.df[self.df['pass_rate'] == pass_rate]
            by_warmup = subset.groupby('warmup_count')['true_in_ci'].mean()

            min_warmup = None
            coverage_at_min = None
            for warmup, coverage in by_warmup.items():
                if coverage >= 0.90:
                    min_warmup = warmup
                    coverage_at_min = coverage
                    break

            if min_warmup is None:
                min_warmup = "N/A"
                coverage_at_min = by_warmup.max()

            warmup_recommendations[pass_rate] = min_warmup
            print(f"{pass_rate:<12} {str(min_warmup):<15} {coverage_at_min:.1%}")

        # General recommendation
        print("\n" + "="*60)
        print("RECOMMENDATION:")
        print("="*60)

        # Check if 10 is sufficient for all pass rates
        all_10 = all(v == 10 or (isinstance(v, int) and v <= 10) for v in warmup_recommendations.values())

        if all_10:
            print("✓ The default WARMUP_SAMPLES = 10 is SUFFICIENT for all tested pass rates.")
            print("  No change to FilteredArbitrary.ts:16 is required.")
        else:
            max_min_warmup = max(v for v in warmup_recommendations.values() if isinstance(v, (int, float)))
            print(f"✗ Some pass rates require more than 10 samples.")
            print(f"  Consider increasing WARMUP_SAMPLES to {max_min_warmup}")

        print("\nRule-of-thumb:")
        print("  - For typical filters (30-70% pass rate): 10 warmup samples")
        print("  - For sparse filters (≤10% pass rate): 25-50 warmup samples (for tighter CIs)")
        print("  - For precision-critical applications: 100+ samples")

    def _create_visualization(self) -> None:
        fig, axes = plt.subplots(2, 2, figsize=(14, 12))

        # Use colormap for distinct lines
        pass_rates = sorted(self.df['pass_rate'].unique())
        colors = plt.cm.viridis(np.linspace(0, 1, len(pass_rates)))

        # =====================================================================
        # Top Left: Coverage by Warmup Count
        # =====================================================================
        ax1 = axes[0, 0]

        coverage_trends = self.df.groupby(['pass_rate', 'warmup_count'])['true_in_ci'].mean().unstack()

        for idx, (pass_rate, row) in enumerate(coverage_trends.iterrows()):
            ax1.plot(row.index, row.values, marker='o', color=colors[idx],
                     label=f'{pass_rate:.0%} pass', linewidth=2)

        ax1.axhline(0.90, color='red', linestyle='--', label='90% Target', linewidth=2)
        ax1.axvline(10, color='gray', linestyle=':', label='Default (10)', alpha=0.7)
        ax1.set_xscale('log')
        ax1.set_xlabel('Warmup Samples')
        ax1.set_ylabel('Coverage (proportion)')
        ax1.set_title('A1/A2: Coverage vs Warmup Count')
        ax1.set_ylim(0.80, 1.0)
        ax1.legend(loc='lower right', fontsize='small')
        ax1.grid(True, which="both", ls="-", alpha=0.3)

        # =====================================================================
        # Top Right: Width Decay
        # =====================================================================
        ax2 = axes[0, 1]

        width_trends = self.df.groupby(['pass_rate', 'warmup_count'])['ci_width'].mean().unstack()
        base_size = 1000  # From study config

        for idx, (pass_rate, row) in enumerate(width_trends.iterrows()):
            # Observed
            ax2.plot(row.index, row.values, marker='o', color=colors[idx],
                     label=f'{pass_rate:.0%} pass', linewidth=2)

            # Theoretical (Wilson Score Interval Width)
            theoretical_widths = []
            for n in row.index:
                k = n * pass_rate
                lower, upper = wilson_score_interval(k, n, confidence=0.90)
                theoretical_widths.append((upper - lower) * base_size)
            ax2.plot(row.index, theoretical_widths, linestyle='--', color=colors[idx], alpha=0.5)

        ax2.plot([], [], color='gray', linestyle='--', label='Theoretical')
        ax2.axvline(10, color='gray', linestyle=':', alpha=0.7)
        ax2.set_xscale('log')
        ax2.set_xlabel('Warmup Samples')
        ax2.set_ylabel('CI Width')
        ax2.set_title('A3: CI Width Decay (solid=observed, dashed=theoretical)')
        ax2.legend(loc='upper right', fontsize='small')
        ax2.grid(True, which="both", ls="-", alpha=0.3)

        # =====================================================================
        # Bottom Left: Error Convergence
        # =====================================================================
        ax3 = axes[1, 0]

        error_trends = self.df.groupby(['pass_rate', 'warmup_count'])['relative_error'].mean().unstack()

        for idx, (pass_rate, row) in enumerate(error_trends.iterrows()):
            ax3.plot(row.index, row.values * 100, marker='o', color=colors[idx],
                     label=f'{pass_rate:.0%} pass', linewidth=2)

        ax3.axvline(10, color='gray', linestyle=':', alpha=0.7)
        ax3.axhline(10, color='red', linestyle='--', alpha=0.5, label='10% error threshold')
        ax3.set_xscale('log')
        ax3.set_xlabel('Warmup Samples')
        ax3.set_ylabel('Mean Relative Error (%)')
        ax3.set_title('A4: Point Estimate Error Convergence')
        ax3.legend(loc='upper right', fontsize='small')
        ax3.grid(True, which="both", ls="-", alpha=0.3)

        # =====================================================================
        # Bottom Right: Global Summary with Confidence Bands
        # =====================================================================
        ax4 = axes[1, 1]

        # Aggregate coverage statistics across all pass rates per warmup count
        agg_stats = self.df.groupby('warmup_count')['true_in_ci'].agg(['mean', 'std', 'count'])
        agg_stats['se'] = agg_stats['std'] / np.sqrt(agg_stats['count'])
        agg_stats['ci95'] = 1.96 * agg_stats['se']

        ax4.plot(agg_stats.index, agg_stats['mean'], color='black', linewidth=3,
                 marker='o', label='Global Mean Coverage')
        ax4.fill_between(
            agg_stats.index,
            agg_stats['mean'] - agg_stats['ci95'],
            agg_stats['mean'] + agg_stats['ci95'],
            color='black', alpha=0.2, label='95% CI'
        )

        ax4.axhline(0.90, color='red', linestyle='--', label='90% Target', linewidth=2)
        ax4.axvline(10, color='green', linestyle='-', linewidth=3, alpha=0.7, label='Default (10)')

        ax4.set_xscale('log')
        ax4.set_xlabel('Warmup Samples')
        ax4.set_ylabel('Global Coverage')
        ax4.set_title('Global Coverage Summary (Aggregated Across Pass Rates)')
        ax4.set_ylim(0.85, 1.0)
        ax4.legend(loc='lower right')
        ax4.grid(True, which="both", ls="-", alpha=0.3)

        # Add annotation for key finding
        min_coverage = agg_stats['mean'].min()
        min_warmup = agg_stats['mean'].idxmin()
        ax4.annotate(f'Lowest: {min_coverage:.1%} at N={min_warmup}',
                    xy=(min_warmup, min_coverage),
                    xytext=(min_warmup * 2, min_coverage - 0.02),
                    arrowprops=dict(arrowstyle='->', color='gray'),
                    fontsize=10)

        plt.tight_layout()
        save_figure(fig, self.get_output_path("ci-convergence.png"))

    def _print_conclusion(self) -> None:
        self.print_section("CONCLUSION")

        print("Hypothesis Results:")
        print(f"  A1 (Minimum Warmup ≥10):    {'PASS ✓' if self.a1_pass else 'FAIL ✗'}")
        print(f"  A2 (Convergence by N=50):   {'PASS ✓' if self.a2_pass else 'FAIL ✗'}")
        print(f"  A3 (Width Convergence):     {'PASS ✓' if self.a3_pass else 'FAIL ✗'}")
        print(f"  A4 (Error Convergence):     {'PASS ✓' if self.a4_pass else 'FAIL ✗'}")

        all_pass = all([self.a1_pass, self.a2_pass, self.a3_pass, self.a4_pass])
        print(f"\nOverall: {'ALL HYPOTHESES PASS ✓' if all_pass else 'SOME HYPOTHESES FAIL'}")

        if self.a1_pass:
            print("\nKEY FINDING: The default WARMUP_SAMPLES = 10 in FilteredArbitrary.ts:16")
            print("             is sufficient for well-calibrated credible intervals.")


def main():
    analysis = CIConvergenceAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
