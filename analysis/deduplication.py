#!/usr/bin/env python3
"""
Deduplication Efficiency Analysis: Does deduplication improve unique value coverage?

Analyzes the efficiency of deduplication in maximizing unique value coverage
and measures the overhead cost. Tests termination guard trigger rates.

Metrics:
- Unique/requested ratio: Proportion of requested samples that are unique
- Termination guard trigger rate: Proportion of trials hitting termination guard
- Time overhead: Ratio of deduping time to random time

Generates:
- deduplication.png: Unique coverage and termination guard analysis
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

from base import AnalysisBase
from stats import wilson_score_interval, format_ci
from viz import save_figure


class DeduplicationAnalysis(AnalysisBase):
    """Analysis of deduplication efficiency."""

    @property
    def name(self) -> str:
        return "Deduplication Efficiency Analysis"

    @property
    def csv_filename(self) -> str:
        return "deduplication.csv"

    def analyze(self) -> None:
        """Perform the deduplication analysis."""
        self.df['unique_ratio'] = self.df['unique_count'] / self.df['requested_count']
        self._compute_coverage_stats()
        self._compute_guard_stats()
        self._compute_time_stats()
        self._create_visualization()
        self._print_conclusion()

    def _compute_coverage_stats(self) -> None:
        """Compute unique coverage ratio statistics."""
        self.print_section("UNIQUE COVERAGE RATIO BY ARBITRARY TYPE x SAMPLER")

        self.coverage_stats = []
        for arb_type in ['exact', 'non_injective', 'filtered']:
            print(f"\n{arb_type.replace('_', ' ').title()}:")
            for sampler in ['deduping', 'random']:
                data = self.df[(self.df['arbitrary_type'] == arb_type) & (self.df['sampler_type'] == sampler)]

                mean_ratio = data['unique_ratio'].mean()
                median_ratio = data['unique_ratio'].median()
                std_ratio = data['unique_ratio'].std()

                print(f"  {sampler.capitalize():10s}: mean={mean_ratio:.3f}, median={median_ratio:.3f}, std={std_ratio:.3f}")

                self.coverage_stats.append({
                    'arb_type': arb_type,
                    'sampler': sampler,
                    'mean_ratio': mean_ratio,
                    'median_ratio': median_ratio,
                    'std_ratio': std_ratio,
                    'n': len(data)
                })

    def _compute_guard_stats(self) -> None:
        """Compute termination guard trigger rates."""
        self.print_section("TERMINATION GUARD TRIGGER RATES")

        self.guard_stats = []
        for arb_type in ['exact', 'non_injective', 'filtered']:
            data = self.df[(self.df['arbitrary_type'] == arb_type) & (self.df['sampler_type'] == 'deduping')]

            triggered = data['termination_guard_triggered'].sum()
            total = len(data)
            rate = triggered / total if total > 0 else 0
            ci = wilson_score_interval(triggered, total)

            print(f"{arb_type.replace('_', ' ').title():20s}: {rate*100:5.1f}% {format_ci(*ci)} ({triggered}/{total})")

            self.guard_stats.append({
                'arb_type': arb_type,
                'trigger_rate': rate,
                'ci_lower': ci[0],
                'ci_upper': ci[1],
                'triggered': triggered,
                'total': total
            })

    def _compute_time_stats(self) -> None:
        """Compute time overhead statistics."""
        self.print_section("TIME OVERHEAD (DEDUPING VS RANDOM)")

        self.time_stats = []
        for arb_type in ['exact', 'non_injective', 'filtered']:
            dedup_data = self.df[(self.df['arbitrary_type'] == arb_type) & (self.df['sampler_type'] == 'deduping')]
            random_data = self.df[(self.df['arbitrary_type'] == arb_type) & (self.df['sampler_type'] == 'random')]

            dedup_mean_time = dedup_data['elapsed_micros'].mean()
            random_mean_time = random_data['elapsed_micros'].mean()
            overhead_ratio = dedup_mean_time / random_mean_time if random_mean_time > 0 else 0

            print(f"{arb_type.replace('_', ' ').title():20s}: {overhead_ratio:.2f}x " +
                  f"({dedup_mean_time:.0f}µs vs {random_mean_time:.0f}µs)")

            self.time_stats.append({
                'arb_type': arb_type,
                'overhead_ratio': overhead_ratio,
                'dedup_mean': dedup_mean_time,
                'random_mean': random_mean_time
            })

    def _create_visualization(self) -> None:
        """Create deduplication visualization."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        self._create_coverage_chart(axes[0])
        self._create_guard_chart(axes[1])

        save_figure(fig, self.get_output_path("deduplication.png"))

    def _create_coverage_chart(self, ax) -> None:
        """Create unique coverage chart."""
        arb_types = ['exact', 'non_injective', 'filtered']
        arb_labels = {'exact': 'Exact (100 distinct)',
                      'non_injective': 'Non-injective (10 distinct)',
                      'filtered': 'Filtered (10 distinct)'}
        arb_colors = {'exact': '#2ecc71', 'non_injective': '#e74c3c', 'filtered': '#f39c12'}

        requested_counts = sorted(self.df['requested_count'].unique())

        for arb_type in arb_types:
            dedup_ratios = []
            random_ratios = []

            for req_count in requested_counts:
                dedup_data = self.df[(self.df['arbitrary_type'] == arb_type) &
                                     (self.df['sampler_type'] == 'deduping') &
                                     (self.df['requested_count'] == req_count)]
                random_data = self.df[(self.df['arbitrary_type'] == arb_type) &
                                      (self.df['sampler_type'] == 'random') &
                                      (self.df['requested_count'] == req_count)]

                dedup_ratios.append(dedup_data['unique_ratio'].mean())
                random_ratios.append(random_data['unique_ratio'].mean())

            ax.plot(requested_counts, dedup_ratios, marker='o',
                    label=f'{arb_labels[arb_type]} (dedup)',
                    color=arb_colors[arb_type], linewidth=2, linestyle='-')
            ax.plot(requested_counts, random_ratios, marker='s',
                    label=f'{arb_labels[arb_type]} (random)',
                    color=arb_colors[arb_type], linewidth=2, linestyle='--', alpha=0.6)

        ax.set_xlabel('Requested Sample Count')
        ax.set_ylabel('Unique Sample Ratio')
        ax.set_title('Deduplication Impact on Unique Coverage')
        ax.set_xscale('log')
        ax.set_ylim(0, 1.05)
        ax.legend(fontsize=8, loc='lower left')
        ax.grid(True, alpha=0.3)

    def _create_guard_chart(self, ax) -> None:
        """Create termination guard chart."""
        arb_types = ['exact', 'non_injective', 'filtered']
        arb_labels = {'exact': 'Exact (100 distinct)',
                      'non_injective': 'Non-injective (10 distinct)',
                      'filtered': 'Filtered (10 distinct)'}
        arb_colors = {'exact': '#2ecc71', 'non_injective': '#e74c3c', 'filtered': '#f39c12'}

        arb_type_labels = [arb_labels[at] for at in arb_types]
        trigger_rates = [next(s['trigger_rate'] for s in self.guard_stats if s['arb_type'] == at) * 100
                         for at in arb_types]
        trigger_errors = [
            (max(0, next(s for s in self.guard_stats if s['arb_type'] == at)['trigger_rate'] -
                 next(s for s in self.guard_stats if s['arb_type'] == at)['ci_lower']),
             max(0, next(s for s in self.guard_stats if s['arb_type'] == at)['ci_upper'] -
                 next(s for s in self.guard_stats if s['arb_type'] == at)['trigger_rate']))
            for at in arb_types
        ]
        trigger_errors_array = np.array(trigger_errors).T * 100

        x_pos = np.arange(len(arb_types))
        if np.any(trigger_errors_array > 0):
            ax.bar(x_pos, trigger_rates, yerr=trigger_errors_array, capsize=5,
                   color=[arb_colors[at] for at in arb_types], alpha=0.8)
        else:
            ax.bar(x_pos, trigger_rates, color=[arb_colors[at] for at in arb_types], alpha=0.8)
        ax.set_xlabel('Arbitrary Type')
        ax.set_ylabel('Termination Guard Trigger Rate (%)')
        ax.set_title('Termination Guard Frequency')
        ax.set_xticks(x_pos)
        ax.set_xticklabels(arb_type_labels, rotation=15, ha='right')
        ax.set_ylim(0, max(trigger_rates) * 1.2 if trigger_rates else 10)
        ax.grid(True, axis='y', alpha=0.3)

    def _print_conclusion(self) -> None:
        """Print conclusion."""
        self.print_section("CONCLUSION")

        non_inj_dedup = next(s for s in self.coverage_stats if s['arb_type'] == 'non_injective' and s['sampler'] == 'deduping')
        non_inj_random = next(s for s in self.coverage_stats if s['arb_type'] == 'non_injective' and s['sampler'] == 'random')
        filtered_dedup = next(s for s in self.coverage_stats if s['arb_type'] == 'filtered' and s['sampler'] == 'deduping')
        filtered_random = next(s for s in self.coverage_stats if s['arb_type'] == 'filtered' and s['sampler'] == 'random')

        print(f"  Deduplication Impact:")
        if non_inj_dedup['mean_ratio'] > non_inj_random['mean_ratio'] * 1.1:
            improvement = (non_inj_dedup['mean_ratio'] / non_inj_random['mean_ratio'] - 1) * 100
            print(f"    {self.check_mark} Non-injective: {improvement:.1f}% improvement in unique coverage")
        else:
            print(f"    - Non-injective: Minimal improvement")

        if filtered_dedup['mean_ratio'] > filtered_random['mean_ratio'] * 1.1:
            improvement = (filtered_dedup['mean_ratio'] / filtered_random['mean_ratio'] - 1) * 100
            print(f"    {self.check_mark} Filtered: {improvement:.1f}% improvement in unique coverage")
        else:
            print(f"    - Filtered: Minimal improvement")

        max_guard_rate = max(s['trigger_rate'] for s in self.guard_stats)
        if max_guard_rate > 0.10:
            print(f"\n  Warning: Termination guard frequently triggered:")
            for s in self.guard_stats:
                if s['trigger_rate'] > 0.10:
                    print(f"    - {s['arb_type']}: {s['trigger_rate']*100:.1f}% of trials")
        else:
            print(f"\n  {self.check_mark} Termination guard rarely triggered (max: {max_guard_rate*100:.1f}%)")

        avg_overhead = np.mean([s['overhead_ratio'] for s in self.time_stats])
        if avg_overhead > 2.0:
            print(f"\n  Warning: Significant time overhead: {avg_overhead:.1f}x average")
        else:
            print(f"\n  {self.check_mark} Acceptable time overhead: {avg_overhead:.1f}x average")

        print(f"\n  {self.check_mark} Deduplication analysis complete")


def main():
    analysis = DeduplicationAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
