#!/usr/bin/env python3
"""
CI Convergence Dynamics Analysis

Tests whether credible intervals behave correctly as sample size increases.

Hypotheses:
- H1: CI width decreases monotonically with sample count
- H2: CI contains true value at all checkpoints
- H3: Point estimate converges to true value
"""

import matplotlib.pyplot as plt
import numpy as np
from base import AnalysisBase
from viz import save_figure

class CIConvergenceAnalysis(AnalysisBase):
    def __init__(self):
        super().__init__()
        self.h1_pass = None
        self.h2_pass = None
        self.h3_pass = None

    @property
    def name(self) -> str:
        return "CI Convergence Dynamics Analysis"

    @property
    def csv_filename(self) -> str:
        return "ci-convergence.csv"

    @property
    def required_columns(self) -> list:
        return ['pass_rate', 'sample_count', 'true_size', 'estimated_size', 'ci_width', 'true_in_ci', 'relative_error']

    def analyze(self) -> None:
        self._check_width_monotonicity()
        self._check_coverage_stability()
        self._check_point_estimate_convergence()
        self._create_visualization()
        self._print_conclusion()

    def _check_width_monotonicity(self) -> None:
        """H1: CI width decreases monotonically with sample count."""
        self.print_section("H1: WIDTH MONOTONICITY")
        
        # Group by pass_rate and sample_count, take mean width
        width_trends = self.df.groupby(['pass_rate', 'sample_count'])['ci_width'].mean().unstack()
        
        monotonic_counts = 0
        total_checks = 0
        
        print(f"{'Pass Rate':<10} {'Monotonic?':<12} {'Widths (1 -> 500)'}")
        self.print_divider()
        
        for pass_rate, row in width_trends.iterrows():
            widths = row.values
            is_monotonic = np.all(np.diff(widths) <= 0.01) # Allow small noise
            if is_monotonic:
                monotonic_counts += 1
            total_checks += 1
            
            print(f"{pass_rate:<10} {str(is_monotonic):<12} {widths[0]:.1f} -> {widths[-1]:.1f}")

        self.h1_pass = monotonic_counts == total_checks
        print(f"\nResult: {'PASS' if self.h1_pass else 'FAIL'} ({monotonic_counts}/{total_checks} monotonic)")

    def _check_coverage_stability(self) -> None:
        """H2: CI contains true value at all checkpoints."""
        self.print_section("H2: COVERAGE STABILITY")
        
        coverage_by_samples = self.df.groupby('sample_count')['true_in_ci'].mean()
        
        print(f"{'Samples':<10} {'Coverage':<10}")
        self.print_divider()
        
        all_above_85 = True
        for samples, coverage in coverage_by_samples.items():
            print(f"{samples:<10} {coverage:.1%}")
            if coverage < 0.85:
                all_above_85 = False
                
        self.h2_pass = all_above_85
        print(f"\nResult: {'PASS' if self.h2_pass else 'FAIL'} (All checkpoints >= 85%)")

    def _check_point_estimate_convergence(self) -> None:
        """H3: Point estimate converges to true value."""
        self.print_section("H3: ESTIMATE CONVERGENCE")
        
        error_by_samples = self.df.groupby('sample_count')['relative_error'].mean()
        
        print(f"{'Samples':<10} {'Mean Rel Error':<15}")
        self.print_divider()
        
        decreased = error_by_samples.iloc[-1] < error_by_samples.iloc[0]
        final_error_ok = error_by_samples.iloc[-1] < 0.10 # <10% error at 500 samples
        
        for samples, error in error_by_samples.items():
            print(f"{samples:<10} {error:.3f}")
            
        self.h3_pass = decreased and final_error_ok
        print(f"\nResult: {'PASS' if self.h3_pass else 'FAIL'} (Error decreases and ends < 10%)")

    def _create_visualization(self) -> None:
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))
        
        # Left: Width decay
        ax1 = axes[0]
        width_trends = self.df.groupby(['pass_rate', 'sample_count'])['ci_width'].mean().unstack()
        
        # Use colormap for distinct lines
        colors = plt.cm.viridis(np.linspace(0, 1, len(width_trends)))
        
        for idx, (pass_rate, row) in enumerate(width_trends.iterrows()):
            ax1.plot(row.index, row.values, marker='o', color=colors[idx], label=f'Rate {pass_rate}')
        
        ax1.set_xscale('log')
        ax1.set_xlabel('Sample Count')
        ax1.set_ylabel('CI Width')
        ax1.set_title('CI Width vs Sample Count (Log Scale)')
        ax1.legend(title="True Pass Rate")
        ax1.grid(True, which="both", ls="-", alpha=0.5)
        
        # Right: Coverage stability
        ax2 = axes[1]
        
        # Aggregate coverage statistics across all pass rates per sample count
        # This shows the "global calibration" of the system
        agg_stats = self.df.groupby('sample_count')['true_in_ci'].agg(['mean', 'std', 'count'])
        agg_stats['se'] = agg_stats['std'] / np.sqrt(agg_stats['count'])
        # 95% CI for the coverage proportion itself
        agg_stats['ci95'] = 1.96 * agg_stats['se'] 
        
        # Plot individual lines faintly
        coverage_trends = self.df.groupby(['pass_rate', 'sample_count'])['true_in_ci'].mean().unstack()
        for idx, (pass_rate, row) in enumerate(coverage_trends.iterrows()):
            ax2.plot(row.index, row.values, marker='', color=colors[idx], alpha=0.2, linewidth=1)
            
        # Plot aggregate mean
        ax2.plot(agg_stats.index, agg_stats['mean'], color='black', linewidth=3, marker='o', label='Global Mean Coverage')
        ax2.fill_between(
            agg_stats.index, 
            agg_stats['mean'] - agg_stats['ci95'], 
            agg_stats['mean'] + agg_stats['ci95'], 
            color='black', alpha=0.1, label='95% Confidence Band'
        )
            
        ax2.axhline(0.90, color='blue', linestyle='--', label='Target 90%', linewidth=2)
        ax2.set_xscale('log')
        ax2.set_xlabel('Sample Count')
        ax2.set_ylabel('Coverage Proportion')
        ax2.set_title('Global Coverage Reliability vs Sample Count')
        ax2.set_ylim(0.7, 1.0) # Zoom in on the relevant high-coverage area
        ax2.legend(loc='lower right')
        ax2.grid(True, which="both", ls="-", alpha=0.5)
        
        save_figure(fig, self.get_output_path("ci-convergence.png"))

    def _print_conclusion(self) -> None:
        self.print_section("CONCLUSION")
        print(f"H1 (Monotonic Width): {'PASS' if self.h1_pass else 'FAIL'}")
        print(f"H2 (Stable Coverage): {'PASS' if self.h2_pass else 'FAIL'}")
        print(f"H3 (Convergence):     {'PASS' if self.h3_pass else 'FAIL'}")

def main():
    analysis = CIConvergenceAnalysis()
    analysis.run()

if __name__ == "__main__":
    main()
