#!/usr/bin/env python3
"""
Study F: Chained (flatMap) CI Validation

Analyzes whether size estimation propagates correctly through ChainedArbitrary (flatMap).
"""

import matplotlib.pyplot as plt
import numpy as np
from base import AnalysisBase
from stats import wilson_score_interval
from viz import save_figure

class ChainedCIValidationAnalysis(AnalysisBase):
    @property
    def name(self) -> str:
        return "Study F: Chained (flatMap) CI Validation"

    @property
    def csv_filename(self) -> str:
        return "chained-ci-validation.csv"

    @property
    def required_columns(self) -> list:
        return ['scenario', 'true_size', 'estimated_size', 'true_in_ci']

    def analyze(self) -> None:
        self._analyze_coverage()
        self._analyze_relative_error()
        self._create_visualizations()
        self._print_conclusion()

    def _analyze_coverage(self) -> None:
        self.print_section("COVERAGE BY SCENARIO")
        coverage_stats = self.df.groupby('scenario')['true_in_ci'].agg(['mean', 'count']).reset_index()
        print(f"{'Scenario':<25} {'Coverage':<10} {'N':<8} {'95% CI':<20}")
        self.print_divider()
        for _, row in coverage_stats.iterrows():
            ci = wilson_score_interval(int(row['mean'] * row['count']), int(row['count']))
            print(f"{row['scenario']:<25} {row['mean']:>7.1%}   {int(row['count']):<8} [{ci[0]:.1%}, {ci[1]:.1%}]")

    def _analyze_relative_error(self) -> None:
        self.print_section("RELATIVE ERROR BY SCENARIO")
        error_stats = self.df.groupby('scenario')['relative_error'].agg(['mean', 'std']).reset_index()
        print(f"{'Scenario':<25} {'Mean Rel Error':<15} {'Std Dev':<10}")
        self.print_divider()
        for _, row in error_stats.iterrows():
            print(f"{row['scenario']:<25} {row['mean']:>14.1%}   {row['std']:>9.1%}")

    def _create_visualizations(self) -> None:
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

        # 1. Coverage
        scenarios = self.df['scenario'].unique()
        coverage = self.df.groupby('scenario')['true_in_ci'].mean()
        ax1.bar(scenarios, coverage * 100, alpha=0.7, color='steelblue')
        ax1.axhline(y=90, color='r', linestyle='--', label='Target 90%')
        ax1.set_xlabel('Scenario')
        ax1.set_ylabel('Coverage (%)')
        ax1.set_title('CI Coverage by Scenario')
        ax1.set_ylim(0, 105)
        ax1.tick_params(axis='x', rotation=45)
        ax1.legend()

        # 2. Relative Error
        error = self.df.groupby('scenario')['relative_error'].mean()
        ax2.bar(scenarios, error * 100, alpha=0.7, color='coral')
        ax2.set_xlabel('Scenario')
        ax2.set_ylabel('Mean Relative Error (%)')
        ax2.set_title('Relative Error by Scenario')
        ax2.tick_params(axis='x', rotation=45)

        plt.tight_layout()
        save_figure(fig, self.get_output_path("chained-ci-validation.png"))

    def _print_conclusion(self) -> None:
        self.print_section("CONCLUSION")
        overall_coverage = self.df['true_in_ci'].mean()
        print(f"Overall Coverage: {overall_coverage:.1%}")
        if overall_coverage >= 0.90:
            print("✓ Hypothesis F1 PASS: Coverage is maintained at ≥90%")
        else:
            print("✗ Hypothesis F1 FAIL: Coverage is below target")

def main():
    analysis = ChainedCIValidationAnalysis()
    analysis.run()

if __name__ == "__main__":
    main()
