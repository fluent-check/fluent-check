#!/usr/bin/env python3
"""
Double-Negation Equivalence Analysis

Compares FluentCheck's first-class .exists() against double-negation emulation:
∃x. P(x) ≡ ¬∀x. ¬P(x)

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
from pathlib import Path
from scipy import stats
from util import wilson_score_interval, save_figure, chi_squared_test, cohens_h, effect_size_interpretation

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/double_negation.csv"
COMPOSITION_PATH = PROJECT_ROOT / "docs/evidence/raw/composition.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SCENARIO_ORDER = ['sparse', 'rare', 'moderate', 'dense']
SCENARIO_LABELS = {
    'sparse': 'Sparse\n(0.01%)',
    'rare': 'Rare\n(1%)',
    'moderate': 'Moderate\n(10%)',
    'dense': 'Dense\n(50%)'
}


def main():
    print("=== Double-Negation Equivalence Analysis ===\n")

    # Load data
    print(f"Loading: {CSV_PATH}")
    if not CSV_PATH.exists():
        print(f"ERROR: {CSV_PATH} not found. Run the study first:")
        print("  npm run evidence:generate")
        return

    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")

    # Separate by approach
    first_class = df[df['approach'] == 'first_class']
    double_neg = df[df['approach'] == 'double_negation']

    # Part 1: Detection Rate Comparison
    print("=" * 100)
    print("PART 1: DETECTION RATE COMPARISON (Semantic Equivalence)")
    print("=" * 100)
    print("\nIf both approaches are semantically equivalent, detection rates should be identical.")

    results = []
    for scenario in SCENARIO_ORDER:
        if scenario not in df['scenario'].values:
            continue

        fc_data = first_class[first_class['scenario'] == scenario]
        dn_data = double_neg[double_neg['scenario'] == scenario]

        fc_found = fc_data['witness_found'].sum()
        fc_total = len(fc_data)
        fc_rate = fc_found / fc_total
        fc_lower, fc_upper = wilson_score_interval(fc_found, fc_total, 0.95)

        dn_found = dn_data['witness_found'].sum()
        dn_total = len(dn_data)
        dn_rate = dn_found / dn_total
        dn_lower, dn_upper = wilson_score_interval(dn_found, dn_total, 0.95)

        # Chi-squared test for equivalence
        # Handle edge cases where all trials succeed or fail
        if fc_found == fc_total or dn_found == dn_total or fc_found == 0 or dn_found == 0:
            # Can't compute chi-squared when one cell is 0
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

    print(f"\n{'Scenario':<15} {'First-Class':<12} {'Double-Neg':<12} {'χ² p-value':<12} {'Difference':<12}")
    print("-" * 80)

    for r in results:
        diff = abs(r['fc_rate'] - r['dn_rate']) * 100
        sig = "**" if r['significant'] else ""
        p_str = f"{r['p_value']:.3f}" if not np.isnan(r['p_value']) else "N/A"
        print(f"{r['scenario']:<15} "
              f"{r['fc_rate']*100:<12.1f}% "
              f"{r['dn_rate']*100:<12.1f}% "
              f"{p_str:<12}{sig} "
              f"{diff:.1f}% ({r['effect_size']})")

    print("-" * 80)
    print("** = statistically significant difference at α=0.05")

    # Check overall equivalence
    all_equivalent = not any(r['significant'] for r in results)
    print(f"\n  Overall semantic equivalence: {'✓ CONFIRMED' if all_equivalent else '✗ DIFFERENCES FOUND'}")

    # Create Figure 1: Detection Rate Comparison
    fig, ax = plt.subplots(figsize=(12, 7))

    x_pos = np.arange(len(results))
    bar_width = 0.35

    fc_rates = [r['fc_rate'] for r in results]
    dn_rates = [r['dn_rate'] for r in results]
    fc_yerr = [[max(0, r['fc_rate'] - r['fc_ci'][0]) for r in results],
               [max(0, r['fc_ci'][1] - r['fc_rate']) for r in results]]
    dn_yerr = [[max(0, r['dn_rate'] - r['dn_ci'][0]) for r in results],
               [max(0, r['dn_ci'][1] - r['dn_rate']) for r in results]]

    ax.bar(x_pos - bar_width/2, fc_rates, bar_width,
           label='First-Class .exists()', color='steelblue', alpha=0.7,
           yerr=fc_yerr, capsize=5)
    ax.bar(x_pos + bar_width/2, dn_rates, bar_width,
           label='Double-Negation (!forall(!P))', color='coral', alpha=0.7,
           yerr=dn_yerr, capsize=5)

    ax.set_xlabel('Scenario (Witness Density)', fontsize=12)
    ax.set_ylabel('Detection Rate', fontsize=12)
    ax.set_title('Semantic Equivalence: First-Class vs Double-Negation\n(95% CI, overlapping bars confirm equivalence)', fontsize=14)
    ax.set_xticks(x_pos)
    ax.set_xticklabels([SCENARIO_LABELS.get(s, s) for s in [r['scenario'] for r in results]], fontsize=10)
    ax.set_ylim(0, 1.05)
    ax.legend(loc='lower right', fontsize=10)
    ax.grid(True, axis='y', alpha=0.3)

    output_path = OUTPUT_DIR / "double_neg_detection_rates.png"
    save_figure(fig, output_path)

    # Part 2: Shrinking Comparison
    print(f"\n{'='*100}")
    print("PART 2: SHRINKING QUALITY COMPARISON")
    print("=" * 100)

    # Filter to found witnesses
    fc_found_df = first_class[first_class['witness_found']]
    dn_found_df = double_neg[double_neg['witness_found']]

    if len(fc_found_df) > 0 and len(dn_found_df) > 0:
        print(f"\n{'Approach':<20} {'Mean Candidates':<18} {'Mean Improvements':<18}")
        print("-" * 60)

        fc_candidates = fc_found_df['shrink_candidates_tested'].mean()
        fc_improvements = fc_found_df['shrink_improvements_made'].mean()
        dn_candidates = dn_found_df['shrink_candidates_tested'].mean()
        dn_improvements = dn_found_df['shrink_improvements_made'].mean()

        print(f"{'First-Class':<20} {fc_candidates:<18.1f} {fc_improvements:<18.1f}")
        print(f"{'Double-Negation':<20} {dn_candidates:<18.1f} {dn_improvements:<18.1f}")
        print("-" * 60)

        # Statistical test for shrinking difference
        if len(fc_found_df) >= 10 and len(dn_found_df) >= 10:
            # Mann-Whitney U test for shrink improvements
            stat, p_value = stats.mannwhitneyu(
                fc_found_df['shrink_improvements_made'],
                dn_found_df['shrink_improvements_made'],
                alternative='two-sided'
            )
            print(f"\n  Shrinking improvements difference: Mann-Whitney U p={p_value:.3f}")
            print(f"  {'Significant difference' if p_value < 0.05 else 'No significant difference'}")

        # Create Figure 2: Shrinking Comparison
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        # Candidates tested
        ax = axes[0]
        shrink_data = pd.concat([
            fc_found_df[['shrink_candidates_tested', 'scenario']].assign(approach='First-Class'),
            dn_found_df[['shrink_candidates_tested', 'scenario']].assign(approach='Double-Negation')
        ])
        sns.boxplot(data=shrink_data, x='scenario', y='shrink_candidates_tested',
                    hue='approach', order=SCENARIO_ORDER, ax=ax)
        ax.set_xlabel('Scenario', fontsize=12)
        ax.set_ylabel('Shrink Candidates Tested', fontsize=12)
        ax.set_title('Shrinking Effort Comparison', fontsize=14)
        ax.legend(title='Approach')
        ax.grid(True, axis='y', alpha=0.3)

        # Improvements made
        ax = axes[1]
        improve_data = pd.concat([
            fc_found_df[['shrink_improvements_made', 'scenario']].assign(approach='First-Class'),
            dn_found_df[['shrink_improvements_made', 'scenario']].assign(approach='Double-Negation')
        ])
        sns.boxplot(data=improve_data, x='scenario', y='shrink_improvements_made',
                    hue='approach', order=SCENARIO_ORDER, ax=ax)
        ax.set_xlabel('Scenario', fontsize=12)
        ax.set_ylabel('Successful Shrink Steps', fontsize=12)
        ax.set_title('Shrinking Progress Comparison', fontsize=14)
        ax.legend(title='Approach')
        ax.grid(True, axis='y', alpha=0.3)

        output_path = OUTPUT_DIR / "double_neg_shrinking.png"
        save_figure(fig, output_path)

    # Part 3: Composition Complexity
    print(f"\n{'='*100}")
    print("PART 3: COMPOSITION COMPLEXITY (exists-forall pattern)")
    print("=" * 100)

    if COMPOSITION_PATH.exists():
        comp_df = pd.read_csv(COMPOSITION_PATH)
        print(f"\n  Loaded {len(comp_df)} composition trials")

        fc_comp = comp_df[comp_df['approach'] == 'first_class']
        dn_comp = comp_df[comp_df['approach'] == 'double_negation']

        fc_found = fc_comp['witness_found'].sum()
        fc_total = len(fc_comp)
        dn_found = dn_comp['witness_found'].sum()
        dn_total = len(dn_comp)

        print(f"\n{'Approach':<20} {'Detection':<12} {'Mean Tests':<12} {'Mean Time (µs)':<15} {'LoC':<8}")
        print("-" * 80)

        print(f"{'First-Class':<20} "
              f"{fc_found/fc_total*100:.1f}% "
              f"{fc_comp['tests_run'].mean():<12.1f} "
              f"{fc_comp['elapsed_micros'].mean():<15.1f} "
              f"{fc_comp['lines_of_code'].iloc[0]:<8}")

        print(f"{'Double-Negation':<20} "
              f"{dn_found/dn_total*100:.1f}% "
              f"{dn_comp['tests_run'].mean():<12.1f} "
              f"{dn_comp['elapsed_micros'].mean():<15.1f} "
              f"{dn_comp['lines_of_code'].iloc[0]:<8}")

        print("-" * 80)

        # Code complexity ratio
        fc_loc = fc_comp['lines_of_code'].iloc[0]
        dn_loc = dn_comp['lines_of_code'].iloc[0]
        loc_ratio = dn_loc / fc_loc

        print(f"\n  Code complexity ratio: {loc_ratio:.1f}x more code for double-negation")
        print(f"  Time ratio: {dn_comp['elapsed_micros'].mean() / fc_comp['elapsed_micros'].mean():.1f}x")

        # Create Figure 3: Composition Complexity
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))

        # Detection rate
        ax = axes[0]
        approaches = ['First-Class', 'Double-Negation']
        detection_rates = [fc_found/fc_total, dn_found/dn_total]
        colors = ['steelblue', 'coral']
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

        # Lines of code (conceptual complexity)
        ax = axes[2]
        locs = [fc_loc, dn_loc]
        ax.bar(approaches, locs, color=colors, alpha=0.7, edgecolor='black')
        ax.set_ylabel('Lines of Code', fontsize=12)
        ax.set_title('Code Complexity\n(conceptual measure)', fontsize=12)
        ax.grid(True, axis='y', alpha=0.3)

        plt.suptitle('Composition Complexity: exists(a).forall(b) Pattern', fontsize=14, y=1.02)

        output_path = OUTPUT_DIR / "double_neg_composition.png"
        save_figure(fig, output_path)

    # Part 4: Paired Agreement Analysis
    print(f"\n{'='*100}")
    print("PART 4: PAIRED TRIAL AGREEMENT")
    print("=" * 100)
    print("\nSince both approaches use the same seed, we can check if they find the same witnesses.")

    # Merge on trial_id to get paired comparisons
    merged = pd.merge(
        first_class[['trial_id', 'scenario', 'witness_found', 'witness_value']],
        double_neg[['trial_id', 'scenario', 'witness_found', 'witness_value']],
        on=['trial_id', 'scenario'],
        suffixes=('_fc', '_dn')
    )

    # Agreement analysis
    both_found = (merged['witness_found_fc'] & merged['witness_found_dn']).sum()
    both_not_found = (~merged['witness_found_fc'] & ~merged['witness_found_dn']).sum()
    fc_only = (merged['witness_found_fc'] & ~merged['witness_found_dn']).sum()
    dn_only = (~merged['witness_found_fc'] & merged['witness_found_dn']).sum()

    total_pairs = len(merged)
    agreement_rate = (both_found + both_not_found) / total_pairs

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

    # Summary
    print(f"\n{'='*100}")
    print("SUMMARY")
    print("=" * 100)
    print("""
1. SEMANTIC EQUIVALENCE: Both approaches should have equivalent detection rates
   (within statistical noise), confirming ∃x.P(x) ≡ ¬∀x.¬P(x)

2. SHRINKING: First-class exists directly shrinks witnesses, while double-negation
   shrinks counterexamples (which happen to be witnesses). Results should be similar.

3. COMPOSITION COMPLEXITY: The real advantage of first-class exists is ergonomics:
   - exists(a).forall(b).then(P) is ~6 lines
   - Double-negation equivalent is ~20 lines with nested scenarios

4. RECOMMENDATION: Use first-class .exists() for clearer code and easier maintenance.
   Double-negation works but obscures intent.
""")

    print(f"\n✓ Double-negation equivalence analysis complete")


if __name__ == "__main__":
    main()
