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
from constants import ARBITRARY_TYPE_LABELS, ARBITRARY_COLORS


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
        print("H_0: Deduplication sampler and random sampler provide equivalent unique value coverage.")
        print("H_1: Deduplication significantly improves unique value coverage for surjective or filtered mappings.\n")

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

            color = ARBITRARY_COLORS[arb_type]
            label_base = ARBITRARY_TYPE_LABELS[arb_type]

            ax.plot(requested_counts, dedup_ratios, marker='o',
                    label=f'{label_base} (dedup)',
                    color=color, linewidth=2, linestyle='-')
            ax.plot(requested_counts, random_ratios, marker='s',
                    label=f'{label_base} (random)',
                    color=color, linewidth=2, linestyle='--', alpha=0.6)

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

        trigger_rates = [next(s['trigger_rate'] for s in self.guard_stats if s['arb_type'] == at) * 100
                         for at in arb_types]
        
        ax.bar(np.arange(len(arb_types)), trigger_rates, 
               color=[ARBITRARY_COLORS[at] for at in arb_types], alpha=0.8)
        
        ax.set_xlabel('Arbitrary Type')
        ax.set_ylabel('Termination Guard Trigger Rate (%)')
        ax.set_title('Termination Guard Frequency')
        ax.set_xticks(np.arange(len(arb_types)))
        ax.set_xticklabels([ARBITRARY_TYPE_LABELS[at] for at in arb_types], rotation=15, ha='right')
        ax.set_ylim(0, 105)
        ax.grid(True, axis='y', alpha=0.3)

    def _print_conclusion(self) -> None:
        """Print conclusion with scientific rigor."""
        self.print_section("SCIENTIFIC CONCLUSION")

        from scipy.stats import ttest_ind
        
        # Test for non-injective
        dedup_data = self.df[(self.df['arbitrary_type'] == 'non_injective') & (self.df['sampler_type'] == 'deduping')]['unique_ratio']
        rand_data = self.df[(self.df['arbitrary_type'] == 'non_injective') & (self.df['sampler_type'] == 'random')]['unique_ratio']
        
        stat, p_val = ttest_ind(dedup_data, rand_data)
        
        if p_val < 0.05:
            print(f"  {self.check_mark} We reject the null hypothesis H_0 (p={p_val:.4e}).")
            print("    Deduplication provides statistically significant improvements in unique value coverage.")
        else:
            print(f"  ✗ We fail to reject the null hypothesis H_0 (p={p_val:.4f}).")
            print("    No significant coverage improvement was observed compared to the random baseline.")

        print(f"\n  {self.check_mark} Deduplication analysis complete")


def main():
    analysis = DeduplicationAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()