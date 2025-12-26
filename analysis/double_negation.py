#!/usr/bin/env python3
"""
Double-Negation Equivalence Analysis

Compares FluentCheck's first-class .exists() against double-negation emulation:
exists x. P(x) = not forall x. not P(x)

Key questions:
1. Are detection rates equivalent? (They should be, proving semantic equivalence)
2. Is there a shrinking quality difference?
3. What's the composition complexity cost of double-negation?

Generates:
- Detection rate comparison by approach
- Shrinking effort comparison
- Composition complexity analysis
- Paired trial agreement analysis
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from scipy import stats as scipy_stats

from base import MultiFileAnalysis
from constants import SIMPLE_DENSITY_ORDER, SIMPLE_DENSITY_LABELS, APPROACH_COLORS
from stats import wilson_score_interval, chi_squared_test, cohens_h, effect_size_interpretation, mann_whitney_test
from viz import save_figure, create_figure, create_grouped_bar_chart


class DoubleNegationAnalysis(MultiFileAnalysis):
    """Analysis of double-negation equivalence."""

    @property
    def name(self) -> str:
        return "Double-Negation Equivalence Analysis"

    @property
    def csv_filenames(self) -> dict:
        return {
            'main': 'double_negation.csv',
            'composition': 'composition.csv'
        }

    @property
    def required_columns(self) -> list:
        return ['approach', 'scenario', 'witness_found']

    def analyze(self) -> None:
        """Perform the double-negation equivalence analysis."""
        self._analyze_detection_rates()
        self._analyze_shrinking()
        self._analyze_composition()
        self._analyze_paired_agreement()
        self._print_summary()

    def _analyze_detection_rates(self) -> None:
        """Part 1: Detection Rate Comparison."""
        self.print_section("PART 1: DETECTION RATE COMPARISON (Semantic Equivalence)")
        print("\nIf both approaches are semantically equivalent, detection rates should be identical.")

        first_class = self.df[self.df['approach'] == 'first_class']
        double_neg = self.df[self.df['approach'] == 'double_negation']

        results = []
        for scenario in SIMPLE_DENSITY_ORDER:
            if scenario not in self.df['scenario'].values:
                continue

            fc_data = first_class[first_class['scenario'] == scenario]
            dn_data = double_neg[double_neg['scenario'] == scenario]

            fc_found = fc_data['witness_found'].sum()
            fc_total = len(fc_data)
            fc_rate = fc_found / fc_total if fc_total > 0 else 0
            fc_lower, fc_upper = wilson_score_interval(fc_found, fc_total, 0.95)

            dn_found = dn_data['witness_found'].sum()
            dn_total = len(dn_data)
            dn_rate = dn_found / dn_total if dn_total > 0 else 0
            dn_lower, dn_upper = wilson_score_interval(dn_found, dn_total, 0.95)

            # Chi-squared test for equivalence
            if fc_found == fc_total or dn_found == dn_total or fc_found == 0 or dn_found == 0:
                chi2, p_value, significant = np.nan, np.nan, False
            else:
                chi_result = chi_squared_test(fc_found, fc_total, dn_found, dn_total)
                chi2 = chi_result['chi2']
                p_value = chi_result['p_value']
                significant = chi_result['significant']

            h = cohens_h(fc_rate, dn_rate) if fc_rate > 0 and dn_rate > 0 else 0.0

            results.append({
                'scenario': scenario,
                'fc_rate': fc_rate,
                'fc_ci': (fc_lower, fc_upper),
                'dn_rate': dn_rate,
                'dn_ci': (dn_lower, dn_upper),
                'chi2': chi2,
                'p_value': p_value,
                'significant': significant,
                'cohens_h': h,
                'effect_size': effect_size_interpretation(h)
            })

        self._print_detection_table(results)
        self._create_detection_chart(results)
        self.detection_results = results

    def _print_detection_table(self, results: list) -> None:
        """Print detection rate comparison table."""
        print(f"\n{'Scenario':<15} {'First-Class':<12} {'Double-Neg':<12} {'Chi2 p-value':<12} {'Difference':<12}")
        self.print_divider(width=80)

        for r in results:
            diff = abs(r['fc_rate'] - r['dn_rate']) * 100
            sig = "**" if r['significant'] else ""
            p_str = f"{r['p_value']:.3f}" if not np.isnan(r['p_value']) else "N/A"
            print(f"{r['scenario']:<15} "
                  f"{r['fc_rate']*100:<12.1f}% "
                  f"{r['dn_rate']*100:<12.1f}% "
                  f"{p_str:<12}{sig} "
                  f"{diff:.1f}% ({r['effect_size']})")

        self.print_divider(width=80)
        print("** = statistically significant difference at alpha=0.05")

        all_equivalent = not any(r['significant'] for r in results)
        status = f"{self.check_mark} CONFIRMED" if all_equivalent else "X DIFFERENCES FOUND"
        print(f"\n  Overall semantic equivalence: {status}")

    def _create_detection_chart(self, results: list) -> None:
        """Create detection rate comparison bar chart."""
        fig, ax = create_figure('single')

        x_pos = np.arange(len(results))
        bar_width = 0.35

        fc_rates = [r['fc_rate'] for r in results]
        dn_rates = [r['dn_rate'] for r in results]
        fc_errors = [(max(0, r['fc_rate'] - r['fc_ci'][0]), max(0, r['fc_ci'][1] - r['fc_rate'])) for r in results]
        dn_errors = [(max(0, r['dn_rate'] - r['dn_ci'][0]), max(0, r['dn_ci'][1] - r['dn_rate'])) for r in results]

        fc_yerr = np.array(fc_errors).T
        dn_yerr = np.array(dn_errors).T

        ax.bar(x_pos - bar_width/2, fc_rates, bar_width,
               label='First-Class .exists()', color=APPROACH_COLORS['first_class'], alpha=0.7,
               yerr=fc_yerr, capsize=5)
        ax.bar(x_pos + bar_width/2, dn_rates, bar_width,
               label='Double-Negation (!forall(!P))', color=APPROACH_COLORS['double_negation'], alpha=0.7,
               yerr=dn_yerr, capsize=5)

        ax.set_xlabel('Scenario (Witness Density)', fontsize=12)
        ax.set_ylabel('Detection Rate', fontsize=12)
        ax.set_title('Semantic Equivalence: First-Class vs Double-Negation\n(95% CI, overlapping bars confirm equivalence)', fontsize=14)
        ax.set_xticks(x_pos)
        ax.set_xticklabels([SIMPLE_DENSITY_LABELS.get(r['scenario'], r['scenario']) for r in results], fontsize=10)
        ax.set_ylim(0, 1.05)
        ax.legend(loc='lower right', fontsize=10)
        ax.grid(True, axis='y', alpha=0.3)

        save_figure(fig, self.get_output_path("double_neg_detection_rates.png"))

    def _analyze_shrinking(self) -> None:
        """Part 2: Shrinking Quality Comparison."""
        self.print_section("PART 2: SHRINKING QUALITY COMPARISON")

        first_class = self.df[self.df['approach'] == 'first_class']
        double_neg = self.df[self.df['approach'] == 'double_negation']

        fc_found_df = first_class[first_class['witness_found']]
        dn_found_df = double_neg[double_neg['witness_found']]

        if len(fc_found_df) == 0 or len(dn_found_df) == 0:
            print("\n  Insufficient data for shrinking comparison")
            return

        # Check if shrinking columns exist
        if 'shrink_candidates_tested' not in fc_found_df.columns:
            print("\n  Shrinking data not available in CSV")
            return

        print(f"\n{'Approach':<20} {'Mean Candidates':<18} {'Mean Improvements':<18}")
        self.print_divider(width=60)

        fc_candidates = fc_found_df['shrink_candidates_tested'].mean()
        fc_improvements = fc_found_df['shrink_improvements_made'].mean()
        dn_candidates = dn_found_df['shrink_candidates_tested'].mean()
        dn_improvements = dn_found_df['shrink_improvements_made'].mean()

        print(f"{'First-Class':<20} {fc_candidates:<18.1f} {fc_improvements:<18.1f}")
        print(f"{'Double-Negation':<20} {dn_candidates:<18.1f} {dn_improvements:<18.1f}")
        self.print_divider(width=60)

        # Statistical test for shrinking difference
        if len(fc_found_df) >= 10 and len(dn_found_df) >= 10:
            result = mann_whitney_test(
                fc_found_df['shrink_improvements_made'].values,
                dn_found_df['shrink_improvements_made'].values
            )
            print(f"\n  Shrinking improvements difference: Mann-Whitney U p={result['p_value']:.3f}")
            diff_str = "Significant difference" if result['significant'] else "No significant difference"
            print(f"  {diff_str}")

        # Create shrinking comparison chart
        self._create_shrinking_chart(fc_found_df, dn_found_df)

    def _create_shrinking_chart(self, fc_df: pd.DataFrame, dn_df: pd.DataFrame) -> None:
        """Create shrinking comparison charts."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        # Candidates tested
        ax = axes[0]
        shrink_data = pd.concat([
            fc_df[['shrink_candidates_tested', 'scenario']].assign(approach='First-Class'),
            dn_df[['shrink_candidates_tested', 'scenario']].assign(approach='Double-Negation')
        ])
        sns.boxplot(data=shrink_data, x='scenario', y='shrink_candidates_tested',
                    hue='approach', order=SIMPLE_DENSITY_ORDER, ax=ax)
        ax.set_xlabel('Scenario', fontsize=12)
        ax.set_ylabel('Shrink Candidates Tested', fontsize=12)
        ax.set_title('Shrinking Effort Comparison', fontsize=14)
        ax.legend(title='Approach')
        ax.grid(True, axis='y', alpha=0.3)

        # Improvements made
        ax = axes[1]
        improve_data = pd.concat([
            fc_df[['shrink_improvements_made', 'scenario']].assign(approach='First-Class'),
            dn_df[['shrink_improvements_made', 'scenario']].assign(approach='Double-Negation')
        ])
        sns.boxplot(data=improve_data, x='scenario', y='shrink_improvements_made',
                    hue='approach', order=SIMPLE_DENSITY_ORDER, ax=ax)
        ax.set_xlabel('Scenario', fontsize=12)
        ax.set_ylabel('Successful Shrink Steps', fontsize=12)
        ax.set_title('Shrinking Progress Comparison', fontsize=14)
        ax.legend(title='Approach')
        ax.grid(True, axis='y', alpha=0.3)

        save_figure(fig, self.get_output_path("double_neg_shrinking.png"))

    def _analyze_composition(self) -> None:
        """Part 3: Composition Complexity Analysis."""
        self.print_section("PART 3: COMPOSITION COMPLEXITY (exists-forall pattern)")

        comp_df = self.get_df('composition')
        if comp_df is None or len(comp_df) == 0:
            print("\n  Composition data not available")
            return

        print(f"\n  Loaded {len(comp_df)} composition trials")

        fc_comp = comp_df[comp_df['approach'] == 'first_class']
        dn_comp = comp_df[comp_df['approach'] == 'double_negation']

        fc_found = fc_comp['witness_found'].sum()
        fc_total = len(fc_comp)
        dn_found = dn_comp['witness_found'].sum()
        dn_total = len(dn_comp)

        print(f"\n{'Approach':<20} {'Detection':<12} {'Mean Tests':<12} {'Mean Time (us)':<15} {'LoC':<8}")
        self.print_divider(width=80)

        fc_loc = self.safe_first(fc_comp, 'lines_of_code', 'N/A')
        dn_loc = self.safe_first(dn_comp, 'lines_of_code', 'N/A')

        print(f"{'First-Class':<20} "
              f"{fc_found/fc_total*100:.1f}% "
              f"{fc_comp['tests_run'].mean():<12.1f} "
              f"{fc_comp['elapsed_micros'].mean():<15.1f} "
              f"{fc_loc:<8}")

        print(f"{'Double-Negation':<20} "
              f"{dn_found/dn_total*100:.1f}% "
              f"{dn_comp['tests_run'].mean():<12.1f} "
              f"{dn_comp['elapsed_micros'].mean():<15.1f} "
              f"{dn_loc:<8}")

        self.print_divider(width=80)

        if isinstance(fc_loc, (int, float)) and isinstance(dn_loc, (int, float)):
            loc_ratio = dn_loc / fc_loc
            time_ratio = dn_comp['elapsed_micros'].mean() / fc_comp['elapsed_micros'].mean()
            print(f"\n  Code complexity ratio: {loc_ratio:.1f}x more code for double-negation")
            print(f"  Time ratio: {time_ratio:.1f}x")

        self._create_composition_chart(fc_comp, dn_comp, fc_loc, dn_loc)

    def _create_composition_chart(self, fc_comp: pd.DataFrame, dn_comp: pd.DataFrame,
                                   fc_loc, dn_loc) -> None:
        """Create composition complexity charts."""
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))

        approaches = ['First-Class', 'Double-Negation']
        colors = [APPROACH_COLORS['first_class'], APPROACH_COLORS['double_negation']]

        # Detection rate
        ax = axes[0]
        detection_rates = [
            fc_comp['witness_found'].sum() / len(fc_comp),
            dn_comp['witness_found'].sum() / len(dn_comp)
        ]
        ax.bar(approaches, detection_rates, color=colors, alpha=0.7, edgecolor='black')
        ax.set_ylabel('Detection Rate', fontsize=12)
        ax.set_title('Detection Rate\n(exists-forall pattern)', fontsize=12)
        ax.set_ylim(0, 1.05)
        ax.grid(True, axis='y', alpha=0.3)

        # Tests run
        ax = axes[1]
        tests = [fc_comp['tests_run'].mean(), dn_comp['tests_run'].mean()]
        ax.bar(approaches, tests, color=colors, alpha=0.7, edgecolor='black')
        ax.set_ylabel('Mean Tests Run', fontsize=12)
        ax.set_title('Computational Effort', fontsize=12)
        ax.grid(True, axis='y', alpha=0.3)

        # Lines of code
        ax = axes[2]
        if isinstance(fc_loc, (int, float)) and isinstance(dn_loc, (int, float)):
            locs = [fc_loc, dn_loc]
            ax.bar(approaches, locs, color=colors, alpha=0.7, edgecolor='black')
            ax.set_ylabel('Lines of Code', fontsize=12)
            ax.set_title('Code Complexity\n(conceptual measure)', fontsize=12)
            ax.grid(True, axis='y', alpha=0.3)
        else:
            ax.text(0.5, 0.5, 'LoC data not available', ha='center', va='center')

        plt.suptitle('Composition Complexity: exists(a).forall(b) Pattern', fontsize=14, y=1.02)

        save_figure(fig, self.get_output_path("double_neg_composition.png"))

    def _analyze_paired_agreement(self) -> None:
        """Part 4: Paired Trial Agreement Analysis."""
        self.print_section("PART 4: PAIRED TRIAL AGREEMENT")
        print("\nSince both approaches use the same seed, we can check if they find the same witnesses.")

        first_class = self.df[self.df['approach'] == 'first_class']
        double_neg = self.df[self.df['approach'] == 'double_negation']

        # Merge on trial_id to get paired comparisons
        merged = pd.merge(
            first_class[['trial_id', 'scenario', 'witness_found', 'witness_value']],
            double_neg[['trial_id', 'scenario', 'witness_found', 'witness_value']],
            on=['trial_id', 'scenario'],
            suffixes=('_fc', '_dn')
        )

        both_found = (merged['witness_found_fc'] & merged['witness_found_dn']).sum()
        both_not_found = (~merged['witness_found_fc'] & ~merged['witness_found_dn']).sum()
        fc_only = (merged['witness_found_fc'] & ~merged['witness_found_dn']).sum()
        dn_only = (~merged['witness_found_fc'] & merged['witness_found_dn']).sum()

        total_pairs = len(merged)
        agreement_rate = (both_found + both_not_found) / total_pairs if total_pairs > 0 else 0

        print(f"\n  Both found witness: {both_found} ({both_found/total_pairs*100:.1f}%)")
        print(f"  Both missed: {both_not_found} ({both_not_found/total_pairs*100:.1f}%)")
        print(f"  First-class only: {fc_only} ({fc_only/total_pairs*100:.1f}%)")
        print(f"  Double-neg only: {dn_only} ({dn_only/total_pairs*100:.1f}%)")
        print(f"\n  Overall agreement: {agreement_rate*100:.1f}%")

        # When both found, check if they found the same value
        both_found_df = merged[merged['witness_found_fc'] & merged['witness_found_dn']]
        if len(both_found_df) > 0:
            same_value = (both_found_df['witness_value_fc'] == both_found_df['witness_value_dn']).sum()
            same_rate = same_value / len(both_found_df)
            print(f"\n  Same witness value when both found: {same_value}/{len(both_found_df)} ({same_rate*100:.1f}%)")

    def _print_summary(self) -> None:
        """Print summary and recommendations."""
        self.print_section("SUMMARY")
        print("""
1. SEMANTIC EQUIVALENCE: Both approaches should have equivalent detection rates
   (within statistical noise), confirming exists x.P(x) = not forall x. not P(x)

2. SHRINKING: First-class exists directly shrinks witnesses, while double-negation
   shrinks counterexamples (which happen to be witnesses). Results should be similar.

3. COMPOSITION COMPLEXITY: The real advantage of first-class exists is ergonomics:
   - exists(a).forall(b).then(P) is ~6 lines
   - Double-negation equivalent is ~20 lines with nested scenarios

4. RECOMMENDATION: Use first-class .exists() for clearer code and easier maintenance.
   Double-negation works but obscures intent.
""")


def main():
    analysis = DoubleNegationAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
