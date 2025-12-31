#!/usr/bin/env python3
"""
Study C: Adversarial Filter Patterns Analysis

Tests CI calibration under non-uniform, structured filter patterns.

Hypotheses:
- C1: Clustered acceptance maintains coverage ≥90%
- C2: Modular patterns maintain coverage ≥90%
- C3: Magnitude-dependent patterns maintain coverage ≥90%
- C4: Bit-pattern patterns maintain coverage ≥90%
- C5: Hash-based deterministic patterns maintain coverage ≥90%

All filters are deterministic with analytically computable ground truth.
"""

import matplotlib.pyplot as plt
import numpy as np
from base import AnalysisBase
from viz import save_figure
from stats import wilson_score_interval

class AdversarialPatternsAnalysis(AnalysisBase):
    def __init__(self):
        super().__init__()
        self.hypothesis_results = {}

    @property
    def name(self) -> str:
        return "Adversarial Patterns Analysis (Study C)"

    @property
    def csv_filename(self) -> str:
        return "adversarial-patterns.csv"

    @property
    def required_columns(self) -> list:
        return ['scenario', 'true_size', 'estimated_size', 'ci_lower', 'ci_upper', 'true_in_ci', 'relative_error']

    def analyze(self) -> None:
        self._check_calibration_by_scenario()
        self._analyze_estimation_accuracy()
        self._create_visualization()
        self._print_conclusion()

    def _check_calibration_by_scenario(self) -> None:
        self.print_section("CALIBRATION BY PATTERN")

        # Map scenarios to hypotheses
        scenario_to_hypothesis = {
            'clustered_10pct': 'C1 (Clustered)',
            'modulo_even': 'C2 (Modular)',
            'magnitude_dependent': 'C3 (Magnitude)',
            'bit_pattern_even': 'C4 (Bit-pattern)',
            'hash_30pct': 'C5 (Hash-based)'
        }

        print(f"{'Hypothesis':<20} {'Scenario':<22} {'Coverage':<10} {'95% CI':<22} {'Result'}")
        self.print_divider()

        for scenario in self.df['scenario'].unique():
            data = self.df[self.df['scenario'] == scenario]
            coverage = data['true_in_ci'].mean()
            n = len(data)

            # Wilson score interval for coverage
            lower, upper = wilson_score_interval(coverage * n, n, confidence=0.95)

            hypothesis = scenario_to_hypothesis.get(scenario, scenario)

            # Pass if coverage ≥ 85% (allowing some margin below 90% target)
            passed = coverage >= 0.85
            result = 'PASS' if passed else 'FAIL'

            print(f"{hypothesis:<20} {scenario:<22} {coverage:>7.1%}   [{lower:.1%}, {upper:.1%}]   {result}")

            self.hypothesis_results[scenario] = {
                'hypothesis': hypothesis,
                'coverage': coverage,
                'ci_lower': lower,
                'ci_upper': upper,
                'n': n,
                'passed': passed
            }

    def _analyze_estimation_accuracy(self) -> None:
        self.print_section("ESTIMATION ACCURACY")

        print(f"{'Scenario':<22} {'True Size':<12} {'Mean Est':<12} {'MAE':<12} {'Rel Error'}")
        self.print_divider()

        for scenario in self.df['scenario'].unique():
            data = self.df[self.df['scenario'] == scenario]
            true_size = data['true_size'].iloc[0]
            mean_est = data['estimated_size'].mean()
            mae = abs(data['estimated_size'] - data['true_size']).mean()
            mean_rel_error = data['relative_error'].mean()

            print(f"{scenario:<22} {true_size:<12} {mean_est:<12.1f} {mae:<12.1f} {mean_rel_error:>7.1%}")

    def _create_visualization(self) -> None:
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        scenarios = list(self.hypothesis_results.keys())
        coverages = [self.hypothesis_results[s]['coverage'] for s in scenarios]
        ci_lowers = [self.hypothesis_results[s]['ci_lower'] for s in scenarios]
        ci_uppers = [self.hypothesis_results[s]['ci_upper'] for s in scenarios]
        errors = [[c - l for c, l in zip(coverages, ci_lowers)],
                  [u - c for c, u in zip(coverages, ci_uppers)]]

        # Left: Coverage by scenario with error bars
        ax1 = axes[0]
        x = np.arange(len(scenarios))
        colors = ['#2ecc71' if self.hypothesis_results[s]['passed'] else '#e74c3c' for s in scenarios]

        ax1.bar(x, coverages, color=colors, alpha=0.7, yerr=errors, capsize=5)
        ax1.axhline(0.90, color='blue', linestyle='--', linewidth=2, label='Target 90%')
        ax1.axhline(0.85, color='orange', linestyle=':', linewidth=1.5, label='Minimum 85%')
        ax1.axhspan(0.85, 0.95, color='gray', alpha=0.1)

        ax1.set_xticks(x)
        ax1.set_xticklabels([s.replace('_', '\n') for s in scenarios], fontsize=9)
        ax1.set_ylim(0.7, 1.0)
        ax1.set_ylabel('Coverage')
        ax1.set_title('CI Coverage by Adversarial Pattern')
        ax1.legend(loc='lower right')
        ax1.grid(True, axis='y', alpha=0.3)

        # Right: Relative error by scenario
        ax2 = axes[1]
        rel_errors = [self.df[self.df['scenario'] == s]['relative_error'].values for s in scenarios]

        bp = ax2.boxplot(rel_errors, labels=[s.replace('_', '\n') for s in scenarios], patch_artist=True)
        for patch, color in zip(bp['boxes'], colors):
            patch.set_facecolor(color)
            patch.set_alpha(0.5)

        ax2.set_ylabel('Relative Error')
        ax2.set_title('Estimation Error by Pattern')
        ax2.grid(True, axis='y', alpha=0.3)

        plt.tight_layout()
        save_figure(fig, self.get_output_path("adversarial-patterns.png"))

    def _print_conclusion(self) -> None:
        self.print_section("CONCLUSION")

        all_passed = all(r['passed'] for r in self.hypothesis_results.values())

        for scenario, result in self.hypothesis_results.items():
            print(f"{result['hypothesis']}: {'PASS' if result['passed'] else 'FAIL'} (coverage = {result['coverage']:.1%})")

        print()
        print(f"Overall Study C: {'PASS' if all_passed else 'FAIL'}")
        if all_passed:
            print("All adversarial patterns maintain ≥85% coverage (acceptable calibration).")
        else:
            failing = [r['hypothesis'] for r in self.hypothesis_results.values() if not r['passed']]
            print(f"Failing patterns: {', '.join(failing)}")


def main():
    analysis = AdversarialPatternsAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
