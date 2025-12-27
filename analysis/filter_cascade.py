#!/usr/bin/env python3
"""
Filter Cascade Impact Analysis: Does size estimation degrade with filter depth?

Analyzes the accuracy of size estimation when filters are chained, and whether
credible intervals maintain proper coverage as chain depth increases.

Metrics:
- Relative error: (estimated - actual) / actual
- Credible interval coverage rate (target: 95%)
- Error accumulation pattern vs chain depth

Generates:
- filter-cascade.png: Estimation error and CI coverage analysis (Legacy vs Fixed)
"""

import matplotlib.pyplot as plt
import numpy as np

from base import AnalysisBase
from stats import wilson_score_interval
from viz import save_figure


class FilterCascadeAnalysis(AnalysisBase):
    """Analysis of filter cascade impact on size estimation."""

    @property
    def name(self) -> str:
        return "Filter Cascade Impact Analysis"

    @property
    def csv_filename(self) -> str:
        return "filter-cascade.csv"

    def analyze(self) -> None:
        """Perform the filter cascade analysis."""
        self._compute_statistics()
        self._create_visualization()
        self._print_conclusion()

    def _compute_statistics(self) -> None:
        """Compute error and coverage statistics."""
        # Filter to 50% pass rate for the main comparison (worst case)
        self.target_pass_rate = 0.5
        self.print_section(f"ANALYSIS (PASS RATE = {self.target_pass_rate*100:.0f}%)")

        self.stats = []

        for impl in ['legacy', 'fixed']:
            print(f"\nImplementation: {impl}")
            self.print_divider(width=40)

            for depth in [1, 2, 3, 5]:
                data = self.df[
                    (self.df['chain_depth'] == depth) &
                    (self.df['filter_pass_rate'] == self.target_pass_rate) &
                    (self.df['implementation'] == impl)
                ]

                if len(data) == 0:
                    continue

                # Error stats
                errors = data['relative_error']
                mean_error = errors.mean()
                std_error = errors.std()

                # Coverage stats
                coverage_count = data['true_value_in_ci'].sum()
                total = len(data)
                coverage_rate = coverage_count / total
                ci = wilson_score_interval(coverage_count, total)

                print(f"  Depth {depth}: Error={mean_error*100:+.0f}% (std={std_error*100:.0f}%), CI Coverage={coverage_rate*100:.1f}%")

                self.stats.append({
                    'implementation': impl,
                    'depth': depth,
                    'mean_error': mean_error,
                    'std_error': std_error,
                    'coverage_rate': coverage_rate,
                    'ci_lower': ci[0],
                    'ci_upper': ci[1]
                })

    def _create_visualization(self) -> None:
        """Create filter cascade visualization."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        self._create_error_chart(axes[0])
        self._create_coverage_chart(axes[1])

        save_figure(fig, self.get_output_path("filter-cascade.png"))

    def _create_error_chart(self, ax) -> None:
        """Create relative error chart."""
        colors = {'legacy': '#e74c3c', 'fixed': '#2ecc71'}
        labels = {'legacy': 'Legacy (No Warm-up)', 'fixed': 'Fixed (Warm-up)'}
        markers = {'legacy': 'x', 'fixed': 'o'}
        linestyles = {'legacy': '--', 'fixed': '-'}

        for impl in ['legacy', 'fixed']:
            impl_stats = [s for s in self.stats if s['implementation'] == impl]
            if not impl_stats:
                continue

            depths = [s['depth'] for s in impl_stats]
            mean_errors = [s['mean_error'] * 100 for s in impl_stats]
            std_errors = [s['std_error'] * 100 for s in impl_stats]

            ax.plot(depths, mean_errors, marker=markers[impl], label=labels[impl],
                    color=colors[impl], linestyle=linestyles[impl], linewidth=2)
            ax.fill_between(depths,
                            [m - s for m, s in zip(mean_errors, std_errors)],
                            [m + s for m, s in zip(mean_errors, std_errors)],
                            alpha=0.1, color=colors[impl])

        ax.axhline(y=0, color='black', linestyle='-', alpha=0.3, linewidth=1)
        ax.set_xlabel('Chain Depth (number of filters)')
        ax.set_ylabel('Relative Estimation Error (%)')
        ax.set_title(f'Size Estimation Error (Pass Rate {self.target_pass_rate*100:.0f}%)')
        ax.set_xticks([1, 2, 3, 5])
        ax.legend()
        ax.grid(True, alpha=0.3)

    def _create_coverage_chart(self, ax) -> None:
        """Create CI coverage chart."""
        colors = {'legacy': '#e74c3c', 'fixed': '#2ecc71'}
        labels = {'legacy': 'Legacy (No Warm-up)', 'fixed': 'Fixed (Warm-up)'}

        width = 0.35
        depths = np.array([1, 2, 3, 5])

        for i, impl in enumerate(['legacy', 'fixed']):
            impl_stats = [s for s in self.stats if s['implementation'] == impl]
            if not impl_stats:
                continue

            # Ensure alignment
            impl_depths = [s['depth'] for s in impl_stats]
            if impl_depths != list(depths):
                continue

            rates = [s['coverage_rate'] * 100 for s in impl_stats]

            # Offset bars
            x_pos = depths - width/2 + i*width

            ax.bar(x_pos, rates, width, label=labels[impl], color=colors[impl], alpha=0.8)

        ax.axhline(y=95, color='black', linestyle='--', alpha=0.5, linewidth=2, label='Target (95%)')
        ax.set_xlabel('Chain Depth')
        ax.set_ylabel('CI Coverage (%)')
        ax.set_title(f'Credible Interval Validity (Pass Rate {self.target_pass_rate*100:.0f}%)')
        ax.set_xticks(depths)
        ax.set_ylim(0, 105)
        ax.legend()
        ax.grid(True, axis='y', alpha=0.3)

    def _print_conclusion(self) -> None:
        """Print conclusion."""
        self.print_section("CONCLUSION (DEPTH 5)")

        legacy_d5 = next((s for s in self.stats if s['implementation'] == 'legacy' and s['depth'] == 5), None)
        fixed_d5 = next((s for s in self.stats if s['implementation'] == 'fixed' and s['depth'] == 5), None)

        if legacy_d5 and fixed_d5:
            legacy_err = legacy_d5['mean_error'] * 100
            fixed_err = fixed_d5['mean_error'] * 100
            reduction = legacy_err / fixed_err if fixed_err != 0 else 0

            print(f"  Legacy Error: {legacy_err:+.1f}%")
            print(f"  Fixed Error:  {fixed_err:+.1f}%")
            print(f"  Improvement:  Error reduced by factor of ~{reduction:.1f}x")

        print(f"\n  {self.check_mark} Filter cascade analysis complete")


def main():
    analysis = FilterCascadeAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
