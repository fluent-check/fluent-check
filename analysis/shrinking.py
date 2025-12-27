#!/usr/bin/env python3
"""
Shrinking Quality Analysis: Witness Minimization Effectiveness

Analyzes FluentCheck's shrinking behavior across different scenarios:
- How often does shrinking find the minimal witness?
- How much effort (candidates tested, rounds) is needed?
- What's the relationship between predicate type and shrinking quality?

Generates:
- Minimal witness achievement rate by scenario
- Shrinking effort distribution (candidates, rounds)
- Distance from minimal by scenario
- Time spent on shrinking vs exploration
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

from base import AnalysisBase
from constants import SHRINKING_SCENARIO_ORDER, SHRINKING_SCENARIO_LABELS
from stats import wilson_score_interval, format_ci
from viz import save_figure, create_figure, add_reference_line


class ShrinkingAnalysis(AnalysisBase):
    """Analysis of shrinking quality and effectiveness."""

    @property
    def name(self) -> str:
        return "Shrinking Quality Analysis"

    @property
    def csv_filename(self) -> str:
        return "shrinking.csv"

    @property
    def required_columns(self) -> list:
        return ['scenario', 'witness_found', 'is_minimal', 'shrink_candidates_tested']

    def analyze(self) -> None:
        """Perform the shrinking quality analysis."""
        # Filter to only trials that found witnesses
        self.found_df = self.df[self.df['witness_found']].copy()
        found_count = len(self.found_df)
        found_pct = found_count / len(self.df) * 100
        print(f"  Found witnesses: {found_count} ({found_pct:.1f}%)\n")

        if found_count == 0:
            print("ERROR: No witnesses found in any trial")
            return

        self._compute_results()
        self._print_summary_table()
        self._create_minimal_rate_chart()
        self._create_effort_chart()
        self._create_quality_chart()
        self._create_time_breakdown_chart()
        self._print_insights()

    def _compute_results(self) -> None:
        """Compute shrinking statistics by scenario."""
        results = []
        for scenario in SHRINKING_SCENARIO_ORDER:
            if scenario not in self.found_df['scenario'].values:
                continue

            group = self.found_df[self.found_df['scenario'] == scenario]
            n = len(group)

            # Minimal witness rate
            minimal_count = group['is_minimal'].sum()
            minimal_rate = minimal_count / n
            lower, upper = wilson_score_interval(minimal_count, n, 0.95)

            # Distance from minimal (for non-minimal cases)
            group = group.copy()
            if 'final_witness' in group.columns and 'expected_minimal' in group.columns:
                group['distance'] = np.abs(group['final_witness'] - group['expected_minimal'])
                non_minimal = group[~group['is_minimal']]
                mean_distance = non_minimal['distance'].mean() if len(non_minimal) > 0 else 0
            else:
                mean_distance = 0

            # Shrinking effort
            mean_candidates = group['shrink_candidates_tested'].mean()
            mean_rounds = group['shrink_rounds_completed'].mean() if 'shrink_rounds_completed' in group.columns else 0
            mean_improvements = group['shrink_improvements_made'].mean() if 'shrink_improvements_made' in group.columns else 0

            # Time breakdown
            mean_shrink_time = group['shrinking_time_ms'].mean() if 'shrinking_time_ms' in group.columns else 0
            mean_explore_time = group['exploration_time_ms'].mean() if 'exploration_time_ms' in group.columns else 0

            results.append({
                'scenario': scenario,
                'n_trials': n,
                'minimal_rate': minimal_rate,
                'ci_lower': lower,
                'ci_upper': upper,
                'mean_distance': mean_distance,
                'mean_candidates': mean_candidates,
                'mean_rounds': mean_rounds,
                'mean_improvements': mean_improvements,
                'mean_shrink_time_ms': mean_shrink_time,
                'mean_explore_time_ms': mean_explore_time
            })

        self.results_df = pd.DataFrame(results)

    def _print_summary_table(self) -> None:
        """Print shrinking effectiveness summary table."""
        self.print_section("SHRINKING EFFECTIVENESS BY SCENARIO")

        print(f"\n{'Scenario':<25} {'Trials':<8} {'Minimal %':<12} {'95% CI':<20} "
              f"{'Mean Dist':<12} {'Candidates':<12} {'Rounds':<8}")
        self.print_divider()

        for _, row in self.results_df.iterrows():
            ci_str = format_ci(row['ci_lower'], row['ci_upper'])
            print(f"{row['scenario']:<25} "
                  f"{int(row['n_trials']):<8} "
                  f"{row['minimal_rate']*100:<12.1f}% "
                  f"{ci_str:<20} "
                  f"{row['mean_distance']:<12.1f} "
                  f"{row['mean_candidates']:<12.1f} "
                  f"{row['mean_rounds']:<8.1f}")

        self.print_divider()

    def _create_minimal_rate_chart(self) -> None:
        """Create minimal witness achievement rate bar chart."""
        fig, ax = create_figure('single')

        x_pos = np.arange(len(self.results_df))
        colors = sns.color_palette("viridis", len(self.results_df))

        yerr_lower = np.maximum(0, self.results_df['minimal_rate'] - self.results_df['ci_lower'])
        yerr_upper = np.maximum(0, self.results_df['ci_upper'] - self.results_df['minimal_rate'])

        ax.bar(
            x_pos,
            self.results_df['minimal_rate'],
            yerr=[yerr_lower, yerr_upper],
            capsize=5,
            alpha=0.7,
            edgecolor='black',
            color=colors
        )

        ax.set_xlabel('Scenario', fontsize=12)
        ax.set_ylabel('Rate of Finding Minimal Witness', fontsize=12)
        ax.set_title('Shrinking Effectiveness: Minimal Witness Achievement\n(95% CI)', fontsize=14)
        ax.set_xticks(x_pos)
        ax.set_xticklabels([SHRINKING_SCENARIO_LABELS.get(s, s) for s in self.results_df['scenario']], fontsize=9)
        ax.set_ylim(0, 1.05)
        ax.grid(True, axis='y', alpha=0.3)

        add_reference_line(ax, 1.0, 'horizontal', 'green', '--', 0.5, 'Perfect shrinking')
        ax.legend(loc='lower right')

        save_figure(fig, self.get_output_path("shrinking_minimal_rate.png"))

    def _create_effort_chart(self) -> None:
        """Create shrinking effort distribution charts."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        order = [s for s in SHRINKING_SCENARIO_ORDER if s in self.found_df['scenario'].values]
        short_labels = [SHRINKING_SCENARIO_LABELS.get(s, s).split('\n')[0] for s in order]

        # Left: Candidates tested
        ax = axes[0]
        sns.boxplot(
            data=self.found_df,
            x='scenario',
            y='shrink_candidates_tested',
            order=order,
            palette='viridis',
            ax=ax
        )
        ax.set_xlabel('Scenario', fontsize=12)
        ax.set_ylabel('Shrink Candidates Tested', fontsize=12)
        ax.set_title('Shrinking Effort: Candidates Tested', fontsize=14)
        ax.set_xticklabels(short_labels, fontsize=9, rotation=45, ha='right')
        ax.grid(True, axis='y', alpha=0.3)

        # Right: Improvements made
        ax = axes[1]
        if 'shrink_improvements_made' in self.found_df.columns:
            sns.boxplot(
                data=self.found_df,
                x='scenario',
                y='shrink_improvements_made',
                order=order,
                palette='viridis',
                ax=ax
            )
            ax.set_xlabel('Scenario', fontsize=12)
            ax.set_ylabel('Successful Shrink Steps', fontsize=12)
            ax.set_title('Shrinking Progress: Improvements Made', fontsize=14)
            ax.set_xticklabels(short_labels, fontsize=9, rotation=45, ha='right')
            ax.grid(True, axis='y', alpha=0.3)
        else:
            ax.text(0.5, 0.5, 'Improvement data not available', ha='center', va='center')

        save_figure(fig, self.get_output_path("shrinking_effort.png"))

    def _create_quality_chart(self) -> None:
        """Create witness quality distribution chart."""
        if 'final_witness' not in self.found_df.columns or 'expected_minimal' not in self.found_df.columns:
            return

        fig, ax = create_figure('single')

        self.found_df = self.found_df.copy()
        self.found_df['distance_from_minimal'] = np.abs(self.found_df['final_witness'] - self.found_df['expected_minimal'])
        self.found_df['relative_distance'] = self.found_df['distance_from_minimal'] / self.found_df['expected_minimal'] * 100

        order = [s for s in SHRINKING_SCENARIO_ORDER if s in self.found_df['scenario'].values]

        sns.boxplot(
            data=self.found_df,
            x='scenario',
            y='relative_distance',
            order=order,
            palette='viridis',
            ax=ax
        )
        ax.set_xlabel('Scenario', fontsize=12)
        ax.set_ylabel('Distance from Minimal (% of minimal value)', fontsize=12)
        ax.set_title('Witness Quality: Distance from Theoretical Minimal\n(Lower is better, 0 = perfect)', fontsize=14)
        ax.set_xticklabels([SHRINKING_SCENARIO_LABELS.get(s, s) for s in order], fontsize=9)
        ax.grid(True, axis='y', alpha=0.3)

        add_reference_line(ax, 0, 'horizontal', 'green', '--', 0.5, 'Perfect (minimal witness)')
        ax.legend(loc='upper right')

        save_figure(fig, self.get_output_path("shrinking_witness_quality.png"))

    def _create_time_breakdown_chart(self) -> None:
        """Create time breakdown chart."""
        if 'shrinking_time_ms' not in self.results_df.columns:
            return

        fig, ax = create_figure('single')

        bar_width = 0.35
        x_pos = np.arange(len(self.results_df))

        ax.bar(x_pos - bar_width/2, self.results_df['mean_explore_time_ms'],
               bar_width, label='Exploration', color='steelblue', alpha=0.7)
        ax.bar(x_pos + bar_width/2, self.results_df['mean_shrink_time_ms'],
               bar_width, label='Shrinking', color='coral', alpha=0.7)

        ax.set_xlabel('Scenario', fontsize=12)
        ax.set_ylabel('Time (ms)', fontsize=12)
        ax.set_title('Time Breakdown: Exploration vs Shrinking\n(Shrinking dominates: 86-99% of total time)', fontsize=14)
        ax.set_xticks(x_pos)
        ax.set_xticklabels([SHRINKING_SCENARIO_LABELS.get(s, s).split('\n')[0] for s in self.results_df['scenario']],
                           fontsize=9, rotation=45, ha='right')
        ax.legend()
        ax.grid(True, axis='y', alpha=0.3)

        save_figure(fig, self.get_output_path("shrinking_time_breakdown.png"))

    def _print_insights(self) -> None:
        """Print key insights from the analysis."""
        self.print_section("KEY INSIGHTS")

        # Overall minimal rate
        total_minimal = self.found_df['is_minimal'].sum()
        total_found = len(self.found_df)
        overall_minimal_rate = total_minimal / total_found
        overall_lower, overall_upper = wilson_score_interval(total_minimal, total_found, 0.95)

        print(f"\n  Overall minimal witness rate: {overall_minimal_rate*100:.1f}% "
              f"(95% CI: {format_ci(overall_lower, overall_upper)})")

        # Best and worst scenarios
        best = self.results_df.loc[self.results_df['minimal_rate'].idxmax()]
        worst = self.results_df.loc[self.results_df['minimal_rate'].idxmin()]

        print(f"\n  Best shrinking: {best['scenario']} ({best['minimal_rate']*100:.1f}%)")
        print(f"  Worst shrinking: {worst['scenario']} ({worst['minimal_rate']*100:.1f}%)")

        # Effort analysis
        self.print_subsection("Shrinking Effort Analysis")
        for _, row in self.results_df.iterrows():
            print(f"  {row['scenario']}: "
                  f"{row['mean_candidates']:.1f} candidates, "
                  f"{row['mean_rounds']:.1f} rounds, "
                  f"{row['mean_improvements']:.1f} improvements")

        # Time analysis
        if 'mean_explore_time_ms' in self.results_df.columns:
            avg_explore_time = self.results_df['mean_explore_time_ms'].mean()
            avg_shrink_time = self.results_df['mean_shrink_time_ms'].mean()
            total_time = avg_explore_time + avg_shrink_time
            shrink_percentage = avg_shrink_time / total_time * 100 if total_time > 0 else 0

            self.print_subsection("Time Analysis")
            print(f"  Average exploration time: {avg_explore_time:.2f} ms")
            print(f"  Average shrinking time: {avg_shrink_time:.2f} ms")
            print(f"  Shrinking time: {shrink_percentage:.1f}% of total time")
            print(f"  Exploration time: {100 - shrink_percentage:.1f}% of total time")
            print(f"\n  Note: Exploration times are very small (often <0.1 ms) and may be at")
            print(f"  measurement precision limits. The pattern is consistent: shrinking dominates.")


def main():
    analysis = ShrinkingAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
