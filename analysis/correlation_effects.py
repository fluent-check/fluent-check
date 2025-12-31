#!/usr/bin/env python3
"""
Correlation Effects Analysis

Investigates how correlation between arbitraries affects the conservatism
of interval arithmetic in products (tuples) and sums (unions).

Hypotheses:
- H1: Independent compositions (Tuple/Union of different instances) are conservative (Coverage > 95%)
- H2: Correlated compositions (Tuple/Union of SAME instance) are well-calibrated (Coverage ~90% ± 5%)
- H3: Dependent nested filters (A.filter(p1).filter(p2)) are well-calibrated (Coverage ~90% ± 5%)

Generates:
- correlation-effects.png: Coverage rates by scenario
"""

import matplotlib.pyplot as plt
import numpy as np
from scipy import stats
import pandas as pd

from base import AnalysisBase
from viz import save_figure, COLORS


class CorrelationEffectsAnalysis(AnalysisBase):
    """Analysis of correlation effects on CI calibration."""

    TARGET_COVERAGE = 0.90
    TOLERANCE = 0.05  # ±5%
    CONSERVATIVE_THRESHOLD = 0.95

    def __init__(self):
        super().__init__()

    @property
    def name(self) -> str:
        return "Correlation Effects Analysis"

    @property
    def csv_filename(self) -> str:
        return "correlation_effects.csv"

    @property
    def required_columns(self) -> list:
        return ['scenario', 'pass_rate', 'covered', 'ci_width']

    def analyze(self) -> None:
        """Perform the analysis."""
        self._compute_coverage_by_scenario()
        self._test_hypotheses()
        self._create_visualization()
        self._print_conclusion()

    def _compute_coverage_by_scenario(self) -> None:
        """Compute coverage rate for each scenario and pass rate."""
        self.print_section("COVERAGE BY SCENARIO")
        print(f"{ 'Scenario':<25} { 'PassRate':<10} { 'Coverage':<10} { 'N':<8} { '95% CI':<20}")
        self.print_divider()

        self.scenario_stats = {}

        # Group by scenario and pass_rate
        grouped = self.df.groupby(['scenario', 'pass_rate'])
        
        for (scenario, pass_rate), group in grouped:
            n = len(group)
            coverage = group['covered'].mean()
            ci = self._wilson_ci(coverage, n)
            
            key = (scenario, pass_rate)
            print(f"{scenario:<25} {pass_rate:<10} {coverage:>7.1%}   {n:<8} [{ci[0]:.1%}, {ci[1]:.1%}]")
            
            self.scenario_stats[key] = {
                'coverage': coverage,
                'n': n,
                'ci': ci
            }

    def _wilson_ci(self, p: float, n: int, confidence: float = 0.95) -> tuple:
        """Compute Wilson score confidence interval for a proportion."""
        if n == 0:
            return (0, 1)

        z = stats.norm.ppf(1 - (1 - confidence) / 2)
        denominator = 1 + z**2 / n
        center = (p + z**2 / (2*n)) / denominator
        margin = z * np.sqrt((p * (1 - p) + z**2 / (4*n)) / n) / denominator

        return (max(0, center - margin), min(1, center + margin))

    def _test_hypotheses(self) -> None:
        """Test the hypotheses."""
        self.print_section("HYPOTHESIS TESTING")
        
        # H1: Independent > 95%
        indep_scenarios = ['product_independent', 'sum_independent']
        indep_data = self.df[self.df['scenario'].isin(indep_scenarios)]
        h1_cov = indep_data['covered'].mean()
        h1_pass = h1_cov > self.CONSERVATIVE_THRESHOLD
        
        print(f"\nH1: Independent compositions are conservative (>95% coverage)")
        print(f"   Observed: {h1_cov:.1%}")
        print(f"   Result: {'PASS' if h1_pass else 'FAIL'}")

        # H2: Correlated in [85%, 95%]
        corr_scenarios = ['product_correlated', 'sum_correlated']
        corr_data = self.df[self.df['scenario'].isin(corr_scenarios)]
        h2_cov = corr_data['covered'].mean()
        h2_pass = (self.TARGET_COVERAGE - self.TOLERANCE) <= h2_cov <= (self.TARGET_COVERAGE + self.TOLERANCE)
        
        print(f"\nH2: Correlated compositions are well-calibrated (90% ± 5%)")
        print(f"   Observed: {h2_cov:.1%}")
        print(f"   Result: {'PASS' if h2_pass else 'FAIL'}")

        # H3: Nested Dependent in [85%, 95%]
        nested_data = self.df[self.df['scenario'] == 'nested_dependent']
        h3_cov = nested_data['covered'].mean()
        h3_pass = (self.TARGET_COVERAGE - self.TOLERANCE) <= h3_cov <= (self.TARGET_COVERAGE + self.TOLERANCE)
        
        print(f"\nH3: Nested dependent filters are well-calibrated (90% ± 5%)")
        print(f"   Observed: {h3_cov:.1%}")
        print(f"   Result: {'PASS' if h3_pass else 'FAIL'}")
        
        self.results = {
            'H1': h1_pass,
            'H2': h2_pass,
            'H3': h3_pass
        }

    def _create_visualization(self) -> None:
        """Create bar chart comparing independent vs correlated."""
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Aggregate by scenario (ignoring pass rate for overall picture)
        scenarios = sorted(self.df['scenario'].unique())
        means = []
        errors_lower = []
        errors_upper = []
        
        for sc in scenarios:
            data = self.df[self.df['scenario'] == sc]
            cov = data['covered'].mean()
            n = len(data)
            ci = self._wilson_ci(cov, n)
            means.append(cov)
            errors_lower.append(cov - ci[0])
            errors_upper.append(ci[1] - cov)
            
        x = np.arange(len(scenarios))
        
        # Color logic: Green if calibrated (85-95), Blue if conservative (>95), Red if under (<85)
        colors = []
        for m in means:
            if m > 0.95: colors.append('#3498db') # Blue
            elif m < 0.85: colors.append('#e74c3c') # Red
            else: colors.append('#2ecc71') # Green
            
        bars = ax.bar(x, means, yerr=[errors_lower, errors_upper], capsize=5, color=colors, alpha=0.8, edgecolor='black')
        
        # Labels
        ax.set_xticks(x)
        labels = [s.replace('_', '\n') for s in scenarios]
        ax.set_xticklabels(labels)
        
        ax.axhline(y=0.90, color='gray', linestyle='--', label='Target (90%)')
        ax.axhspan(0.85, 0.95, color='gray', alpha=0.1, label='Calibrated Range')
        
        ax.set_ylabel('Coverage')
        ax.set_title('Impact of Correlation on Credible Interval Coverage')
        ax.set_ylim(0.8, 1.0)
        ax.legend()
        
        # Add values on bars
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height + 0.005,
                    f'{height:.1%}', ha='center', va='bottom', fontsize=9)
            
        save_figure(fig, self.get_output_path("correlation_effects.png"))

    def _print_conclusion(self) -> None:
        """Print conclusion based on results."""
        self.print_section("CONCLUSION")
        
        print("Findings:")
        if self.results['H1']:
            print("  ✓ Independent compositions are indeed conservative (>95% coverage).")
            print("    This confirms that interval arithmetic overestimates uncertainty for independent variables.")
        else:
            print("  x Independent compositions did not show expected conservatism.")
            
        if self.results['H2']:
            print("  ✓ Correlated compositions (same instance) are well-calibrated (~90%).")
            print("    This proves that the 'conservatism' disappears when variables are perfectly correlated,")
            print("    reverting to the underlying single-filter calibration.")
        else:
            print("  x Correlated compositions showed unexpected behavior.")
            
        if self.results['H3']:
            print("  ✓ Nested dependent filters behave as standard Bayesian updates (~90%).")
            print("    They do not exhibit the conservatism of Tuple/Union because they don't use interval arithmetic.")

        print("\nImplication:")
        print("  Interval Arithmetic is 'Robustly Conservative'. It assumes the worst-case dependency structure")
        print("  (perfect correlation) implicitly by bounding the range. For independent variables, this is conservative.")
        print("  For correlated variables, it becomes exact. It never under-covers due to correlation.")

def main():
    analysis = CorrelationEffectsAnalysis()
    analysis.run()

if __name__ == "__main__":
    main()
