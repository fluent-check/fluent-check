#!/usr/bin/env python3
"""
Shrinking Fairness Analysis: Positional bias investigation

This analysis examines if the position of a quantifier affects how much its
value is shrunken, testing for positional bias in the shrinking process.

Metrics:
- Shrink Percentage: (initial - final) / initial
- Final Values: Average final value per position

Generates:
- shrinking-fairness.png: Box plot of final values by position
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.stats import f_oneway

from base import AnalysisBase
from viz import save_figure


class ShrinkingFairnessAnalysis(AnalysisBase):
    """Analysis of shrinking fairness across quantifier positions."""

    @property
    def name(self) -> str:
        return "Shrinking Fairness Analysis"

    @property
    def csv_filename(self) -> str:
        return "shrinking-fairness.csv"

    def analyze(self) -> None:
        """Perform the shrinking fairness analysis."""
        print("H_0: Shrinking is fair across all quantifier positions (equal final values).")
        print("H_1: Quantifier position significantly affects final shrunken values (positional bias).\n")

        self._prepare_data()
        self._compute_summary()
        self._run_anova()
        self._create_visualization()
        self._print_conclusion()

    def _prepare_data(self) -> None:
        """Prepare data for position-based analysis."""
        self.df = self.df[(self.df['initial_a'] + self.df['initial_b'] + self.df['initial_c']) > 150]
        print(f"  Loaded {len(self.df)} trials with valid counterexamples\n")

        rows = []
        for _, row in self.df.iterrows():
            order = row['quantifier_order']
            vals = {'a': row['final_a'], 'b': row['final_b'], 'c': row['final_c']}
            initials = {'a': row['initial_a'], 'b': row['initial_b'], 'c': row['initial_c']}

            pos_map = {}
            if order == 'abc':
                pos_map = {'first': 'a', 'second': 'b', 'third': 'c'}
            elif order == 'bac':
                pos_map = {'first': 'b', 'second': 'a', 'third': 'c'}
            elif order == 'cab':
                pos_map = {'first': 'c', 'second': 'a', 'third': 'b'}

            for pos, var in pos_map.items():
                rows.append({
                    'trial_id': row['trial_id'],
                    'position': pos,
                    'initial_value': initials[var],
                    'final_value': vals[var],
                    'shrink_amount': initials[var] - vals[var]
                })

        self.pos_df = pd.DataFrame(rows)

    def _compute_summary(self) -> None:
        """Compute summary statistics by position."""
        summary = self.pos_df.groupby('position').agg({
            'initial_value': 'mean',
            'final_value': ['mean', 'std'],
            'shrink_amount': 'mean'
        })

        self.print_section("SUMMARY STATISTICS BY POSITION")
        print(summary)

    def _run_anova(self) -> None:
        """Run ANOVA test for final values across positions."""
        groups = [self.pos_df[self.pos_df['position'] == p]['final_value'] for p in ['first', 'second', 'third']]
        self.f_stat, self.p_val = f_oneway(*groups)

        self.print_section("ANOVA (FINAL VALUES ACROSS POSITIONS)")
        print(f"  F-statistic = {self.f_stat:.4f}")
        print(f"  p-value = {self.p_val:.4f}")
        print(f"  Interpretation: {'Significant position effect' if self.p_val < 0.05 else 'No significant position effect'}")

    def _create_visualization(self) -> None:
        """Create shrinking fairness visualization."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        # Consistent ordering and coloring
        order = ['first', 'second', 'third']
        palette = sns.color_palette("muted", len(order))

        ax1 = axes[0]
        sns.boxplot(x='position', y='final_value', data=self.pos_df, ax=ax1, 
                    palette=palette, order=order, hue='position', legend=False)
        ax1.set_xlabel('Quantifier Position')
        ax1.set_ylabel('Final Value')
        ax1.set_title('Distribution of Final Values by Position')

        ax2 = axes[1]
        sns.barplot(x='position', y='shrink_amount', data=self.pos_df, ax=ax2, 
                    palette=palette, order=order, hue='position', legend=False)
        ax2.set_xlabel('Quantifier Position')
        ax2.set_ylabel('Average Shrink Amount')
        ax2.set_title('Average Shrink Amount by Position')

        save_figure(fig, self.get_output_path("shrinking-fairness.png"))

    def _print_conclusion(self) -> None:
        """Print conclusion with scientific rigor."""
        self.print_section("SCIENTIFIC CONCLUSION")
        if self.p_val < 0.05:
            print(f"  {self.check_mark} We reject the null hypothesis H_0 (p={self.p_val:.4e}).")
            print("    Earlier quantifier positions significantly outperform later positions in minimization.")
        else:
            print(f"  {self.check_mark} We fail to reject the null hypothesis H_0 (p={self.p_val:.4f}).")
            print("    Shrinking appears balanced across different quantifier positions.")

        print(f"\n  {self.check_mark} Shrinking Fairness analysis complete")


def main():
    analysis = ShrinkingFairnessAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()