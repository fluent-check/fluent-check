#!/usr/bin/env python3
"""
Efficiency Analysis: Compare tests-to-termination for different property complexities

Key insight: FluentCheck checks confidence every 100 tests (confidenceCheckInterval).
This means:
- Minimum termination: 100 tests (first confidence check)
- always_true: Should always terminate at 100 (trivially achieves confidence)
- Failure properties: May find bug before 100 tests, or achieve confidence at check

Generates:
- Box plot comparing property types
- Histogram showing termination distribution
- Summary statistics table
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

from base import AnalysisBase
from stats import compute_summary_stats, print_summary_table
from viz import save_figure


class EfficiencyAnalysis(AnalysisBase):
    """Analysis of tests-to-termination efficiency by property type."""

    @property
    def name(self) -> str:
        return "Efficiency Analysis"

    @property
    def csv_filename(self) -> str:
        return "efficiency.csv"

    def analyze(self) -> None:
        """Perform the efficiency analysis."""
        print("Note: Confidence checked every 100 tests (minimum termination point)\n")
        self._compute_statistics()
        self._create_visualization()
        self._print_efficiency_comparison()
        self._print_100_test_check()
        self._print_roi_analysis()
        self._print_conclusion()

    def _compute_statistics(self) -> None:
        """Compute summary statistics for each property type."""
        self.property_types = sorted(self.df['property_type'].unique())
        print(f"Property types found: {self.property_types}\n")

        grouped = self.df.groupby('property_type')

        self.print_section("TESTS-TO-TERMINATION SUMMARY")

        self.all_stats = {}
        self.termination_summary = {}

        for prop_type in self.property_types:
            group = grouped.get_group(prop_type)
            tests_run = group['tests_run'].values
            stats = compute_summary_stats(tests_run)
            self.all_stats[prop_type] = stats

            term_counts = group['termination_reason'].value_counts().to_dict()
            self.termination_summary[prop_type] = term_counts

            true_pass_rate = self.safe_first(group, 'true_pass_rate', 0.0)
            bug_found_count = group['bug_found'].sum()

            print(f"\n{prop_type}:")
            print(f"  True pass rate: {true_pass_rate*100:.1f}%")
            print(f"  Bug found: {bug_found_count}/{len(group)} ({bug_found_count/len(group)*100:.1f}%)")
            print(f"  Termination: {term_counts}")
            print_summary_table(stats, "  ")

    def _create_visualization(self) -> None:
        """Create efficiency visualization with two subplots."""
        fig, axes = plt.subplots(1, 2, figsize=(16, 7))

        self._create_boxplot(axes[0])
        self._create_termination_chart(axes[1])

        save_figure(fig, self.get_output_path("efficiency_boxplot.png"))

    def _create_boxplot(self, ax) -> None:
        """Create box plot of tests-to-termination."""
        plot_data = self.df[['property_type', 'tests_run', 'true_pass_rate', 'bug_found']].copy()

        label_map = {}
        for pt in self.property_types:
            rate = self.safe_first(self.df[self.df['property_type'] == pt], 'true_pass_rate', 0.0)
            label_map[pt] = f"{pt}\n({rate*100:.1f}%)"

        plot_data['property_label'] = plot_data['property_type'].map(label_map)

        order = (self.df.groupby('property_type')['true_pass_rate']
                 .first()
                 .sort_values(ascending=False)
                 .index
                 .map(label_map)
                 .tolist())

        n_types = len(self.property_types)
        colors = plt.cm.RdYlGn(np.linspace(0.3, 0.9, n_types))[::-1]

        sns.boxplot(
            data=plot_data,
            x='property_label',
            y='tests_run',
            ax=ax,
            hue='property_label',
            palette=dict(zip(order, colors)),
            width=0.6,
            order=order,
            legend=False
        )

        sns.stripplot(
            data=plot_data,
            x='property_label',
            y='tests_run',
            ax=ax,
            color='black',
            alpha=0.3,
            size=3,
            order=order
        )

        ax.axhline(y=100, color='red', linestyle='--', alpha=0.5,
                   label='Min termination (confidence check interval)')

        ax.set_xlabel('Property Type (Pass Rate)')
        ax.set_ylabel('Tests Run Until Termination')
        ax.set_title('Efficiency: Tests-to-Termination by Property Complexity')
        ax.legend(loc='upper right')
        ax.grid(True, axis='y', alpha=0.3)

    def _create_termination_chart(self, ax) -> None:
        """Create stacked bar chart of termination reasons."""
        term_data = []
        for pt in self.property_types:
            rate = self.safe_first(self.df[self.df['property_type'] == pt], 'true_pass_rate', 0.0)
            terms = self.termination_summary.get(pt, {})
            term_data.append({
                'property': pt,
                'pass_rate': rate,
                'confidence': terms.get('confidence', 0),
                'bugFound': terms.get('bugFound', 0),
                'maxIterations': terms.get('maxIterations', 0)
            })

        term_df = pd.DataFrame(term_data)
        term_df = term_df.sort_values('pass_rate', ascending=False)

        x = np.arange(len(term_df))
        width = 0.6

        ax.bar(x, term_df['confidence'], width, label='Confidence achieved', color='#2ca02c', alpha=0.8)
        ax.bar(x, term_df['bugFound'], width, bottom=term_df['confidence'],
               label='Bug found', color='#d62728', alpha=0.8)
        ax.bar(x, term_df['maxIterations'], width,
               bottom=term_df['confidence'] + term_df['bugFound'],
               label='Max iterations', color='#7f7f7f', alpha=0.8)

        ax.set_xlabel('Property Type')
        ax.set_ylabel('Number of Trials')
        ax.set_title('Termination Reasons by Property Complexity')
        ax.set_xticks(x)
        ax.set_xticklabels([f"{r['property']}\n({r['pass_rate']*100:.1f}%)"
                           for _, r in term_df.iterrows()], fontsize=9)
        ax.legend(loc='upper right')
        ax.grid(True, axis='y', alpha=0.3)

    def _print_efficiency_comparison(self) -> None:
        """Print efficiency comparison."""
        self.print_section("EFFICIENCY COMPARISON")

        baseline_type = max(self.all_stats.keys(),
                           key=lambda pt: self.safe_first(
                               self.df[self.df['property_type'] == pt], 'true_pass_rate', 0.0))
        baseline_stats = self.all_stats[baseline_type]

        print(f"\nBaseline ({baseline_type}): {baseline_stats['mean']:.1f} tests (median: {baseline_stats['p50']:.0f})")

        for prop_type in sorted(self.all_stats.keys(),
                               key=lambda pt: self.safe_first(
                                   self.df[self.df['property_type'] == pt], 'true_pass_rate', 0.0),
                               reverse=True):
            if prop_type == baseline_type:
                continue
            stats = self.all_stats[prop_type]
            terms = self.termination_summary.get(prop_type, {})
            total_terms = sum(terms.values())
            bug_pct = terms.get('bugFound', 0) / total_terms * 100 if total_terms > 0 else 0

            print(f"  {prop_type}: {stats['mean']:.1f} tests ({bug_pct:.0f}% terminated by finding bug)")

    def _print_100_test_check(self) -> None:
        """Print 100-test minimum check."""
        print(f"\n100-Test Minimum Check:")
        for prop_type in self.property_types:
            group = self.df[self.df['property_type'] == prop_type]

            conf_trials = group[group['termination_reason'] == 'confidence']
            if len(conf_trials) > 0:
                unique_tests = conf_trials['tests_run'].unique()
                at_100 = (conf_trials['tests_run'] == 100).sum()
                print(f"  {prop_type}: {at_100}/{len(conf_trials)} confidence terminations at exactly 100 tests")
                if len(unique_tests) <= 3:
                    print(f"    Unique test counts: {sorted(unique_tests)}")

    def _print_roi_analysis(self) -> None:
        """Print performance ROI analysis."""
        self.print_section("PERFORMANCE ROI ANALYSIS")

        print("\nTime Investment by Property Type:")
        self.print_divider(width=90)
        print(f"{'Property':<20} {'Mean Time (µs)':<18} {'Time/Test (µs)':<18} {'Median (µs)':<18}")
        self.print_divider(width=90)

        for prop_type in self.property_types:
            group = self.df[self.df['property_type'] == prop_type]
            mean_time = group['elapsed_micros'].mean()
            mean_tests = group['tests_run'].mean()
            time_per_test = mean_time / mean_tests if mean_tests > 0 else 0
            median_time = group['elapsed_micros'].median()

            print(f"{prop_type:<20} "
                  f"{mean_time:<18.1f} "
                  f"{time_per_test:<18.2f} "
                  f"{median_time:<18.0f}")

        self.print_divider(width=90)

        self._print_cost_benefit()
        self._print_overall_summary()

    def _print_cost_benefit(self) -> None:
        """Print cost-benefit analysis by termination reason."""
        print("\nCost-Benefit: Confidence vs Bug Detection:")
        self.print_divider(width=90)
        print(f"{'Property':<20} {'Confidence (µs)':<20} {'Bug Found (µs)':<20} {'Savings':<15}")
        self.print_divider(width=90)

        for prop_type in self.property_types:
            group = self.df[self.df['property_type'] == prop_type]

            conf_trials = group[group['termination_reason'] == 'confidence']
            bug_trials = group[group['termination_reason'] == 'bugFound']

            mean_conf_time = conf_trials['elapsed_micros'].mean() if len(conf_trials) > 0 else np.nan
            mean_bug_time = bug_trials['elapsed_micros'].mean() if len(bug_trials) > 0 else np.nan

            if not np.isnan(mean_conf_time) and not np.isnan(mean_bug_time):
                savings = ((mean_conf_time - mean_bug_time) / mean_conf_time * 100)
                savings_str = f"{savings:+.1f}%"
            elif np.isnan(mean_bug_time):
                savings_str = "N/A (no bugs)"
            elif np.isnan(mean_conf_time):
                savings_str = "N/A (always bugs)"
            else:
                savings_str = "N/A"

            conf_str = f"{mean_conf_time:.1f}" if not np.isnan(mean_conf_time) else "N/A"
            bug_str = f"{mean_bug_time:.1f}" if not np.isnan(mean_bug_time) else "N/A"

            print(f"{prop_type:<20} "
                  f"{conf_str:<20} "
                  f"{bug_str:<20} "
                  f"{savings_str:<15}")

        self.print_divider(width=90)
        print("Savings = (confidence_time - bug_time) / confidence_time x 100%")
        print("Positive savings: bug detection is faster (terminates early)")
        print("Negative savings: confidence takes longer to achieve")

    def _print_overall_summary(self) -> None:
        """Print overall efficiency summary."""
        print("\nOverall Efficiency Summary:")
        self.print_divider(width=90)

        total_time = self.df['elapsed_micros'].sum() / 1000
        total_tests = self.df['tests_run'].sum()
        total_bugs = self.df['bug_found'].sum()

        print(f"  Total time spent: {total_time:.2f} ms")
        print(f"  Total tests run: {total_tests}")
        print(f"  Total bugs found: {total_bugs}")
        print(f"  Average time per test: {(total_time * 1000) / total_tests:.2f} µs")
        print(f"  Average time per bug: {total_time / total_bugs:.2f} ms" if total_bugs > 0 else "  No bugs found")
        print(f"  Bug detection rate: {total_bugs / total_tests * 100:.2f}%")

        always_true_time = self.df[self.df['property_type'] == 'always_true']['elapsed_micros'].mean()
        other_props = self.df[self.df['property_type'] != 'always_true']
        avg_other_time = other_props['elapsed_micros'].mean()

        if not np.isnan(always_true_time) and not np.isnan(avg_other_time):
            time_saved_pct = (always_true_time - avg_other_time) / always_true_time * 100
            print(f"\nTime saved by early bug detection: {abs(time_saved_pct):.1f}%")
            print(f"  (Comparing always_true baseline vs properties with potential bugs)")

        self.print_divider(width=90)

    def _print_conclusion(self) -> None:
        """Print conclusion."""
        self.print_section("CONCLUSION")
        print(f"  {self.check_mark} Efficiency analysis complete")


def main():
    analysis = EfficiencyAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
