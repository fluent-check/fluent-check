#!/usr/bin/env python3
"""
Mapped Arbitrary Size Analysis: Do non-bijective maps cause size overestimation?

Analyzes whether non-bijective mappings cause size overestimation and quantifies
the ratio of reported size to actual distinct values.

Metrics:
- Size ratio: reported_size / actual_distinct_values
- Comparison of Legacy (Naive) vs Fixed (Heuristic) estimation

Generates:
- mapped-size.png: Size ratio comparison (Legacy vs Fixed)
"""

import matplotlib.pyplot as plt
import numpy as np

from base import AnalysisBase
from viz import save_figure


class MappedSizeAnalysis(AnalysisBase):
    """Analysis of mapped arbitrary size estimation."""

    @property
    def name(self) -> str:
        return "Mapped Arbitrary Size Analysis"

    @property
    def csv_filename(self) -> str:
        return "mapped-size.csv"

    def analyze(self) -> None:
        """Perform the mapped size analysis."""
        self._compute_statistics()
        self._create_visualization()
        self._print_conclusion()

    def _compute_statistics(self) -> None:
        """Compute size ratio statistics."""
        self.print_section("SIZE RATIO BY IMPLEMENTATION")

        self.stats = []
        self.map_types = ['bijective', 'surjective_10to1', 'surjective_5to1']
        self.implementations = ['legacy', 'fixed']

        for impl in self.implementations:
            print(f"\nImplementation: {impl.upper()}")
            for map_type in self.map_types:
                data = self.df[(self.df['map_type'] == map_type) & (self.df['implementation'] == impl)]

                if len(data) == 0:
                    continue

                mean_ratio = data['size_ratio'].mean()
                std_ratio = data['size_ratio'].std()

                print(f"  {map_type:20s}: Mean Ratio={mean_ratio:5.2f} (std={std_ratio:.2f})")

                self.stats.append({
                    'implementation': impl,
                    'map_type': map_type,
                    'mean_ratio': mean_ratio,
                    'std_ratio': std_ratio
                })

    def _create_visualization(self) -> None:
        """Create mapped size visualization."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        self._create_ratio_chart(axes[0])
        self._create_union_chart(axes[1])

        save_figure(fig, self.get_output_path("mapped-size.png"))

    def _create_ratio_chart(self, ax) -> None:
        """Create size ratio comparison chart."""
        x = np.arange(len(self.map_types))
        width = 0.35

        # Plot Legacy
        legacy_means = [next((s['mean_ratio'] for s in self.stats if s['implementation'] == 'legacy' and s['map_type'] == mt), 0) for mt in self.map_types]
        legacy_errs = [next((s['std_ratio'] for s in self.stats if s['implementation'] == 'legacy' and s['map_type'] == mt), 0) for mt in self.map_types]

        ax.bar(x - width/2, legacy_means, width, label='Legacy (Naive)', color='#e74c3c', yerr=legacy_errs, capsize=5, alpha=0.8)

        # Plot Fixed
        fixed_means = [next((s['mean_ratio'] for s in self.stats if s['implementation'] == 'fixed' and s['map_type'] == mt), 0) for mt in self.map_types]
        fixed_errs = [next((s['std_ratio'] for s in self.stats if s['implementation'] == 'fixed' and s['map_type'] == mt), 0) for mt in self.map_types]

        ax.bar(x + width/2, fixed_means, width, label='Fixed (Heuristic)', color='#2ecc71', yerr=fixed_errs, capsize=5, alpha=0.8)

        ax.set_ylabel('Size Ratio (Reported / Actual)')
        ax.set_title('Size Overestimation Ratio')
        ax.set_xticks(x)
        ax.set_xticklabels([mt.replace('_', '\n') for mt in self.map_types])
        ax.legend()
        ax.grid(True, axis='y', alpha=0.3)

        # Add target line at 1.0 (Ideal)
        ax.axhline(y=1.0, color='black', linestyle='--', linewidth=1, label='Ideal (1.0)')

    def _create_union_chart(self, ax) -> None:
        """Create union fairness chart."""
        # Calculate derived weights
        legacy_ratio = next((s['mean_ratio'] for s in self.stats if s['implementation'] == 'legacy' and s['map_type'] == 'surjective_10to1'), 10.0)
        fixed_ratio = next((s['mean_ratio'] for s in self.stats if s['implementation'] == 'fixed' and s['map_type'] == 'surjective_10to1'), 1.0)

        # Assume distinct sizes: A=100, B=10
        distinct_a = 100
        distinct_b = 10

        # Legacy
        rep_b_legacy = distinct_b * legacy_ratio
        prob_a_legacy = distinct_a / (distinct_a + rep_b_legacy)

        # Fixed
        rep_b_fixed = distinct_b * fixed_ratio
        prob_a_fixed = distinct_a / (distinct_a + rep_b_fixed)

        # Ideal
        prob_a_ideal = distinct_a / (distinct_a + distinct_b)

        labels = ['Legacy', 'Fixed', 'Ideal']
        values = [prob_a_legacy * 100, prob_a_fixed * 100, prob_a_ideal * 100]
        colors = ['#e74c3c', '#2ecc71', 'gray']

        bars = ax.bar(labels, values, color=colors, alpha=0.8)
        ax.set_ylabel('Prob(Branch A) (%)')
        ax.set_title('Union Fairness Correction\n(Exact 100 vs Surjective 10:1)')
        ax.set_ylim(0, 100)
        ax.grid(True, axis='y', alpha=0.3)

        # Add value labels
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height + 1,
                    f'{height:.1f}%',
                    ha='center', va='bottom')

    def _print_conclusion(self) -> None:
        """Print conclusion."""
        self.print_section("CONCLUSION")

        surj_legacy_stat = next((s for s in self.stats if s['implementation'] == 'legacy' and s['map_type'] == 'surjective_10to1'), None)
        surj_fixed_stat = next((s for s in self.stats if s['implementation'] == 'fixed' and s['map_type'] == 'surjective_10to1'), None)

        if surj_legacy_stat and surj_fixed_stat:
            print(f"Surjective 10:1 Case:")
            print(f"  Legacy Ratio: {surj_legacy_stat['mean_ratio']:.2f}x overestimation")
            print(f"  Fixed Ratio:  {surj_fixed_stat['mean_ratio']:.2f}x (Ideal: 1.0)")

            improvement = abs(surj_legacy_stat['mean_ratio'] - 1) / abs(surj_fixed_stat['mean_ratio'] - 1) if abs(surj_fixed_stat['mean_ratio'] - 1) > 0 else 999
            print(f"  Accuracy Improved by factor of {improvement:.1f}x")

        print(f"\n  {self.check_mark} Mapped size analysis complete")


def main():
    analysis = MappedSizeAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
