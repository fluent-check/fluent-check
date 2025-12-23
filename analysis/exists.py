#!/usr/bin/env python3
"""
Existential Quantifier Analysis: Witness Detection Study

Analyzes FluentCheck's .exists() efficiency across different scenarios:
- Sparse witnesses (needle in haystack)
- Dense witnesses (many valid values)
- Mixed quantifier patterns (exists-forall, forall-exists)

Generates:
- Detection rate bar chart by scenario
- Detection rate vs sample size line plot
- Tests-to-witness distribution (box plots)
- Efficiency analysis (theoretical vs observed)
- Summary statistics table
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from pathlib import Path
from scipy import stats
from util import wilson_score_interval, format_ci, save_figure

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/exists.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Scenario display names and ordering
SCENARIO_ORDER = ['sparse', 'rare', 'moderate', 'dense', 'exists_forall', 'forall_exists']
SCENARIO_LABELS = {
    'sparse': 'Sparse\n(0.01%)',
    'rare': 'Rare\n(1%)',
    'moderate': 'Moderate\n(10%)',
    'dense': 'Dense\n(50%)',
    'exists_forall': 'Exists-Forall\n(~50%)',
    'forall_exists': 'Forall-Exists\n(0.01%/a)'
}

def expected_detection_rate(density: float, sample_size: int, scenario: str = '') -> float:
    """
    Calculate expected detection rate based on geometric distribution.
    P(find witness in n trials) = 1 - (1 - d)^n
    
    Note: For forall-exists patterns, this formula doesn't apply directly
    because we need to find witnesses for ALL forall values, not just one.
    """
    # forall_exists is a special case - theoretical formula doesn't apply
    # because we need success for ALL 'a' values, not just finding one witness
    if scenario == 'forall_exists':
        # This pattern requires finding b=-a for each of 21 'a' values
        # Success probability per 'a' with n samples ≈ 1-(1-d)^n
        # But we need success for ALL 21, so P = P_single^21
        # This is essentially 0 unless sample budget per 'a' is high
        per_a_success = 1 - (1 - density) ** max(1, sample_size // 21)
        return per_a_success ** 21
    return 1 - (1 - density) ** sample_size


def main():
    print("=== Existential Quantifier Analysis ===\n")
    
    # Load data
    print(f"Loading: {CSV_PATH}")
    if not CSV_PATH.exists():
        print(f"ERROR: {CSV_PATH} not found. Run the study first:")
        print("  npm run evidence:generate")
        return
    
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")
    
    # Summary by scenario and sample size
    print("=" * 100)
    print("DETECTION RATES BY SCENARIO AND SAMPLE SIZE")
    print("=" * 100)
    
    results = []
    for scenario in SCENARIO_ORDER:
        if scenario not in df['scenario'].values:
            continue
        scenario_df = df[df['scenario'] == scenario]
        
        for sample_size in sorted(scenario_df['sample_size'].unique()):
            group = scenario_df[scenario_df['sample_size'] == sample_size]
            n = len(group)
            detections = group['witness_found'].sum()
            detection_rate = detections / n
            density = group['witness_density'].iloc[0]
            
            lower, upper = wilson_score_interval(detections, n, 0.95)
            expected = expected_detection_rate(density, sample_size, scenario)
            
            mean_tests = group['tests_run'].mean()
            median_tests = group['tests_run'].median()
            mean_time = group['elapsed_micros'].mean()
            
            results.append({
                'scenario': scenario,
                'sample_size': sample_size,
                'witness_density': density,
                'detection_rate': detection_rate,
                'expected_rate': expected,
                'ci_lower': lower,
                'ci_upper': upper,
                'mean_tests': mean_tests,
                'median_tests': median_tests,
                'mean_time_micros': mean_time,
                'n_trials': n
            })
    
    results_df = pd.DataFrame(results)
    
    # Print summary table
    print(f"\n{'Scenario':<15} {'N':<6} {'Density':<10} {'Detection':<10} {'Expected':<10} "
          f"{'95% CI':<20} {'Mean Tests':<12} {'Trials':<8}")
    print("-" * 100)
    
    for _, row in results_df.iterrows():
        ci_str = format_ci(row['ci_lower'], row['ci_upper'])
        print(f"{row['scenario']:<15} "
              f"{int(row['sample_size']):<6} "
              f"{row['witness_density']*100:<10.2f}% "
              f"{row['detection_rate']*100:<10.1f}% "
              f"{row['expected_rate']*100:<10.1f}% "
              f"{ci_str:<20} "
              f"{row['mean_tests']:<12.1f} "
              f"{int(row['n_trials']):<8}")
    
    print("-" * 100)
    
    # Create Figure 1: Detection Rate by Scenario (aggregated across sample sizes)
    fig, ax = plt.subplots(figsize=(12, 7))
    
    scenario_results = []
    for scenario in SCENARIO_ORDER:
        if scenario not in df['scenario'].values:
            continue
        group = df[df['scenario'] == scenario]
        n = len(group)
        detections = group['witness_found'].sum()
        detection_rate = detections / n
        density = group['witness_density'].iloc[0]
        lower, upper = wilson_score_interval(detections, n, 0.95)
        
        scenario_results.append({
            'scenario': scenario,
            'label': SCENARIO_LABELS.get(scenario, scenario),
            'detection_rate': detection_rate,
            'ci_lower': lower,
            'ci_upper': upper,
            'density': density
        })
    
    scenario_df = pd.DataFrame(scenario_results)
    
    x_pos = np.arange(len(scenario_df))
    colors = sns.color_palette("viridis", len(scenario_df))
    
    # Calculate error bars, ensuring no negative values
    yerr_lower = np.maximum(0, scenario_df['detection_rate'] - scenario_df['ci_lower'])
    yerr_upper = np.maximum(0, scenario_df['ci_upper'] - scenario_df['detection_rate'])
    
    ax.bar(
        x_pos,
        scenario_df['detection_rate'],
        yerr=[yerr_lower, yerr_upper],
        capsize=5,
        alpha=0.7,
        edgecolor='black',
        color=colors
    )
    
    ax.set_xlabel('Scenario', fontsize=12)
    ax.set_ylabel('Detection Rate', fontsize=12)
    ax.set_title('Witness Detection Rate by Scenario\n(95% CI)', fontsize=14)
    ax.set_xticks(x_pos)
    ax.set_xticklabels(scenario_df['label'], fontsize=10)
    ax.set_ylim(0, 1.05)
    ax.grid(True, axis='y', alpha=0.3)
    
    # Add expected rate markers based on average sample size
    avg_sample_size = df['sample_size'].mean()
    for i, row in scenario_df.iterrows():
        expected = expected_detection_rate(row['density'], int(avg_sample_size), row['scenario'])
        ax.scatter([i], [expected], marker='_', s=200, color='red', zorder=5, linewidth=3)
    
    from matplotlib.lines import Line2D
    legend_elements = [
        Line2D([0], [0], marker='_', color='red', linestyle='None',
               markersize=15, markeredgewidth=3, label='Expected (theoretical)')
    ]
    ax.legend(handles=legend_elements, loc='upper left', fontsize=10)
    
    output_path = OUTPUT_DIR / "exists_detection_rates.png"
    save_figure(fig, output_path)
    
    # Create Figure 2: Detection Rate vs Sample Size (line plot)
    fig, ax = plt.subplots(figsize=(12, 7))
    
    # Colors for scenarios
    palette = sns.color_palette("husl", len(SCENARIO_ORDER))
    scenario_colors = dict(zip(SCENARIO_ORDER, palette))
    
    for scenario in SCENARIO_ORDER:
        if scenario not in df['scenario'].values:
            continue
        
        scenario_data = results_df[results_df['scenario'] == scenario]
        if len(scenario_data) == 0:
            continue
        
        color = scenario_colors[scenario]
        
        # Plot observed detection rate
        ax.plot(
            scenario_data['sample_size'],
            scenario_data['detection_rate'],
            marker='o',
            linewidth=2,
            markersize=8,
            label=SCENARIO_LABELS.get(scenario, scenario).replace('\n', ' '),
            color=color
        )
        
        # Plot expected (theoretical) detection rate with dashed line
        density = scenario_data['witness_density'].iloc[0]
        sample_sizes = np.linspace(10, 550, 100)
        expected_rates = [expected_detection_rate(density, int(n), scenario) for n in sample_sizes]
        ax.plot(
            sample_sizes,
            expected_rates,
            linestyle='--',
            alpha=0.5,
            color=color
        )
    
    ax.set_xlabel('Sample Size', fontsize=12)
    ax.set_ylabel('Detection Rate', fontsize=12)
    ax.set_title('Witness Detection Rate vs Sample Size\n(Solid: observed, Dashed: theoretical)', fontsize=14)
    ax.legend(loc='lower right', fontsize=9, ncol=2)
    ax.grid(True, alpha=0.3)
    ax.set_ylim(0, 1.05)
    ax.set_xlim(0, 550)
    
    output_path = OUTPUT_DIR / "exists_vs_sample_size.png"
    save_figure(fig, output_path)
    
    # Create Figure 3: Tests-to-Witness Distribution (box plots)
    fig, ax = plt.subplots(figsize=(12, 7))
    
    # Filter to only trials that found a witness
    found_df = df[df['witness_found'] == True].copy()
    
    if len(found_df) > 0:
        # Order scenarios
        found_df['scenario_order'] = found_df['scenario'].map(
            {s: i for i, s in enumerate(SCENARIO_ORDER)}
        )
        found_df = found_df.sort_values('scenario_order')
        
        sns.boxplot(
            data=found_df,
            x='scenario',
            y='tests_run',
            order=[s for s in SCENARIO_ORDER if s in found_df['scenario'].values],
            palette='viridis',
            ax=ax
        )
        
        ax.set_xlabel('Scenario', fontsize=12)
        ax.set_ylabel('Tests Run Before Witness Found', fontsize=12)
        ax.set_title('Tests-to-Witness Distribution\n(Lower = faster witness detection)', fontsize=14)
        ax.set_xticklabels([SCENARIO_LABELS.get(s, s) for s in SCENARIO_ORDER 
                          if s in found_df['scenario'].values], fontsize=10)
        ax.grid(True, axis='y', alpha=0.3)
    else:
        ax.text(0.5, 0.5, 'No witnesses found in any trial', 
               ha='center', va='center', fontsize=14)
    
    output_path = OUTPUT_DIR / "exists_tests_to_witness.png"
    save_figure(fig, output_path)
    
    # Print key insights
    print(f"\n{'='*100}")
    print("KEY INSIGHTS")
    print("=" * 100)
    
    # Best and worst scenarios
    agg_by_scenario = results_df.groupby('scenario').agg({
        'detection_rate': 'mean',
        'mean_tests': 'mean'
    }).reset_index()
    
    best = agg_by_scenario.loc[agg_by_scenario['detection_rate'].idxmax()]
    worst = agg_by_scenario.loc[agg_by_scenario['detection_rate'].idxmin()]
    
    print(f"\n  Best detection: {best['scenario']} ({best['detection_rate']*100:.1f}% avg)")
    print(f"  Worst detection: {worst['scenario']} ({worst['detection_rate']*100:.1f}% avg)")
    
    # Efficiency analysis
    print(f"\n  Efficiency Analysis:")
    print("-" * 60)
    
    for scenario in SCENARIO_ORDER:
        if scenario not in df['scenario'].values:
            continue
        scenario_data = df[df['scenario'] == scenario]
        found_data = scenario_data[scenario_data['witness_found'] == True]
        
        if len(found_data) > 0:
            mean_tests_to_find = found_data['tests_run'].mean()
            mean_time = found_data['elapsed_micros'].mean()
            detection_rate = len(found_data) / len(scenario_data) * 100
            print(f"  {scenario}: {detection_rate:.1f}% detection, "
                  f"{mean_tests_to_find:.1f} avg tests when found, "
                  f"{mean_time:.1f} µs avg time")
        else:
            print(f"  {scenario}: 0% detection (no witnesses found)")
    
    # Theoretical vs Observed comparison
    print(f"\n  Theoretical vs Observed Comparison:")
    print("-" * 80)
    print(f"  {'Scenario':<15} {'Sample':<8} {'Observed':<12} {'Expected':<12} {'Diff':<10}")
    print("-" * 80)
    
    for _, row in results_df.iterrows():
        diff = (row['detection_rate'] - row['expected_rate']) * 100
        diff_str = f"{diff:+.1f}%"
        print(f"  {row['scenario']:<15} "
              f"{int(row['sample_size']):<8} "
              f"{row['detection_rate']*100:<12.1f}% "
              f"{row['expected_rate']*100:<12.1f}% "
              f"{diff_str:<10}")
    
    print("-" * 80)
    
    # Chi-squared goodness-of-fit test
    print(f"\n{'='*100}")
    print("CHI-SQUARED GOODNESS-OF-FIT TEST (Observed vs Expected)")
    print("=" * 100)
    print("\nVerifying that observed detection rates match theoretical expectations.")
    print("p > 0.05 indicates no significant deviation from theory.\n")
    
    chi_results = []
    for scenario in SCENARIO_ORDER:
        if scenario not in df['scenario'].values:
            continue
        
        scenario_df = df[df['scenario'] == scenario]
        
        for sample_size in sorted(scenario_df['sample_size'].unique()):
            group = scenario_df[scenario_df['sample_size'] == sample_size]
            n = len(group)
            observed_found = group['witness_found'].sum()
            observed_not_found = n - observed_found
            
            density = group['witness_density'].iloc[0]
            expected_rate = expected_detection_rate(density, sample_size, scenario)
            expected_found = expected_rate * n
            expected_not_found = n - expected_found
            
            # Chi-squared test: observed vs expected for [found, not_found]
            # Skip if expected counts are too small
            if expected_found < 5 or expected_not_found < 5:
                chi2, p_value = np.nan, np.nan
            else:
                chi2, p_value = stats.chisquare(
                    [observed_found, observed_not_found],
                    [expected_found, expected_not_found]
                )
            
            chi_results.append({
                'scenario': scenario,
                'sample_size': sample_size,
                'n': n,
                'observed': observed_found / n,
                'expected': expected_rate,
                'chi2': chi2,
                'p_value': p_value,
                'matches_theory': p_value > 0.05 if not np.isnan(p_value) else None
            })
    
    chi_df = pd.DataFrame(chi_results)
    
    print(f"{'Scenario':<15} {'N':<6} {'Obs':<10} {'Exp':<10} {'χ²':<10} {'p-value':<10} {'Match':<8}")
    print("-" * 80)
    
    for _, row in chi_df.iterrows():
        if np.isnan(row['chi2']):
            chi_str = "N/A"
            p_str = "N/A"
            match = "skip"
        else:
            chi_str = f"{row['chi2']:.2f}"
            p_str = f"{row['p_value']:.3f}"
            match = "✓" if row['matches_theory'] else "✗"
        
        print(f"{row['scenario']:<15} "
              f"{int(row['sample_size']):<6} "
              f"{row['observed']*100:<10.1f}% "
              f"{row['expected']*100:<10.1f}% "
              f"{chi_str:<10} "
              f"{p_str:<10} "
              f"{match:<8}")
    
    print("-" * 80)
    
    # Summary of chi-squared results
    valid_tests = chi_df[~chi_df['chi2'].isna()]
    if len(valid_tests) > 0:
        matching = valid_tests['matches_theory'].sum()
        total = len(valid_tests)
        print(f"\n  Statistical equivalence: {matching}/{total} tests match theory (p > 0.05)")
        
        if matching == total:
            print("  ✓ All observed rates match theoretical expectations")
        else:
            print("  ⚠ Some deviations detected - investigate potential RNG or methodology issues")
    
    # ROI Analysis
    print(f"\n{'='*100}")
    print("PERFORMANCE ROI ANALYSIS")
    print("=" * 100)
    
    print(f"\n  Time Efficiency by Scenario:")
    print("-" * 80)
    print(f"  {'Scenario':<15} {'Mean Time (µs)':<18} {'Time/Test (µs)':<18} {'Detection':<15}")
    print("-" * 80)
    
    for scenario in SCENARIO_ORDER:
        if scenario not in df['scenario'].values:
            continue
        scenario_data = df[df['scenario'] == scenario]
        mean_time = scenario_data['elapsed_micros'].mean()
        mean_tests = scenario_data['tests_run'].mean()
        time_per_test = mean_time / mean_tests if mean_tests > 0 else 0
        detection_rate = scenario_data['witness_found'].mean() * 100
        
        print(f"  {scenario:<15} "
              f"{mean_time:<18.1f} "
              f"{time_per_test:<18.2f} "
              f"{detection_rate:<14.1f}%")
    
    print("-" * 80)
    
    print(f"\n✓ Existential quantifier analysis complete")


if __name__ == "__main__":
    main()
