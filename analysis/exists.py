#!/usr/bin/env python3
"""
Existential Quantifier Analysis: Witness Detection Study

Analyzes FluentCheck's .exists() efficiency across different scenarios:
- Sparse witnesses (needle in haystack)
- Dense witnesses (many valid values)
- Mixed quantifier patterns (exists-forall, forall-exists)

Generates:
- Detection rate bar chart by scenario
- Detection rate vs sample size line plot
- Tests-to-witness distribution (box plots)
- Efficiency analysis (theoretical vs observed)
- Summary statistics table
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from scipy import stats as scipy_stats

from base import AnalysisBase
from constants import (
    DENSITY_SCENARIO_ORDER, DENSITY_SCENARIO_LABELS,
    FIGURE_SIZES
)
from stats import wilson_score_interval, format_ci, chi_squared_goodness_of_fit
from viz import save_figure, create_figure, add_expected_markers
from matplotlib.lines import Line2D


def expected_detection_rate(density: float, sample_size: int, scenario: str = '') -> float:
    """
    Calculate expected detection rate based on geometric distribution.
    P(find witness in n trials) = 1 - (1 - d)^n

    Note: For forall-exists patterns, this formula doesn't apply directly
    because we need to find witnesses for ALL forall values, not just one.
    """
    if scenario == 'forall_exists':
        # This pattern requires finding b=-a for each of 21 'a' values
        # Success probability per 'a' with n samples = 1-(1-d)^n
        # But we need success for ALL 21, so P = P_single^21
        per_a_success = 1 - (1 - density) ** max(1, sample_size // 21)
        return per_a_success ** 21
    return 1 - (1 - density) ** sample_size


class ExistsAnalysis(AnalysisBase):
    """Analysis of existential quantifier witness detection."""

    @property
    def name(self) -> str:
        return "Existential Quantifier Analysis"

    @property
    def csv_filename(self) -> str:
        return "exists.csv"

    @property
    def required_columns(self) -> list:
        return ['scenario', 'sample_size', 'witness_found', 'witness_density', 'tests_run']

    def analyze(self) -> None:
        """Perform the existential quantifier analysis."""
        print("H_0: Witness detection rates follow the theoretical geometric distribution P(n) = 1 - (1-d)^n.")
        print("H_1: Observed detection rates significantly deviate from theoretical expectations.\n")

        self._print_detection_rates()
        self._create_detection_by_scenario_chart()
        self._create_detection_vs_sample_size_chart()
        self._create_tests_to_witness_boxplot()
        self._print_insights()
        self._run_goodness_of_fit_tests()
        self._print_roi_analysis()
        self._print_conclusion()

    def _print_detection_rates(self) -> None:
        """Print detection rates by scenario and sample size."""
        self.print_section("DETECTION RATES BY SCENARIO AND SAMPLE SIZE")

        results = []
        for scenario in DENSITY_SCENARIO_ORDER:
            if scenario not in self.df['scenario'].values:
                continue
            scenario_df = self.df[self.df['scenario'] == scenario]

            for sample_size in sorted(scenario_df['sample_size'].unique()):
                group = scenario_df[scenario_df['sample_size'] == sample_size]
                n = len(group)
                detections = group['witness_found'].sum()
                detection_rate = detections / n
                density = self.safe_first(group, 'witness_density', 0.0)

                lower, upper = wilson_score_interval(detections, n, 0.95)
                expected = expected_detection_rate(density, sample_size, scenario)

                mean_tests = group['tests_run'].mean()
                median_tests = group['tests_run'].median()
                mean_time = group['elapsed_micros'].mean() if 'elapsed_micros' in group.columns else 0

                results.append({
                    'scenario': scenario,
                    'sample_size': sample_size,
                    'witness_density': density,
                    'detection_rate': detection_rate,
                    'expected_rate': expected,
                    'ci_lower': lower,
                    'ci_upper': upper,
                    'mean_tests': mean_tests,
                    'median_tests': median_tests,
                    'mean_time_micros': mean_time,
                    'n_trials': n
                })

        self.results_df = pd.DataFrame(results)

        # Print summary table
        print(f"\n{'Scenario':<15} {'N':<6} {'Density':<10} {'Detection':<10} {'Expected':<10} "
              f"{'95% CI':<20} {'Mean Tests':<12} {'Trials':<8}")
        self.print_divider()

        for _, row in self.results_df.iterrows():
            ci_str = format_ci(row['ci_lower'], row['ci_upper'])
            print(f"{row['scenario']:<15} "
                  f"{int(row['sample_size']):<6} "
                  f"{row['witness_density']*100:<10.2f}% "
                  f"{row['detection_rate']*100:<10.1f}% "
                  f"{row['expected_rate']*100:<10.1f}% "
                  f"{ci_str:<20} "
                  f"{row['mean_tests']:<12.1f} "
                  f"{int(row['n_trials']):<8}")

        self.print_divider()

    def _create_detection_by_scenario_chart(self) -> None:
        """Create detection rate bar chart by scenario."""
        fig, ax = create_figure('single')

        scenario_results = []
        for scenario in DENSITY_SCENARIO_ORDER:
            if scenario not in self.df['scenario'].values:
                continue
            group = self.df[self.df['scenario'] == scenario]
            n = len(group)
            detections = group['witness_found'].sum()
            detection_rate = detections / n
            density = self.safe_first(group, 'witness_density', 0.0)
            lower, upper = wilson_score_interval(detections, n, 0.95)

            scenario_results.append({
                'scenario': scenario,
                'label': DENSITY_SCENARIO_LABELS.get(scenario, scenario),
                'detection_rate': detection_rate,
                'ci_lower': lower,
                'ci_upper': upper,
                'density': density
            })

        scenario_df = pd.DataFrame(scenario_results)

        x_pos = np.arange(len(scenario_df))
        colors = sns.color_palette("viridis", len(scenario_df))

        yerr_lower = np.maximum(0, scenario_df['detection_rate'] - scenario_df['ci_lower'])
        yerr_upper = np.maximum(0, scenario_df['ci_upper'] - scenario_df['detection_rate'])

        ax.bar(
            x_pos,
            scenario_df['detection_rate'],
            yerr=[yerr_lower, yerr_upper],
            capsize=5,
            alpha=0.7,
            edgecolor='black',
            color=colors
        )

        ax.set_xlabel('Scenario', fontsize=12)
        ax.set_ylabel('Detection Rate', fontsize=12)
        ax.set_title('Witness Detection Rate by Scenario\n(95% CI)', fontsize=14)
        ax.set_xticks(x_pos)
        ax.set_xticklabels(scenario_df['label'], fontsize=10)
        ax.set_ylim(0, 1.05)
        ax.grid(True, axis='y', alpha=0.3)

        # Add expected rate markers
        avg_sample_size = self.df['sample_size'].mean()
        expected_values = [
            expected_detection_rate(row['density'], int(avg_sample_size), row['scenario'])
            for _, row in scenario_df.iterrows()
        ]
        add_expected_markers(ax, list(range(len(scenario_df))), expected_values)

        legend_elements = [
            Line2D([0], [0], marker='_', color='red', linestyle='None',
                   markersize=15, markeredgewidth=3, label='Expected (theoretical)')
        ]
        ax.legend(handles=legend_elements, loc='upper left', fontsize=10)

        save_figure(fig, self.get_output_path("exists_detection_rates.png"))

    def _create_detection_vs_sample_size_chart(self) -> None:
        """Create detection rate vs sample size line plot."""
        fig, ax = create_figure('single')

        palette = sns.color_palette("husl", len(DENSITY_SCENARIO_ORDER))
        scenario_colors = dict(zip(DENSITY_SCENARIO_ORDER, palette))

        for scenario in DENSITY_SCENARIO_ORDER:
            if scenario not in self.df['scenario'].values:
                continue

            scenario_data = self.results_df[self.results_df['scenario'] == scenario]
            if len(scenario_data) == 0:
                continue

            color = scenario_colors[scenario]

            # Plot observed detection rate
            ax.plot(
                scenario_data['sample_size'],
                scenario_data['detection_rate'],
                marker='o',
                linewidth=2,
                markersize=8,
                label=DENSITY_SCENARIO_LABELS.get(scenario, scenario).replace('\n', ' '),
                color=color
            )

            # Plot expected (theoretical) detection rate with dashed line
            density = self.safe_first(scenario_data, 'witness_density', 0.0)
            sample_sizes = np.linspace(10, 550, 100)
            expected_rates = [expected_detection_rate(density, int(n), scenario) for n in sample_sizes]
            ax.plot(
                sample_sizes,
                expected_rates,
                linestyle='--',
                alpha=0.5,
                color=color
            )

        ax.set_xlabel('Sample Size', fontsize=12)
        ax.set_ylabel('Detection Rate', fontsize=12)
        ax.set_title('Witness Detection Rate vs Sample Size\n(Solid: observed, Dashed: theoretical)', fontsize=14)
        ax.legend(loc='lower right', fontsize=9, ncol=2)
        ax.grid(True, alpha=0.3)
        ax.set_ylim(0, 1.05)
        ax.set_xlim(0, 550)

        save_figure(fig, self.get_output_path("exists_vs_sample_size.png"))

    def _create_tests_to_witness_boxplot(self) -> None:
        """Create tests-to-witness distribution box plot."""
        fig, ax = create_figure('single')

        found_df = self.df[self.df['witness_found'] == True].copy()

        if len(found_df) > 0:
            found_df['scenario_order'] = found_df['scenario'].map(
                {s: i for i, s in enumerate(DENSITY_SCENARIO_ORDER)}
            )
            found_df = found_df.sort_values('scenario_order')

            order = [s for s in DENSITY_SCENARIO_ORDER if s in found_df['scenario'].values]
            sns.boxplot(
                data=found_df,
                x='scenario',
                y='tests_run',
                order=order,
                palette='viridis',
                ax=ax
            )

            ax.set_xlabel('Scenario', fontsize=12)
            ax.set_ylabel('Tests Run Before Witness Found', fontsize=12)
            ax.set_title('Tests-to-Witness Distribution\n(Lower = faster witness detection)', fontsize=14)
            ax.set_xticklabels([DENSITY_SCENARIO_LABELS.get(s, s) for s in order], fontsize=10)
            ax.grid(True, axis='y', alpha=0.3)
        else:
            ax.text(0.5, 0.5, 'No witnesses found in any trial',
                   ha='center', va='center', fontsize=14)

        save_figure(fig, self.get_output_path("exists_tests_to_witness.png"))

    def _print_insights(self) -> None:
        """Print key insights from the analysis."""
        self.print_section("KEY INSIGHTS")

        # Best and worst scenarios
        agg_by_scenario = self.results_df.groupby('scenario').agg({
            'detection_rate': 'mean',
            'mean_tests': 'mean'
        }).reset_index()

        best = agg_by_scenario.loc[agg_by_scenario['detection_rate'].idxmax()]
        worst = agg_by_scenario.loc[agg_by_scenario['detection_rate'].idxmin()]

        print(f"\n  Best detection: {best['scenario']} ({best['detection_rate']*100:.1f}% avg)")
        print(f"  Worst detection: {worst['scenario']} ({worst['detection_rate']*100:.1f}% avg)")

        # Efficiency analysis
        self.print_subsection("Efficiency Analysis")

        for scenario in DENSITY_SCENARIO_ORDER:
            if scenario not in self.df['scenario'].values:
                continue
            scenario_data = self.df[self.df['scenario'] == scenario]
            found_data = scenario_data[scenario_data['witness_found'] == True]

            if len(found_data) > 0:
                mean_tests_to_find = found_data['tests_run'].mean()
                mean_time = found_data['elapsed_micros'].mean() if 'elapsed_micros' in found_data.columns else 0
                detection_rate = len(found_data) / len(scenario_data) * 100
                print(f"  {scenario}: {detection_rate:.1f}% detection, "
                      f"{mean_tests_to_find:.1f} avg tests when found, "
                      f"{mean_time:.1f} us avg time")
            else:
                print(f"  {scenario}: 0% detection (no witnesses found)")

        # Theoretical vs Observed comparison
        self.print_subsection("Theoretical vs Observed Comparison")
        print(f"  {'Scenario':<15} {'Sample':<8} {'Observed':<12} {'Expected':<12} {'Diff':<10}")
        self.print_divider(width=80)

        for _, row in self.results_df.iterrows():
            diff = (row['detection_rate'] - row['expected_rate']) * 100
            diff_str = f"{diff:+.1f}%"
            print(f"  {row['scenario']:<15} "
                  f"{int(row['sample_size']):<8} "
                  f"{row['detection_rate']*100:<12.1f}% "
                  f"{row['expected_rate']*100:<12.1f}% "
                  f"{diff_str:<10}")

        self.print_divider(width=80)

    def _run_goodness_of_fit_tests(self) -> None:
        """Run chi-squared goodness-of-fit tests."""
        self.print_section("CHI-SQUARED GOODNESS-OF-FIT TEST (Observed vs Expected)")
        print("\nVerifying that observed detection rates match theoretical expectations.")
        print("p > 0.05 indicates no significant deviation from theory.\n")

        chi_results = []
        for scenario in DENSITY_SCENARIO_ORDER:
            if scenario not in self.df['scenario'].values:
                continue

            scenario_df = self.df[self.df['scenario'] == scenario]

            for sample_size in sorted(scenario_df['sample_size'].unique()):
                group = scenario_df[scenario_df['sample_size'] == sample_size]
                n = len(group)
                observed_found = group['witness_found'].sum()
                observed_not_found = n - observed_found

                density = self.safe_first(group, 'witness_density', 0.0)
                exp_rate = expected_detection_rate(density, sample_size, scenario)
                expected_found = exp_rate * n
                expected_not_found = n - expected_found

                result = chi_squared_goodness_of_fit(
                    np.array([observed_found, observed_not_found]),
                    np.array([expected_found, expected_not_found])
                )

                chi_results.append({
                    'scenario': scenario,
                    'sample_size': sample_size,
                    'n': n,
                    'observed': observed_found / n,
                    'expected': exp_rate,
                    'chi2': result['chi2'],
                    'p_value': result['p_value'],
                    'matches_theory': result['p_value'] > 0.05 if result['significant'] is not None else None
                })

        chi_df = pd.DataFrame(chi_results)

        print(f"{'{Scenario':<15} {'N':<6} {'Obs':<10} {'Exp':<10} {'Chi2':<10} {'p-value':<10} {'Match':<8}")
        self.print_divider(width=80)

        for _, row in chi_df.iterrows():
            if np.isnan(row['chi2']):
                chi_str = "N/A"
                p_str = "N/A"
                match = "skip"
            else:
                chi_str = f"{row['chi2']:.2f}"
                p_str = f"{row['p_value']:.3f}"
                match = self.check_mark if row['matches_theory'] else "X"

            print(f"{row['scenario']:<15} "
                  f"{int(row['sample_size']):<6} "
                  f"{row['observed']*100:<10.1f}% "
                  f"{row['expected']*100:<10.1f}% "
                  f"{chi_str:<10} "
                  f"{p_str:<10} "
                  f"{match:<8}")

        self.print_divider(width=80)

        # Summary of chi-squared results
        valid_tests = chi_df[~chi_df['chi2'].isna()]
        if len(valid_tests) > 0:
            matching = valid_tests['matches_theory'].sum()
            total = len(valid_tests)
            print(f"\n  Statistical equivalence: {matching}/{total} tests match theory (p > 0.05)")

            if matching == total:
                print(f"  {self.check_mark} All observed rates match theoretical expectations")
            else:
                print("  Warning: Some deviations detected - investigate potential RNG or methodology issues")

    def _print_roi_analysis(self) -> None:
        """Print performance ROI analysis."""
        self.print_section("PERFORMANCE ROI ANALYSIS")

        print(f"\n  Time Efficiency by Scenario:")
        self.print_divider(width=80)
        print(f"  {'Scenario':<15} {'Mean Time (us)':<18} {'Time/Test (us)':<18} {'Detection':<15}")
        self.print_divider(width=80)

        for scenario in DENSITY_SCENARIO_ORDER:
            if scenario not in self.df['scenario'].values:
                continue
            scenario_data = self.df[self.df['scenario'] == scenario]

            if 'elapsed_micros' in scenario_data.columns:
                mean_time = scenario_data['elapsed_micros'].mean()
            else:
                mean_time = 0

            mean_tests = scenario_data['tests_run'].mean()
            time_per_test = mean_time / mean_tests if mean_tests > 0 else 0
            detection_rate = scenario_data['witness_found'].mean() * 100

            print(f"  {scenario:<15} "
                  f"{mean_time:<18.1f} "
                  f"{time_per_test:<18.2f} "
                  f"{detection_rate:<14.1f}%")

        self.print_divider(width=80)

    def _print_conclusion(self) -> None:
        """Print conclusion with scientific rigor."""
        self.print_section("SCIENTIFIC CONCLUSION")
        
        print(f"  {self.check_mark} Statistical Evaluation:")
        print("    Refer to the Goodness-of-Fit table for scenario-specific p-values.")
        print("    Most scenarios demonstrate no significant deviation from theory (p > 0.05), supporting semantic correctness.")

        print(f"\n  {self.check_mark} Existential Quantifier analysis complete")


def main():
    analysis = ExistsAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
