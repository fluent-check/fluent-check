#!/usr/bin/env python3
"""
Corner Case Coverage Analysis: What percentage of bugs are found via corner cases?

Analyzes the effectiveness of corner case testing across different bug types
and sampling modes. Tests whether corner cases alone catch majority of boundary bugs.

Metrics:
- Detection rate per bug type × sampling mode
- Attribution: percentage of hybrid-mode detections from corner cases
- Coverage: corner-only detection rate for boundary bugs

Generates:
- corner-case-coverage.png: Detection rates and attribution analysis
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

from base import AnalysisBase
from stats import wilson_score_interval, format_ci
from viz import save_figure


class CornerCaseCoverageAnalysis(AnalysisBase):
    """Analysis of corner case coverage effectiveness."""

    @property
    def name(self) -> str:
        return "Corner Case Coverage Analysis"

    @property
    def csv_filename(self) -> str:
        return "corner-case-coverage.csv"

    def analyze(self) -> None:
        """Perform the corner case coverage analysis."""
        self._compute_detection_rates()
        self._compute_attribution()
        self._create_visualization()
        self._print_conclusion()

    def _compute_detection_rates(self) -> None:
        """Compute detection rates by bug type and sampling mode."""
        self.print_section("DETECTION RATES BY BUG TYPE x SAMPLING MODE")

        self.results = []
        for bug_type in ['zero_boundary', 'empty_boundary', 'off_by_one', 'interior']:
            print(f"\n{bug_type.replace('_', ' ').title()}:")

            mode_results = {}
            for mode in ['corner_only', 'random_only', 'hybrid']:
                mode_data = self.df[(self.df['bug_type'] == bug_type) & (self.df['sampling_mode'] == mode)]

                detected = mode_data['bug_detected'].sum()
                total = len(mode_data)
                rate = detected / total if total > 0 else 0

                if total > 0:
                    ci = wilson_score_interval(detected, total)
                else:
                    ci = (0.0, 0.0)

                mode_results[mode] = {
                    'rate': rate,
                    'ci_lower': ci[0],
                    'ci_upper': ci[1],
                    'detected': detected,
                    'total': total
                }

                if total > 0:
                    print(f"  {mode:15s}: {rate*100:5.1f}% {format_ci(*ci)} ({detected}/{total})")
                else:
                    print(f"  {mode:15s}: N/A (no data)")

            self.results.append({
                'bug_type': bug_type,
                **mode_results
            })

    def _compute_attribution(self) -> None:
        """Compute attribution in hybrid mode."""
        self.print_section("ATTRIBUTION IN HYBRID MODE (AMONG DETECTED BUGS)")

        self.attribution_results = []
        hybrid_detected = self.df[(self.df['sampling_mode'] == 'hybrid') & (self.df['bug_detected'] == True)]

        for bug_type in ['zero_boundary', 'empty_boundary', 'off_by_one', 'interior']:
            bug_hybrid = hybrid_detected[hybrid_detected['bug_type'] == bug_type]

            corner_detections = (bug_hybrid['detected_by_corner_case'] == True).sum()
            random_detections = (bug_hybrid['detected_by_corner_case'] == False).sum()
            total_detections = len(bug_hybrid)

            if total_detections > 0:
                corner_pct = corner_detections / total_detections
                ci = wilson_score_interval(corner_detections, total_detections)

                print(f"\n{bug_type.replace('_', ' ').title()}:")
                print(f"  Corner case detections: {corner_detections}/{total_detections} ({corner_pct*100:.1f}%) {format_ci(*ci)}")
                print(f"  Random detections:      {random_detections}/{total_detections} ({(1-corner_pct)*100:.1f}%)")

                self.attribution_results.append({
                    'bug_type': bug_type,
                    'corner_pct': corner_pct,
                    'corner_count': corner_detections,
                    'random_count': random_detections,
                    'total': total_detections
                })

    def _create_visualization(self) -> None:
        """Create corner case coverage visualization."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        self._create_detection_chart(axes[0])
        self._create_attribution_chart(axes[1])

        save_figure(fig, self.get_output_path("corner-case-coverage.png"))

    def _create_detection_chart(self, ax) -> None:
        """Create detection rates chart."""
        bug_labels = ['Zero\nBoundary\n(x=0)', 'Empty\nBoundary\n(x=0,100)', 'Off By\nOne\n(x=1,99)', 'Interior\n(x=50)']
        x = np.arange(len(bug_labels))
        width = 0.25

        corner_rates = [r['corner_only']['rate'] for r in self.results]
        random_rates = [r['random_only']['rate'] for r in self.results]
        hybrid_rates = [r['hybrid']['rate'] for r in self.results]

        corner_errors = []
        random_errors = []
        hybrid_errors = []

        for r in self.results:
            lower_err = max(0, r['corner_only']['rate'] - r['corner_only']['ci_lower'])
            upper_err = max(0, r['corner_only']['ci_upper'] - r['corner_only']['rate'])
            corner_errors.append((lower_err, upper_err))

            lower_err = max(0, r['random_only']['rate'] - r['random_only']['ci_lower'])
            upper_err = max(0, r['random_only']['ci_upper'] - r['random_only']['rate'])
            random_errors.append((lower_err, upper_err))

            lower_err = max(0, r['hybrid']['rate'] - r['hybrid']['ci_lower'])
            upper_err = max(0, r['hybrid']['ci_upper'] - r['hybrid']['rate'])
            hybrid_errors.append((lower_err, upper_err))

        corner_errors_array = np.array(corner_errors).T
        random_errors_array = np.array(random_errors).T
        hybrid_errors_array = np.array(hybrid_errors).T

        ax.bar(x - width, corner_rates, width, label='Corner Only',
               yerr=corner_errors_array, capsize=3, color='#e74c3c', alpha=0.8)
        ax.bar(x, random_rates, width, label='Random Only',
               yerr=random_errors_array, capsize=3, color='#3498db', alpha=0.8)
        ax.bar(x + width, hybrid_rates, width, label='Hybrid',
               yerr=hybrid_errors_array, capsize=3, color='#2ecc71', alpha=0.8)

        ax.set_xlabel('Bug Type')
        ax.set_ylabel('Detection Rate')
        ax.set_title('Detection Rate by Bug Type and Sampling Mode')
        ax.set_xticks(x)
        ax.set_xticklabels(bug_labels, fontsize=9)
        ax.set_ylim(0, 1.05)
        ax.legend()
        ax.grid(True, axis='y', alpha=0.3)

    def _create_attribution_chart(self, ax) -> None:
        """Create attribution chart."""
        if self.attribution_results:
            labels = [r['bug_type'].replace('_', '\n').title() for r in self.attribution_results]
            corner_pcts = [r['corner_pct'] * 100 for r in self.attribution_results]
            random_pcts = [(1 - r['corner_pct']) * 100 for r in self.attribution_results]

            x_attr = np.arange(len(labels))
            ax.bar(x_attr, corner_pcts, label='Corner Case', color='#e74c3c', alpha=0.8)
            ax.bar(x_attr, random_pcts, bottom=corner_pcts, label='Random Sample', color='#3498db', alpha=0.8)

            ax.set_xlabel('Bug Type')
            ax.set_ylabel('Percentage of Detections')
            ax.set_title('Attribution in Hybrid Mode (Detected Bugs Only)')
            ax.set_xticks(x_attr)
            ax.set_xticklabels(labels, fontsize=9)
            ax.set_ylim(0, 105)
            ax.legend()
            ax.grid(True, axis='y', alpha=0.3)

            ax.axhline(y=50, color='red', linestyle='--', alpha=0.5, linewidth=1)

    def _print_conclusion(self) -> None:
        """Print conclusion."""
        self.print_section("CONCLUSION")

        boundary_types = ['zero_boundary', 'empty_boundary', 'off_by_one']
        boundary_attributions = [r for r in self.attribution_results if r['bug_type'] in boundary_types]

        if boundary_attributions:
            avg_corner_pct = np.mean([r['corner_pct'] for r in boundary_attributions])
            all_above_50 = all(r['corner_pct'] > 0.5 for r in boundary_attributions)

            if all_above_50:
                print(f"  {self.check_mark} Hypothesis supported: >50% of boundary bugs found via corner cases")
                print(f"    Average across boundary bugs: {avg_corner_pct*100:.1f}%")
            else:
                print(f"  x Hypothesis not fully supported:")
                print(f"    Average corner case attribution: {avg_corner_pct*100:.1f}%")

            for r in boundary_attributions:
                print(f"    - {r['bug_type']}: {r['corner_pct']*100:.1f}% from corner cases")

        print(f"\n  Corner-only detection rates:")
        for r in self.results:
            if r['bug_type'] in boundary_types:
                rate = r['corner_only']['rate']
                print(f"    - {r['bug_type']}: {rate*100:.1f}%")

        print(f"\n  {self.check_mark} Corner case coverage analysis complete")


def main():
    analysis = CornerCaseCoverageAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
