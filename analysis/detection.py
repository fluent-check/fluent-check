#!/usr/bin/env python3
"""
Detection Rate Analysis: Compare bug detection rates across methods

Tests whether confidence-based termination finds rare bugs more reliably
than fixed sample sizes.

Methods compared:
- Fixed N: Run exactly N tests, stop
- Confidence-based: Run until confidence achieved or bug found

Generates:
- Detection rate bar chart with confidence intervals
- Tests-to-termination ECDF (cumulative distribution)
- Summary statistics table
"""

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.lines import Line2D
import seaborn as sns
import numpy as np

from base import AnalysisBase
from stats import (
    wilson_score_interval, format_ci,
    chi_squared_test, cohens_h, effect_size_interpretation, odds_ratio,
    power_analysis_proportion
)
from viz import save_figure


def method_sort_key(method: str) -> tuple:
    """Sort methods: fixed_* by N ascending, confidence_* by level ascending"""
    if method.startswith('fixed_'):
        return (0, int(method.split('_')[1]))
    elif method.startswith('confidence_'):
        return (1, float(method.split('_')[1]))
    return (2, 0)


class DetectionAnalysis(AnalysisBase):
    """Analysis of bug detection rates comparing fixed vs confidence-based methods."""

    @property
    def name(self) -> str:
        return "Detection Rate Analysis"

    @property
    def csv_filename(self) -> str:
        return "detection.csv"

    def analyze(self) -> None:
        """Perform the detection rate analysis."""
        self._compute_results()
        self._print_summary_table()
        self._create_detection_chart()
        self._create_ecdf_chart()
        self._print_insights()
        self._run_hypothesis_tests()
        self._print_roi_analysis()
        self._print_conclusion()

    def _compute_results(self) -> None:
        """Compute detection rates and statistics for each method."""
        self.bug_rate = self.safe_first(self.df, 'bug_failure_rate', 0.01)
        print(f"Bug failure rate: {self.bug_rate} (1 in {int(1/self.bug_rate)})\n")

        self.methods = sorted(self.df['method'].unique(), key=method_sort_key)

        results = []
        for method in self.methods:
            group = self.df[self.df['method'] == method]
            n = len(group)
            detections = group['bug_found'].sum()
            detection_rate = detections / n

            lower, upper = wilson_score_interval(detections, n, 0.95)

            mean_tests = group['tests_run'].mean()
            median_tests = group['tests_run'].median()

            mean_time_micros = group['elapsed_micros'].mean()
            median_time_micros = group['elapsed_micros'].median()
            mean_time_ms = mean_time_micros / 1000

            time_per_test = mean_time_micros / mean_tests if mean_tests > 0 else 0

            bugs_found = group['bug_found'].sum()
            total_time_ms = group['elapsed_micros'].sum() / 1000
            detection_per_ms = bugs_found / total_time_ms if total_time_ms > 0 else 0

            bug_trials = group[group['bug_found']]
            mean_time_to_detection = bug_trials['elapsed_micros'].mean() / 1000 if len(bug_trials) > 0 else np.nan

            if method.startswith('fixed_'):
                sample_size = int(method.split('_')[1])
                expected = 1 - (1 - self.bug_rate) ** sample_size
            else:
                expected = None

            results.append({
                'method': method,
                'detection_rate': detection_rate,
                'ci_lower': lower,
                'ci_upper': upper,
                'expected_rate': expected,
                'mean_tests': mean_tests,
                'median_tests': median_tests,
                'mean_time_ms': mean_time_ms,
                'median_time_micros': median_time_micros,
                'time_per_test': time_per_test,
                'detection_per_ms': detection_per_ms,
                'mean_time_to_detection': mean_time_to_detection,
                'n_trials': n
            })

        self.results_df = pd.DataFrame(results)

    def _print_summary_table(self) -> None:
        """Print detection rate results table."""
        self.print_section("DETECTION RATE RESULTS")
        print(f"{'Method':<18} {'Rate':<8} {'Expected':<10} {'95% CI':<20} "
              f"{'Mean Tests':<12} {'Median':<10} {'N':<6}")
        self.print_divider(width=100)

        for _, row in self.results_df.iterrows():
            ci_str = format_ci(row['ci_lower'], row['ci_upper'])
            expected_str = f"{row['expected_rate']:.3f}" if pd.notna(row['expected_rate']) else "adaptive"
            print(f"{row['method']:<18} "
                  f"{row['detection_rate']:<8.3f} "
                  f"{expected_str:<10} "
                  f"{ci_str:<20} "
                  f"{row['mean_tests']:<12.1f} "
                  f"{row['median_tests']:<10.0f} "
                  f"{int(row['n_trials']):<6}")
        self.print_divider(width=100)

    def _create_detection_chart(self) -> None:
        """Create detection rate bar chart."""
        fig, ax = plt.subplots(figsize=(12, 7))

        x_pos = np.arange(len(self.results_df))

        colors = []
        for method in self.results_df['method']:
            if method.startswith('fixed_'):
                colors.append('#ff7f0e')
            else:
                colors.append('#2ca02c')

        ax.bar(
            x_pos,
            self.results_df['detection_rate'],
            yerr=[
                self.results_df['detection_rate'] - self.results_df['ci_lower'],
                self.results_df['ci_upper'] - self.results_df['detection_rate']
            ],
            capsize=5,
            alpha=0.7,
            edgecolor='black',
            color=colors
        )

        for i, (_, row) in enumerate(self.results_df.iterrows()):
            if pd.notna(row['expected_rate']):
                ax.scatter([i], [row['expected_rate']], marker='_', s=200,
                          color='red', zorder=5, linewidth=3)

        ax.set_xlabel('Method', fontsize=12)
        ax.set_ylabel('Detection Rate', fontsize=12)
        ax.set_title(f'Bug Detection Rate by Method\n(Bug rate: {self.bug_rate*100:.1f}% = 1 in {int(1/self.bug_rate)}, 95% CI)',
                    fontsize=14)
        ax.set_xticks(x_pos)
        ax.set_xticklabels([m.replace('_', '\n') for m in self.results_df['method']], fontsize=10)
        ax.set_ylim(0, 1.05)
        ax.grid(True, axis='y', alpha=0.3)

        legend_elements = [
            mpatches.Patch(facecolor='#ff7f0e', alpha=0.7, label='Fixed N'),
            mpatches.Patch(facecolor='#2ca02c', alpha=0.7, label='Confidence-based'),
            Line2D([0], [0], marker='_', color='red', linestyle='None',
                   markersize=15, markeredgewidth=3, label='Expected (fixed)')
        ]
        ax.legend(handles=legend_elements, loc='upper left', fontsize=10)

        save_figure(fig, self.get_output_path("detection_rates.png"))

    def _create_ecdf_chart(self) -> None:
        """Create ECDF of tests-to-termination."""
        fig, ax = plt.subplots(figsize=(12, 7))

        method_styles = {
            'fixed_50': {'color': '#c6dbef', 'linestyle': '-', 'linewidth': 2},
            'fixed_100': {'color': '#9ecae1', 'linestyle': '-', 'linewidth': 2},
            'fixed_200': {'color': '#6baed6', 'linestyle': '-', 'linewidth': 2},
            'fixed_500': {'color': '#3182bd', 'linestyle': '-', 'linewidth': 2},
            'fixed_1000': {'color': '#08519c', 'linestyle': '-', 'linewidth': 2},
            'confidence_0.80': {'color': '#fcbba1', 'linestyle': '-', 'linewidth': 2},
            'confidence_0.90': {'color': '#fc9272', 'linestyle': '-', 'linewidth': 2},
            'confidence_0.95': {'color': '#fb6a4a', 'linestyle': '-', 'linewidth': 2},
            'confidence_0.99': {'color': '#de2d26', 'linestyle': '-', 'linewidth': 2},
        }

        for method in self.methods:
            group = self.df[self.df['method'] == method]
            style = method_styles.get(method, {'color': 'gray', 'linestyle': '-', 'linewidth': 2})

            sns.ecdfplot(
                data=group,
                x='tests_run',
                ax=ax,
                label=method.replace('_', ' '),
                **style
            )

        ax.set_xlabel('Tests Run Until Termination', fontsize=12)
        ax.set_ylabel('Cumulative Proportion of Trials', fontsize=12)
        ax.set_title('Termination Speed: Cumulative Distribution by Method\n'
                     '(Higher/left = faster termination)', fontsize=14)
        ax.legend(loc='lower right', fontsize=9, title='Method')
        ax.grid(True, alpha=0.3)
        ax.set_xlim(left=0)

        save_figure(fig, self.get_output_path("detection_ecdf.png"))

    def _print_insights(self) -> None:
        """Print key insights from the analysis."""
        self.print_section("KEY INSIGHTS")

        best = self.results_df.loc[self.results_df['detection_rate'].idxmax()]
        worst = self.results_df.loc[self.results_df['detection_rate'].idxmin()]

        print(f"  Best detection: {best['method']} ({best['detection_rate']*100:.1f}%)")
        print(f"  Worst detection: {worst['method']} ({worst['detection_rate']*100:.1f}%)")

        if worst['detection_rate'] > 0:
            improvement = best['detection_rate'] / worst['detection_rate']
            print(f"  Improvement factor: {improvement:.1f}x")

        fixed_methods = self.results_df[self.results_df['method'].str.startswith('fixed_')]
        conf_methods = self.results_df[self.results_df['method'].str.startswith('confidence_')]

        if len(fixed_methods) > 0 and len(conf_methods) > 0:
            best_fixed = fixed_methods.loc[fixed_methods['detection_rate'].idxmax()]
            best_conf = conf_methods.loc[conf_methods['detection_rate'].idxmax()]

            print(f"\nFixed vs Confidence comparison:")
            print(f"  Best fixed ({best_fixed['method']}): {best_fixed['detection_rate']*100:.1f}% @ {best_fixed['mean_tests']:.0f} mean tests")
            print(f"  Best confidence ({best_conf['method']}): {best_conf['detection_rate']*100:.1f}% @ {best_conf['mean_tests']:.0f} mean tests")

            if best_fixed['mean_tests'] > 0 and best_conf['mean_tests'] > 0:
                fixed_efficiency = best_fixed['detection_rate'] / best_fixed['mean_tests'] * 100
                conf_efficiency = best_conf['detection_rate'] / best_conf['mean_tests'] * 100
                print(f"  Fixed efficiency: {fixed_efficiency:.4f}% detection per test")
                print(f"  Confidence efficiency: {conf_efficiency:.4f}% detection per test")

    def _run_hypothesis_tests(self) -> None:
        """Run statistical hypothesis tests."""
        self.print_section("STATISTICAL HYPOTHESIS TESTS")

        print("\nPairwise Chi-squared Tests (detection rate comparisons):")
        self.print_divider(width=100)
        cohens_label = "Cohen's h"
        print(f"{'Comparison':<35} {'Chi²':<10} {'p-value':<12} {'Significant':<12} {cohens_label:<12} {'Effect Size':<12}")
        self.print_divider(width=100)

        comparisons = [
            ('fixed_100', 'confidence_0.95'),
            ('fixed_500', 'confidence_0.99'),
            ('fixed_1000', 'confidence_0.99'),
            ('confidence_0.90', 'confidence_0.99'),
            ('fixed_100', 'fixed_500'),
        ]

        for method1, method2 in comparisons:
            row1 = self.results_df[self.results_df['method'] == method1]
            row2 = self.results_df[self.results_df['method'] == method2]

            if len(row1) == 0 or len(row2) == 0:
                continue

            row1 = row1.iloc[0]
            row2 = row2.iloc[0]

            g1 = self.df[self.df['method'] == method1]
            g2 = self.df[self.df['method'] == method2]

            n1, n2 = len(g1), len(g2)
            s1 = g1['bug_found'].sum()
            s2 = g2['bug_found'].sum()

            chi2_result = chi_squared_test(s1, n1, s2, n2)

            p1, p2 = row1['detection_rate'], row2['detection_rate']
            h = cohens_h(p1, p2)
            effect = effect_size_interpretation(h)

            sig_str = "Yes*" if chi2_result['significant'] else "No"

            print(f"{method1} vs {method2:<15} "
                  f"{chi2_result['chi2']:<10.3f} "
                  f"{chi2_result['p_value']:<12.4f} "
                  f"{sig_str:<12} "
                  f"{h:<12.3f} "
                  f"{effect:<12}")

        self.print_divider(width=100)
        print("* Significant at α = 0.05 (with Yates continuity correction)")

        self._print_odds_ratios(comparisons)
        self._print_power_analysis()

    def _print_odds_ratios(self, comparisons) -> None:
        """Print odds ratios for comparisons."""
        print("\nOdds Ratios (for detection success):")
        self.print_divider(width=80)
        print(f"{'Comparison':<35} {'OR':<10} {'95% CI':<25} {'Interpretation':<20}")
        self.print_divider(width=80)

        for method1, method2 in comparisons:
            row1 = self.results_df[self.results_df['method'] == method1]
            row2 = self.results_df[self.results_df['method'] == method2]

            if len(row1) == 0 or len(row2) == 0:
                continue

            g1 = self.df[self.df['method'] == method1]
            g2 = self.df[self.df['method'] == method2]

            n1, n2 = len(g1), len(g2)
            s1 = g1['bug_found'].sum()
            s2 = g2['bug_found'].sum()

            or_result = odds_ratio(s1, n1, s2, n2)

            ci_str = f"[{or_result['ci_lower']:.2f}, {or_result['ci_upper']:.2f}]"

            if or_result['odds_ratio'] > 1:
                interp = f"{method1} has higher odds"
            elif or_result['odds_ratio'] < 1:
                interp = f"{method2} has higher odds"
            else:
                interp = "No difference"

            print(f"{method1} vs {method2:<15} "
                  f"{or_result['odds_ratio']:<10.2f} "
                  f"{ci_str:<25} "
                  f"{interp:<20}")

        self.print_divider(width=80)

    def _print_power_analysis(self) -> None:
        """Print power analysis."""
        print("\nPower Analysis:")
        self.print_divider(width=60)

        if 'fixed_500' in self.results_df['method'].values and 'confidence_0.99' in self.results_df['method'].values:
            p1 = self.results_df[self.results_df['method'] == 'fixed_500']['detection_rate'].iloc[0]
            p2 = self.results_df[self.results_df['method'] == 'confidence_0.99']['detection_rate'].iloc[0]

            h = abs(cohens_h(p1, p2))
            actual_n = len(self.df[self.df['method'] == 'fixed_500'])
            required_n = power_analysis_proportion(p1, p2, alpha=0.05, power=0.80)

            print(f"  Comparing fixed_500 ({p1*100:.1f}%) vs confidence_0.99 ({p2*100:.1f}%)")
            print(f"  Effect size (Cohen's h): {h:.3f} ({effect_size_interpretation(h)})")
            print(f"  Actual sample size per group: {actual_n}")
            print(f"  Required sample size for 80% power: {required_n}")

            if actual_n >= required_n:
                print(f"  -> Adequately powered to detect this effect size")
            else:
                print(f"  -> Underpowered: need {required_n - actual_n} more samples per group")

        self.print_divider(width=60)

    def _print_roi_analysis(self) -> None:
        """Print performance ROI analysis."""
        self.print_section("PERFORMANCE ROI ANALYSIS")

        print("\nTime Investment by Method:")
        self.print_divider(width=100)
        print(f"{'Method':<18} {'Mean Time (ms)':<16} {'Time/Test (µs)':<16} {'Detection Rate':<16} {'ROI*':<16}")
        self.print_divider(width=100)

        for _, row in self.results_df.iterrows():
            roi = (row['detection_rate'] / row['mean_time_ms'] * 1000) if row['mean_time_ms'] > 0 else 0
            print(f"{row['method']:<18} "
                  f"{row['mean_time_ms']:<16.2f} "
                  f"{row['time_per_test']:<16.1f} "
                  f"{row['detection_rate']*100:<15.1f}% "
                  f"{roi:<16.4f}")

        self.print_divider(width=100)
        print("* ROI = (detection_rate / time_ms) x 1000 = bugs found per second of testing")

        self._print_time_to_detection()
        self._print_cost_benefit()

    def _print_time_to_detection(self) -> None:
        """Print time to first detection statistics."""
        print("\nTime to First Detection (when bug found):")
        self.print_divider(width=80)
        print(f"{'Method':<18} {'Mean Time (ms)':<20} {'Median Time (µs)':<20}")
        self.print_divider(width=80)

        for _, row in self.results_df.iterrows():
            if not np.isnan(row['mean_time_to_detection']):
                print(f"{row['method']:<18} "
                      f"{row['mean_time_to_detection']:<20.2f} "
                      f"{row['median_time_micros']:<20.0f}")
            else:
                print(f"{row['method']:<18} {'N/A':<20} {'N/A':<20}")

        self.print_divider(width=80)

    def _print_cost_benefit(self) -> None:
        """Print cost-benefit analysis."""
        print("\nCost-Benefit Analysis:")
        self.print_divider(width=80)

        fixed_methods = self.results_df[self.results_df['method'].str.startswith('fixed_')]
        conf_methods = self.results_df[self.results_df['method'].str.startswith('confidence_')]

        if len(fixed_methods) > 0 and len(conf_methods) > 0:
            best_fixed = fixed_methods.loc[fixed_methods['detection_rate'].idxmax()]
            best_conf = conf_methods.loc[conf_methods['detection_rate'].idxmax()]

            print(f"\nBest Fixed Method ({best_fixed['method']}):")
            print(f"  Detection rate: {best_fixed['detection_rate']*100:.1f}%")
            print(f"  Mean time: {best_fixed['mean_time_ms']:.2f} ms")
            print(f"  Time per test: {best_fixed['time_per_test']:.1f} µs")
            print(f"  ROI: {(best_fixed['detection_rate'] / best_fixed['mean_time_ms'] * 1000):.4f} bugs/sec")

            print(f"\nBest Confidence Method ({best_conf['method']}):")
            print(f"  Detection rate: {best_conf['detection_rate']*100:.1f}%")
            print(f"  Mean time: {best_conf['mean_time_ms']:.2f} ms")
            print(f"  Time per test: {best_conf['time_per_test']:.1f} µs")
            print(f"  ROI: {(best_conf['detection_rate'] / best_conf['mean_time_ms'] * 1000):.4f} bugs/sec")

            time_diff = best_fixed['mean_time_ms'] - best_conf['mean_time_ms']
            detection_diff = (best_fixed['detection_rate'] - best_conf['detection_rate']) * 100

            print(f"\nTrade-off:")
            if time_diff > 0:
                print(f"  {best_fixed['method']} takes {time_diff:.2f} ms MORE ({(time_diff/best_conf['mean_time_ms']*100):.1f}%)")
            else:
                print(f"  {best_fixed['method']} takes {abs(time_diff):.2f} ms LESS ({(abs(time_diff)/best_fixed['mean_time_ms']*100):.1f}%)")

            print(f"  {best_fixed['method']} detects {detection_diff:.1f}% MORE bugs")

            if best_fixed['detection_rate'] > 0:
                cost_per_bug_fixed = best_fixed['mean_time_ms'] / best_fixed['detection_rate']
                print(f"  Cost per bug (fixed): {cost_per_bug_fixed:.2f} ms")

            if best_conf['detection_rate'] > 0:
                cost_per_bug_conf = best_conf['mean_time_ms'] / best_conf['detection_rate']
                print(f"  Cost per bug (confidence): {cost_per_bug_conf:.2f} ms")

                if best_fixed['detection_rate'] > 0:
                    efficiency_ratio = cost_per_bug_fixed / cost_per_bug_conf
                    if efficiency_ratio > 1:
                        print(f"  -> Confidence is {efficiency_ratio:.2f}x MORE time-efficient per bug")
                    else:
                        print(f"  -> Fixed is {1/efficiency_ratio:.2f}x MORE time-efficient per bug")

        self.results_df['roi'] = (self.results_df['detection_rate'] / self.results_df['mean_time_ms'] * 1000)
        best_roi = self.results_df.loc[self.results_df['roi'].idxmax()]

        print(f"\nMost Time-Efficient Method:")
        print(f"  {best_roi['method']}: {best_roi['roi']:.4f} bugs/sec")
        print(f"  Detection: {best_roi['detection_rate']*100:.1f}% in {best_roi['mean_time_ms']:.2f} ms")

        self.print_divider(width=80)

    def _print_conclusion(self) -> None:
        """Print conclusion."""
        self.print_section("CONCLUSION")
        print(f"  {self.check_mark} Detection rate analysis complete")


def main():
    analysis = DetectionAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
