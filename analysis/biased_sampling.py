#!/usr/bin/env python3
"""
Biased Sampling Impact Analysis: Does biased sampling improve bug detection?

Analyzes detection rates and efficiency of BiasedSampler vs RandomSampler
across different bug types. Tests the hypothesis that biased sampling
significantly improves detection of boundary bugs.

Metrics:
- Detection rate: Proportion of trials where bug was found
- Tests to detection: Number of tests needed when bug is found
- Effect size: Cohen's h for proportion differences

Generates:
- biased-sampling.png: Detection rates and tests to detection comparison
"""

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
from scipy.stats import fisher_exact

from base import AnalysisBase
from stats import wilson_score_interval, format_ci, chi_squared_test, cohens_h, effect_size_interpretation
from viz import save_figure
from constants import SAMPLER_COLORS


class BiasedSamplingAnalysis(AnalysisBase):
    """Analysis of biased sampling impact on bug detection."""

    @property
    def name(self) -> str:
        return "Biased Sampling Impact Analysis"

    @property
    def csv_filename(self) -> str:
        return "biased-sampling.csv"

    def analyze(self) -> None:
        """Perform the biased sampling analysis."""
        print("H_0: Biased and Random samplers have equivalent bug detection rates across all bug types.")
        print("H_1: Biased sampling significantly improves detection rates for boundary-related bugs.\n")

        self._compute_detection_rates()
        self._compute_tests_to_detection()
        self._create_visualization()
        self._print_conclusion()

    def _compute_detection_rates(self) -> None:
        """Compute detection rates with confidence intervals."""
        self.print_section("DETECTION RATES BY BUG TYPE x SAMPLER TYPE")

        self.results = []
        for bug_type in ['boundary_min', 'boundary_max', 'middle', 'random']:
            biased_data = self.df[(self.df['bug_type'] == bug_type) & (self.df['sampler_type'] == 'biased')]
            random_data = self.df[(self.df['bug_type'] == bug_type) & (self.df['sampler_type'] == 'random')]

            biased_detected = biased_data['bug_detected'].sum()
            biased_total = len(biased_data)
            random_detected = random_data['bug_detected'].sum()
            random_total = len(random_data)

            biased_rate = biased_detected / biased_total if biased_total > 0 else 0
            random_rate = random_detected / random_total if random_total > 0 else 0

            biased_ci = wilson_score_interval(biased_detected, biased_total)
            random_ci = wilson_score_interval(random_detected, random_total)

            # Handle edge case where one group has 100% or 0% detection
            if biased_rate == 1.0 or biased_rate == 0.0 or random_rate == 1.0 or random_rate == 0.0:
                table = [[biased_detected, biased_total - biased_detected],
                         [random_detected, random_total - random_detected]]
                _, p_value = fisher_exact(table)
                chi2_result = {'chi2': float('nan'), 'p_value': p_value, 'significant': p_value < 0.05}
            else:
                chi2_result = chi_squared_test(biased_detected, biased_total, random_detected, random_total)
            effect = cohens_h(biased_rate, random_rate)

            print(f"\n{bug_type.replace('_', ' ').title()}:")
            print(f"  Biased:  {biased_rate*100:5.1f}% {format_ci(*biased_ci)} (n={biased_total})")
            print(f"  Random:  {random_rate*100:5.1f}% {format_ci(*random_ci)} (n={random_total})")
            if np.isnan(chi2_result['chi2']):
                print(f"  Fisher's exact test: p = {chi2_result['p_value']:.4f} {'*' if chi2_result['significant'] else ''}")
            else:
                print(f"  chi2 = {chi2_result['chi2']:.2f}, p = {chi2_result['p_value']:.4f} {'*' if chi2_result['significant'] else ''}")
            print(f"  Cohen's h = {effect:.3f} ({effect_size_interpretation(effect)})")

            self.results.append({
                'bug_type': bug_type,
                'biased_rate': biased_rate,
                'biased_ci_lower': biased_ci[0],
                'biased_ci_upper': biased_ci[1],
                'random_rate': random_rate,
                'random_ci_lower': random_ci[0],
                'random_ci_upper': random_ci[1],
                'p_value': chi2_result['p_value'],
                'cohens_h': effect
            })

    def _compute_tests_to_detection(self) -> None:
        """Compute tests to detection statistics."""
        self.print_section("TESTS TO DETECTION (AMONG DETECTED BUGS)")

        detected_df = self.df[self.df['bug_detected'] == True].copy()

        for bug_type in ['boundary_min', 'boundary_max', 'middle', 'random']:
            biased_ttd = detected_df[(detected_df['bug_type'] == bug_type) &
                                     (detected_df['sampler_type'] == 'biased')]['tests_to_detection'].dropna()
            random_ttd = detected_df[(detected_df['bug_type'] == bug_type) &
                                     (detected_df['sampler_type'] == 'random')]['tests_to_detection'].dropna()

            if len(biased_ttd) > 0 and len(random_ttd) > 0:
                print(f"\n{bug_type.replace('_', ' ').title()}:")
                print(f"  Biased:  median={biased_ttd.median():.1f}, mean={biased_ttd.mean():.1f} (n={len(biased_ttd)})")
                print(f"  Random:  median={random_ttd.median():.1f}, mean={random_ttd.mean():.1f} (n={len(random_ttd)})")

    def _create_visualization(self) -> None:
        """Create biased sampling visualization."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        self._create_detection_chart(axes[0])
        self._create_tests_to_detection_chart(axes[1])

        save_figure(fig, self.get_output_path("biased-sampling.png"))

    def _create_detection_chart(self, ax) -> None:
        """Create detection rates bar chart."""
        bug_labels = ['Boundary\nMin', 'Boundary\nMax', 'Middle\nRange', 'Random\nValue']
        x = np.arange(len(bug_labels))
        width = 0.35

        biased_rates = [r['biased_rate'] for r in self.results]
        random_rates = [r['random_rate'] for r in self.results]
        biased_errors = [(r['biased_rate'] - r['biased_ci_lower'], r['biased_ci_upper'] - r['biased_rate'])
                         for r in self.results]
        random_errors = [(r['random_rate'] - r['random_ci_lower'], r['random_ci_upper'] - r['random_rate'])
                         for r in self.results]

        biased_errors_array = np.array(biased_errors).T
        random_errors_array = np.array(random_errors).T

        ax.bar(x - width/2, biased_rates, width, label='Biased Sampler',
               yerr=biased_errors_array, capsize=5, color=SAMPLER_COLORS['biased'], alpha=0.8)
        ax.bar(x + width/2, random_rates, width, label='Random Sampler',
               yerr=random_errors_array, capsize=5, color=SAMPLER_COLORS['random'], alpha=0.8)

        ax.set_xlabel('Bug Type')
        ax.set_ylabel('Detection Rate')
        ax.set_title('Detection Rate by Bug Type and Sampler')
        ax.set_xticks(x)
        ax.set_xticklabels(bug_labels)
        ax.set_ylim(0, 1.05)
        ax.legend()
        ax.grid(True, axis='y', alpha=0.3)

    def _create_tests_to_detection_chart(self, ax) -> None:
        """Create tests to detection box plot."""
        detected_df = self.df[self.df['bug_detected'] == True].copy()

        ttd_data = []
        positions = []
        colors = []

        pos = 0
        for bug_type in ['boundary_min', 'boundary_max', 'middle', 'random']:
            biased_ttd = detected_df[(detected_df['bug_type'] == bug_type) &
                                     (detected_df['sampler_type'] == 'biased')]['tests_to_detection'].dropna()
            random_ttd = detected_df[(detected_df['bug_type'] == bug_type) &
                                     (detected_df['sampler_type'] == 'random')]['tests_to_detection'].dropna()

            if len(biased_ttd) > 0:
                ttd_data.append(biased_ttd)
                positions.append(pos)
                colors.append(SAMPLER_COLORS['biased'])
                pos += 1

            if len(random_ttd) > 0:
                ttd_data.append(random_ttd)
                positions.append(pos)
                colors.append(SAMPLER_COLORS['random'])
                pos += 1

            pos += 0.5

        bp = ax.boxplot(ttd_data, positions=positions, widths=0.6, patch_artist=True,
                        showfliers=False)

        for patch, color in zip(bp['boxes'], colors):
            patch.set_facecolor(color)
            patch.set_alpha(0.8)

        ax.set_xlabel('Bug Type')
        ax.set_ylabel('Tests to Detection')
        ax.set_title('Tests to Detection (Detected Bugs Only)')
        ax.set_xticks([0.5, 2.5, 4.5, 6.5])
        ax.set_xticklabels(['Boundary\nMin', 'Boundary\nMax', 'Middle\nRange', 'Random\nValue'])
        ax.grid(True, axis='y', alpha=0.3)

        legend_elements = [mpatches.Patch(facecolor=SAMPLER_COLORS['biased'], alpha=0.8, label='Biased'),
                           mpatches.Patch(facecolor=SAMPLER_COLORS['random'], alpha=0.8, label='Random')]
        ax.legend(handles=legend_elements)

    def _print_conclusion(self) -> None:
        """Print conclusion with scientific rigor."""
        self.print_section("SCIENTIFIC CONCLUSION")

        boundary_results = [
            r for r in self.results
            if r['bug_type'] in ['boundary_min', 'boundary_max']
        ]

        # Check for meaningful improvement: significant p-value AND non-negligible effect size
        supported_results = [
            r for r in boundary_results
            if r['p_value'] < 0.05 and abs(r['cohens_h']) > 0.2
        ]

        if len(supported_results) == len(boundary_results):
            print(f"  {self.check_mark} We reject the null hypothesis H_0 for boundary bugs.")
            print("    Statistically significant evidence (p < 0.05) with meaningful effect size (h > 0.2)")
            print("    confirms biased sampling improves detection of edge-case bugs.")
        elif len(supported_results) > 0:
            print(f"  {self.check_mark} We reject the null hypothesis H_0 for some boundary bugs.")
            print("    Statistically significant evidence of improvement found in specific boundary cases:")
            for r in supported_results:
                print(f"      - {r['bug_type'].replace('_', ' ').title()}: p={r['p_value']:.4f}, h={r['cohens_h']:.3f}")
        else:
            print(f"  ✗ We fail to reject the null hypothesis H_0.")
            print("    No significant difference with meaningful effect size was observed between biased and random sampling.")

        print(f"\n  {self.check_mark} Biased sampling analysis complete")


def main():
    analysis = BiasedSamplingAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()