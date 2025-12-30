#!/usr/bin/env python3
"""
Adversarial Patterns Analysis

Tests CI calibration under non-uniform (clustered/patterned) data.

Hypotheses:
- C1: Clustered acceptance maintains calibration
- C2: Patterned rejection maintains calibration
"""

import matplotlib.pyplot as plt
import numpy as np
from base import AnalysisBase
from viz import save_figure
from scipy import stats

class AdversarialPatternsAnalysis(AnalysisBase):
    def __init__(self):
        super().__init__()
        self.c1_pass = None
        self.c2_pass = None

    @property
    def name(self) -> str:
        return "Adversarial Patterns Analysis"

    @property
    def csv_filename(self) -> str:
        return "adversarial-patterns.csv"

    @property
    def required_columns(self) -> list:
        return ['scenario', 'true_in_ci']

    def analyze(self) -> None:
        self._check_calibration_by_scenario()
        self._create_visualization()
        self._print_conclusion()

    def _check_calibration_by_scenario(self) -> None:
        self.print_section("CALIBRATION BY PATTERN")
        
        print(f"{'Pattern':<20} {'Coverage':<10} {'95% CI':<20}")
        self.print_divider()
        
        scenario_passes = {}
        for scenario in self.df['scenario'].unique():
            data = self.df[self.df['scenario'] == scenario]
            coverage = data['true_in_ci'].mean()
            n = len(data)
            ci = self._wilson_ci(coverage, n)
            
            print(f"{scenario:<20} {coverage:>7.1%}   [{ci[0]:.1%}, {ci[1]:.1%}]")
            
            # Check if 90% is within CI (or close enough)
            passed = (ci[0] <= 0.90 <= ci[1]) or (0.85 <= coverage <= 0.95)
            scenario_passes[scenario] = passed

        # C1: Clustered acceptance (clustered_10pct)
        # C2: Patterned rejection (others: modulo, primes, block_hole)
        # Note: block_hole is technically clustered rejection, but fits the 'pattern' theme.
        # We'll assume 'clustered' in name maps to C1.
        self.c1_pass = all(v for k, v in scenario_passes.items() if 'clustered' in k)
        self.c2_pass = all(v for k, v in scenario_passes.items() if 'clustered' not in k)

    def _wilson_ci(self, p: float, n: int, confidence: float = 0.95) -> tuple:
        if n == 0: return (0, 1)
        z = stats.norm.ppf(1 - (1 - confidence) / 2)
        denominator = 1 + z**2 / n
        center = (p + z**2 / (2*n)) / denominator
        margin = z * np.sqrt((p * (1 - p) + z**2 / (4*n)) / n) / denominator
        return (max(0, center - margin), min(1, center + margin))

    def _create_visualization(self) -> None:
        plt.figure(figsize=(10, 6))
        
        scenarios = self.df['scenario'].unique()
        coverages = [self.df[self.df['scenario'] == s]['true_in_ci'].mean() for s in scenarios]
        
        plt.bar(scenarios, coverages, color='#3498db', alpha=0.7)
        plt.axhline(0.90, color='r', linestyle='--', label='Target 90%')
        plt.axhspan(0.85, 0.95, color='gray', alpha=0.1, label='Acceptable Range')
        
        plt.ylim(0, 1.05)
        plt.title('Coverage by Adversarial Pattern')
        plt.xlabel('Pattern')
        plt.ylabel('Coverage')
        plt.legend()
        plt.grid(True, axis='y')
        
        save_figure(plt.gcf(), self.get_output_path("adversarial-patterns.png"))

    def _print_conclusion(self) -> None:
        self.print_section("CONCLUSION")
        print(f"C1 (Clustered acceptance): {'PASS' if self.c1_pass else 'FAIL'}")
        print(f"C2 (Patterned rejection):  {'PASS' if self.c2_pass else 'FAIL'}")

def main():
    analysis = AdversarialPatternsAnalysis()
    analysis.run()

if __name__ == "__main__":
    main()
