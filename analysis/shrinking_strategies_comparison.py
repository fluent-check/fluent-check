#!/usr/bin/env python3
"""
Shrinking Strategies Comparison Analysis

Analyzes the empirical comparison of shrinking strategies to validate
fairness improvements and performance trade-offs.

Property tested: Independent threshold
  forall(a,b,c,d,e: int(0,10000000)).then(any < 10)
  Optimal counterexample: (10, 10, 10, 10, 10)

Key insight: Unlike compensating properties (e.g., a+b+c <= 150), independent
threshold properties don't allow one variable's shrink to force others to grow.
This reveals the true positional bias of each strategy under budget constraints.

With 5 quantifiers, positional bias is more visible than with 3.

Metrics analyzed:
1. Distance from optimal (10) - Lower is better
2. Optimal achievement rate - Higher is better (% reaching value 10)
3. Positional fairness - All positions should have equal optimal rates
4. Budget efficiency - How strategies perform under tight vs loose budgets

Statistical tests:
1. ANOVA - Test if strategy affects distance from optimal
2. Tukey HSD - Pairwise comparisons between strategies
3. Chi-squared - Test if optimal achievement is independent of position
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.stats import f_oneway, chi2_contingency
from scipy.stats import tukey_hsd

from base import AnalysisBase
from viz import save_figure
from constants import STRATEGY_COLORS


OPTIMAL_VALUE = 10
NUM_POSITIONS = 5


class ShrinkingStrategiesComparisonAnalysis(AnalysisBase):
    """Analysis comparing different shrinking strategies."""

    @property
    def name(self) -> str:
        return "Shrinking Strategies Comparison Analysis"

    @property
    def csv_filename(self) -> str:
        return "shrinking-strategies.csv"

    def analyze(self) -> None:
        """Perform the comparison analysis."""
        print(f"H_0: All shrinking strategies (Sequential, Round-Robin, Delta-Debugging) result in equivalent total distance from the optimal counterexample.")
        print(f"H_1: At least one shrinking strategy produces a significantly different total distance from the optimal counterexample.\n")

        self._prepare_data()
        self._compute_summary_by_budget()
        self._analyze_positional_bias()
        self._test_quantifier_order_independence()
        self._run_anova_by_budget()
        self._create_visualizations()
        self._validate_benchmarks()
        self._print_conclusion()

    def _prepare_data(self) -> None:
        """Prepare data for analysis."""
        print(f"  Loaded {len(self.df)} total trials\n")
        print(f"  Budgets: {sorted(self.df['budget'].unique())}")
        print(f"  Strategies: {list(self.df['strategy'].unique())}")
        print(f"  Quantifier orders: {list(self.df['quantifier_order'].unique())}")
        print(f"  Number of positions: {NUM_POSITIONS}")
        print()

        # Total distance is now in the CSV, but let's also compute it for validation
        distance_cols = [f'distance_pos{i}' for i in range(1, NUM_POSITIONS + 1)]
        # Use the pre-computed total_distance column if available
        if 'total_distance' not in self.df.columns:
            self.df['total_distance'] = self.df[distance_cols].sum(axis=1)

        # Calculate total optimal count (how many reached optimal)
        optimal_cols = [f'optimal_pos{i}' for i in range(1, NUM_POSITIONS + 1)]
        self.df['optimal_count'] = self.df[optimal_cols].sum(axis=1)

    def _compute_summary_by_budget(self) -> None:
        """Compute summary statistics by strategy and budget."""
        self.print_section("SUMMARY BY STRATEGY AND BUDGET")

        for budget in sorted(self.df['budget'].unique()):
            budget_df = self.df[self.df['budget'] == budget]
            print(f"\n  Budget: {budget} attempts")

            # Build header dynamically for 5 positions
            header = f"  {'Strategy':<25}"
            for i in range(1, NUM_POSITIONS + 1):
                header += f" {'Dist' + str(i):<10}"
            for i in range(1, NUM_POSITIONS + 1):
                header += f" {'Opt' + str(i) + '%' :<8}"
            print(header)
            print("  " + "-" * (25 + 10 * NUM_POSITIONS + 8 * NUM_POSITIONS))

            for strategy in ['sequential-exhaustive', 'round-robin', 'delta-debugging']:
                strat_df = budget_df[budget_df['strategy'] == strategy]
                if len(strat_df) == 0:
                    continue

                row = f"  {strategy:<25}"
                for i in range(1, NUM_POSITIONS + 1):
                    avg_dist = strat_df[f'distance_pos{i}'].mean()
                    row += f" {avg_dist:<10.0f}"
                for i in range(1, NUM_POSITIONS + 1):
                    pct_opt = strat_df[f'optimal_pos{i}'].mean() * 100
                    row += f" {pct_opt:<8.1f}"
                print(row)

        print()

    def _analyze_positional_bias(self) -> None:
        """Analyze positional bias across strategies."""
        self.print_section("POSITIONAL BIAS ANALYSIS")

        # For tight budget, analyze position bias
        tight_budget = min(self.df['budget'].unique())
        tight_df = self.df[self.df['budget'] == tight_budget]

        for strategy in ['sequential-exhaustive', 'round-robin', 'delta-debugging']:
            strat_df = tight_df[tight_df['strategy'] == strategy]
            if len(strat_df) == 0:
                continue

            # Get optimal rates by position
            pos_rates = []
            for i in range(1, NUM_POSITIONS + 1):
                pos_rates.append(strat_df[f'optimal_pos{i}'].mean())

            # Calculate bias ratio (pos1/posN)
            bias_ratio = pos_rates[0] / pos_rates[-1] if pos_rates[-1] > 0 else float('inf')

            print(f"  {strategy}:")
            for i, rate in enumerate(pos_rates, 1):
                print(f"    Position {i} optimal rate: {rate*100:.1f}%")
            
            if bias_ratio > 2:
                print(f"    {self.check_mark} Observation: Significant positional bias detected ({bias_ratio:.2f}x)")
            else:
                print(f"    {self.check_mark} Observation: Minimal positional bias detected ({bias_ratio:.2f}x)")
            print()

        # Chi-squared test for independence
        print("  Chi-squared test for position independence (tight budget):")
        for strategy in ['sequential-exhaustive', 'round-robin', 'delta-debugging']:
            strat_df = tight_df[tight_df['strategy'] == strategy]
            if len(strat_df) == 0:
                continue

            # Create contingency table: position x optimal/not-optimal
            contingency_data = {}
            for i in range(1, NUM_POSITIONS + 1):
                opt_count = strat_df[f'optimal_pos{i}'].sum()
                contingency_data[f'Position {i}'] = [opt_count, len(strat_df) - opt_count]
            contingency = pd.DataFrame(contingency_data, index=['Optimal', 'Not Optimal'])

            try:
                chi2, p_val, dof, expected = chi2_contingency(contingency)
                sig = "✓ Significant (Positional Bias)" if p_val < 0.05 else "✗ Not significant (Fair)"
                print(f"    {strategy}: χ²={chi2:.2f}, p={p_val:.4f} ({sig})")
            except Exception as e:
                print(f"    {strategy}: Could not compute ({e})")

        print()

    def _test_quantifier_order_independence(self) -> None:
        """Test if quantifier order affects results."""
        self.print_section("QUANTIFIER ORDER INDEPENDENCE")

        # Use medium budget for this test
        medium_budget = sorted(self.df['budget'].unique())[len(self.df['budget'].unique()) // 2]
        medium_df = self.df[self.df['budget'] == medium_budget]

        for strategy in medium_df['strategy'].unique():
            strategy_df = medium_df[medium_df['strategy'] == strategy]

            # Group by quantifier order and calculate total distance
            order_distances = strategy_df.groupby('quantifier_order')['total_distance'].mean()

            # Calculate coefficient of variation across orders
            cv = order_distances.std() / order_distances.mean() if order_distances.mean() > 0 else 0

            print(f"\n{strategy}:")
            print(f"  Total distance by order (budget={medium_budget}):")
            for order, dist in order_distances.items():
                print(f"    {order}: {dist:.0f}")
            print(f"  Coefficient of variation: {cv:.3f}")
            print(f"  Order independence: {self._interpret_cv(cv)}")

        print()

    def _interpret_cv(self, cv: float) -> str:
        """Interpret coefficient of variation for order independence."""
        if cv < 0.1:
            return "✓ Excellent (order-independent)"
        elif cv < 0.3:
            return "≈ Good (minimal order effect)"
        elif cv < 0.5:
            return "≈ Moderate (some order effect)"
        else:
            return "✗ Poor (high order dependence)"

    def _run_anova_by_budget(self) -> None:
        """Run ANOVA test for total distance across strategies at each budget."""
        self.print_section("ANOVA: TOTAL DISTANCE ACROSS STRATEGIES")

        self.anova_results = {}

        for budget in sorted(self.df['budget'].unique()):
            budget_df = self.df[self.df['budget'] == budget]

            # Prepare groups
            groups = [
                budget_df[budget_df['strategy'] == s]['total_distance']
                for s in budget_df['strategy'].unique()
            ]

            f_stat, p_val = f_oneway(*groups)
            self.anova_results[budget] = (f_stat, p_val)

            print(f"\n  Budget {budget}:")
            print(f"    F-statistic: {f_stat:.2f}")
            print(f"    p-value: {p_val:.4f}")

            if p_val < 0.05:
                print(f"    {self.check_mark} Significant difference detected")
            else:
                print(f"    ✗ No significant difference")

            # Tukey HSD for this budget
            strategies = list(budget_df['strategy'].unique())
            distances_by_strategy = [
                budget_df[budget_df['strategy'] == s]['total_distance'].values
                for s in strategies
            ]

            try:
                res = tukey_hsd(*distances_by_strategy)
                print("    Pairwise comparisons:")
                for i, strat1 in enumerate(strategies):
                    for j, strat2 in enumerate(strategies):
                        if i < j:
                            mean_diff = (
                                budget_df[budget_df['strategy'] == strat1]['total_distance'].mean() -
                                budget_df[budget_df['strategy'] == strat2]['total_distance'].mean()
                            )
                            p_value = res.pvalue[i, j]
                            sig = "✓ Sig" if p_value < 0.05 else "✗ NS"
                            print(f"      {strat1} vs {strat2}: diff={mean_diff:.0f}, p={p_value:.4f} ({sig})")
            except Exception as e:
                print(f"    Tukey HSD: Could not compute ({e})")

        print()

    def _create_visualizations(self) -> None:
        """Create comparison visualizations."""
        fig, axes = plt.subplots(3, 2, figsize=(14, 16))

        strategies = ['sequential-exhaustive', 'round-robin', 'delta-debugging']
        budgets = sorted(self.df['budget'].unique())
        tight_budget = min(budgets)
        tight_df = self.df[self.df['budget'] == tight_budget]

        # 1. Total distance by strategy and budget (grouped bar with error bars)
        ax1 = axes[0, 0]
        budget_strategy_mean = self.df.groupby(['budget', 'strategy'])['total_distance'].mean().unstack()
        budget_strategy_std = self.df.groupby(['budget', 'strategy'])['total_distance'].std().unstack()
        
        # Ensure consistent order and colors
        cols = [c for c in strategies if c in budget_strategy_mean.columns]
        colors_list = [STRATEGY_COLORS[c] for c in cols]
        
        budget_strategy_mean[cols].plot(kind='bar', ax=ax1, yerr=budget_strategy_std[cols], capsize=3, color=colors_list)
        ax1.set_xlabel('Budget')
        ax1.set_ylabel('Total Distance from Optimal')
        ax1.set_title('Total Distance by Strategy and Budget\n(Lower = Better)')
        ax1.tick_params(axis='x', rotation=0)
        ax1.legend(title='Strategy', loc='upper right')

        # 2. Total distance vs budget (line plot with error bands)
        ax2 = axes[0, 1]
        for strategy in strategies:
            means = []
            stds = []
            for budget in budgets:
                budget_df = self.df[(self.df['budget'] == budget) & (self.df['strategy'] == strategy)]
                means.append(budget_df['total_distance'].mean())
                stds.append(budget_df['total_distance'].std())
            means = np.array(means)
            stds = np.array(stds)
            color = STRATEGY_COLORS[strategy]
            ax2.plot(budgets, means, marker='o', linewidth=2, markersize=8, label=strategy, color=color)
            ax2.fill_between(budgets, means - stds, means + stds, alpha=0.2, color=color)

        ax2.set_xlabel('Budget (shrink attempts)')
        ax2.set_ylabel('Total Distance from Optimal')
        ax2.set_title('Shrinking Progress vs Budget\n(Shows how strategies converge)')
        ax2.legend(loc='upper right')
        ax2.set_xscale('log')
        ax2.set_yscale('log')
        ax2.grid(True, alpha=0.3)

        # 3. Distance by position (box + strip plot for tight budget - shows positional bias)
        ax3 = axes[1, 0]
        # Reshape data for boxplot: melt distance columns into long format
        plot_data = []
        for strategy in strategies:
            strat_df = tight_df[tight_df['strategy'] == strategy]
            for i in range(1, NUM_POSITIONS + 1):
                for val in strat_df[f'distance_pos{i}']:
                    # Add small offset to zero values for log scale visibility
                    plot_data.append({
                        'Strategy': strategy,
                        'Position': f'Pos {i}',
                        'Distance': max(val, 1)  # Floor at 1 for log scale
                    })
        plot_df = pd.DataFrame(plot_data)
        sns.boxplot(
            x='Position',
            y='Distance',
            hue='Strategy',
            data=plot_df,
            ax=ax3,
            linewidth=0.8,
            palette=STRATEGY_COLORS,
            hue_order=strategies
        )
        sns.stripplot(
            x='Position',
            y='Distance',
            hue='Strategy',
            data=plot_df,
            ax=ax3,
            dodge=True,
            alpha=0.3,
            size=2,
            legend=False,
            palette=STRATEGY_COLORS,
            hue_order=strategies
        )
        ax3.set_xlabel('Position')
        ax3.set_ylabel('Distance from Optimal')
        ax3.set_title(f'Distance by Position (Budget={tight_budget})\n(Shows positional bias - lower = better)')
        ax3.legend(loc='upper left', fontsize='x-small')
        ax3.set_yscale('log')

        # 4. Distance distribution by strategy (box + strip plot for tight budget)
        ax4 = axes[1, 1]
        sns.boxplot(
            x='strategy',
            y='total_distance',
            hue='strategy',
            data=tight_df,
            ax=ax4,
            order=strategies,
            legend=False,
            linewidth=0.8,
            palette=STRATEGY_COLORS
        )
        sns.stripplot(
            x='strategy',
            y='total_distance',
            data=tight_df,
            ax=ax4,
            order=strategies,
            color='black',
            alpha=0.3,
            size=2
        )
        ax4.set_xlabel('Strategy')
        ax4.set_ylabel('Total Distance from Optimal')
        ax4.set_title(f'Total Distance Distribution (Budget={tight_budget})\n(Lower = Better)')
        ax4.tick_params(axis='x', rotation=15)

        # 5. Distance by position (box + strip plot for high budget - shows convergence)
        ax5 = axes[2, 0]
        high_budget = max(budgets)
        high_df = self.df[self.df['budget'] == high_budget]
        plot_data_high = []
        for strategy in strategies:
            strat_df = high_df[high_df['strategy'] == strategy]
            for i in range(1, NUM_POSITIONS + 1):
                for val in strat_df[f'distance_pos{i}']:
                    # Floor at 1 for log scale visibility
                    plot_data_high.append({
                        'Strategy': strategy,
                        'Position': f'Pos {i}',
                        'Distance': max(val, 1)
                    })
        plot_df_high = pd.DataFrame(plot_data_high)
        sns.boxplot(
            x='Position',
            y='Distance',
            hue='Strategy',
            data=plot_df_high,
            ax=ax5,
            linewidth=0.8,
            palette=STRATEGY_COLORS,
            hue_order=strategies
        )
        sns.stripplot(
            x='Position',
            y='Distance',
            hue='Strategy',
            data=plot_df_high,
            ax=ax5,
            dodge=True,
            alpha=0.3,
            size=2,
            legend=False,
            palette=STRATEGY_COLORS,
            hue_order=strategies
        )
        ax5.set_xlabel('Position')
        ax5.set_ylabel('Distance from Optimal')
        ax5.set_title(f'Distance by Position (Budget={high_budget})\n(Higher budget allows more convergence)')
        ax5.legend(loc='upper left', fontsize='x-small')
        ax5.set_yscale('log')

        # 6. Distance reduction vs baseline across budgets (line plot with error bands)
        ax6 = axes[2, 1]

        for strategy in strategies:
            if strategy == 'sequential-exhaustive':
                continue  # Skip baseline
            means = []
            stds = []
            for budget in budgets:
                budget_df = self.df[self.df['budget'] == budget]
                baseline_dists = budget_df[budget_df['strategy'] == 'sequential-exhaustive']['total_distance']
                strat_dists = budget_df[budget_df['strategy'] == strategy]['total_distance']
                # Calculate reduction for each trial pair (approximate by using means)
                baseline_mean = baseline_dists.mean()
                reductions = (1 - strat_dists / baseline_mean) * 100 if baseline_mean > 0 else 0
                means.append(reductions.mean())
                stds.append(reductions.std())
            means = np.array(means)
            stds = np.array(stds)
            
            # Use consistent color from predefined map
            color = STRATEGY_COLORS[strategy]
            
            ax6.plot(budgets, means, marker='o', linewidth=2, markersize=8, label=strategy, color=color)
            ax6.fill_between(budgets, means - stds, means + stds, alpha=0.2, color=color)

        ax6.axhline(y=0, color='gray', linestyle='--', alpha=0.5)
        ax6.axhline(y=50, color='green', linestyle='--', alpha=0.5, label='50% target')
        ax6.set_xlabel('Budget (shrink attempts)')
        ax6.set_ylabel('Distance Reduction vs Baseline (%)')
        ax6.set_title('Improvement Over Sequential Exhaustive\n(Higher = Better)')
        ax6.legend(loc='lower right')
        
        # Dynamic Y-axis with a reasonable minimum range
        # Use margins to avoid blowing out of boundaries
        ymin, ymax = ax6.get_ylim()
        ax6.set_ylim(min(ymin, -10), max(ymax, 105)) 
        
        ax6.grid(True, alpha=0.3)

        plt.tight_layout()
        save_figure(fig, self.get_output_path("shrinking-strategies-comparison.png"))

    def _validate_benchmarks(self) -> None:
        """Validate against expected benchmarks."""
        self.print_section("BENCHMARK VALIDATION")

        # Use tight budget for benchmark comparison (shows most difference)
        tight_budget = min(self.df['budget'].unique())
        tight_df = self.df[self.df['budget'] == tight_budget]

        baseline_distance = tight_df[tight_df['strategy'] == 'sequential-exhaustive']['total_distance'].mean()
        baseline_attempts = tight_df[tight_df['strategy'] == 'sequential-exhaustive']['attempts'].mean()
        baseline_time = tight_df[tight_df['strategy'] == 'sequential-exhaustive']['elapsed_micros'].mean()

        # Calculate baseline bias ratio
        baseline_pos1 = tight_df[tight_df['strategy'] == 'sequential-exhaustive']['optimal_pos1'].mean()
        baseline_posN = tight_df[tight_df['strategy'] == 'sequential-exhaustive'][f'optimal_pos{NUM_POSITIONS}'].mean()
        baseline_bias = baseline_pos1 / baseline_posN if baseline_posN > 0 else float('inf')

        print(f"  Benchmarks using tight budget ({tight_budget} attempts):\n")

        # Round-Robin benchmarks
        if 'round-robin' in tight_df['strategy'].values:
            rr_df = tight_df[tight_df['strategy'] == 'round-robin']
            rr_distance = rr_df['total_distance'].mean()
            rr_attempts = rr_df['attempts'].mean()
            rr_time = rr_df['elapsed_micros'].mean()
            rr_pos1 = rr_df['optimal_pos1'].mean()
            rr_posN = rr_df[f'optimal_pos{NUM_POSITIONS}'].mean()
            rr_bias = rr_pos1 / rr_posN if rr_posN > 0 else float('inf')

            dist_reduction = (1 - rr_distance / baseline_distance) * 100 if baseline_distance > 0 else 0
            bias_reduction = (1 - rr_bias / baseline_bias) * 100 if baseline_bias < float('inf') else 0

            print("  Round-Robin vs Sequential Exhaustive:\n")
            print(f"    Total distance reduction: {dist_reduction:.1f}%")
            print(f"    Bias ratio: {rr_bias:.2f}x (baseline: {baseline_bias:.2f}x)")
            print(f"    Bias reduction: {bias_reduction:.1f}%")

            # Benchmark: Should show better fairness
            check = self.check_mark if rr_bias < baseline_bias else "✗"
            print(f"    {check} Lower bias than baseline")

        print()

        # Delta Debugging benchmarks
        if 'delta-debugging' in tight_df['strategy'].values:
            dd_df = tight_df[tight_df['strategy'] == 'delta-debugging']
            dd_distance = dd_df['total_distance'].mean()
            dd_pos1 = dd_df['optimal_pos1'].mean()
            dd_posN = dd_df[f'optimal_pos{NUM_POSITIONS}'].mean()
            dd_bias = dd_pos1 / dd_posN if dd_posN > 0 else float('inf')

            dist_reduction = (1 - dd_distance / baseline_distance) * 100 if baseline_distance > 0 else 0
            bias_reduction = (1 - dd_bias / baseline_bias) * 100 if baseline_bias < float('inf') else 0

            print("  Delta Debugging vs Sequential Exhaustive:\n")
            print(f"    Total distance reduction: {dist_reduction:.1f}%")
            print(f"    Bias ratio: {dd_bias:.2f}x (baseline: {baseline_bias:.2f}x)")
            print(f"    Bias reduction: {bias_reduction:.1f}%")

            # Benchmark: Should show best fairness
            check = self.check_mark if dd_bias < baseline_bias else "✗"
            print(f"    {check} Lower bias than baseline")

        # ANOVA significance (use tight budget)
        if tight_budget in self.anova_results:
            f_stat, p_val = self.anova_results[tight_budget]
            check = self.check_mark if p_val < 0.05 else "✗"
            print(f"\n  {check} ANOVA significance (budget={tight_budget}): p={p_val:.4f} (expected: <0.05)")

        print()

    def _print_conclusion(self) -> None:
        """Print conclusion based on analyzed data with scientific rigor."""
        self.print_section("SCIENTIFIC CONCLUSION")

        tight_budget = min(self.df['budget'].unique())
        budgets = sorted(self.df['budget'].unique())
        high_budget = max(budgets)

        # 1. Statistical Significance (ANOVA)
        if tight_budget in self.anova_results:
            f_stat, p_val = self.anova_results[tight_budget]
            if p_val < 0.05:
                print(f"  {self.check_mark} We reject the null hypothesis H_0 (p={p_val:.4e}).")
                print(f"    There is statistically significant evidence that shrinking strategies perform differently at budget {tight_budget}.")
            else:
                print(f"  ✗ We fail to reject the null hypothesis H_0 (p={p_val:.4f}).")
                print(f"    We found no significant difference in total distance between strategies at budget {tight_budget}.")

        # 2. Performance Comparison (Effect Size)
        tight_df = self.df[self.df['budget'] == tight_budget]
        baseline_dist = tight_df[tight_df['strategy'] == 'sequential-exhaustive']['total_distance'].mean()
        
        print("\n  Evidence Summary:")
        
        # Positional Bias (Chi-Squared check)
        for strategy in ['round-robin', 'delta-debugging']:
            strat_df = tight_df[tight_df['strategy'] == strategy]
            if len(strat_df) == 0: continue
            
            # Simple check if RR/DD are actually better
            strat_dist = strat_df['total_distance'].mean()
            reduction = (1 - strat_dist / baseline_dist) * 100 if baseline_dist > 0 else 0
            
            if reduction > 10:
                print(f"  - {strategy.capitalize()} demonstrated a {reduction:.1f}% reduction in distance over the sequential baseline.")
            
        # Convergence
        high_df = self.df[self.df['budget'] == high_budget]
        late_pos_opt = high_df.groupby('strategy')['optimal_pos5'].mean()
        if (late_pos_opt['round-robin'] > late_pos_opt['sequential-exhaustive']):
            print(f"  - Fair strategies significantly improved convergence for late-position quantifiers.")
            print(f"    Position 5 optimal rate: Round-Robin={late_pos_opt['round-robin']*100:.1f}% vs Sequential={late_pos_opt['sequential-exhaustive']*100:.1f}%.")

        # Recommendations
        print("\n  Scientific Recommendations:")
        
        best_strat = tight_df.groupby('strategy')['total_distance'].mean().idxmin()
        print(f"  1. Based on total distance minimization, {best_strat.capitalize()} is the optimal strategy among those tested.")
        print(f"  2. Round-Robin is recommended as the default due to its balance of fairness and low complexity.")
        print(f"  3. Sequential Exhaustive should be deprecated for multi-quantifier scenarios as it exhibits strong positional dependency.")

        print(f"\n  {self.check_mark} Shrinking Strategies Comparison analysis complete")


def main():
    analysis = ShrinkingStrategiesComparisonAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
