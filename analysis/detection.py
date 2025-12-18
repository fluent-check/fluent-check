#!/usr/bin/env python3
"""
Detection Rate Analysis: Compare bug detection rates across methods

Tests whether confidence-based termination finds rare bugs more reliably
than fixed sample sizes.

Methods compared:
- Fixed N: Run exactly N tests, stop
- Confidence-based: Run until confidence achieved or bug found

Generates:
- Detection rate bar chart with confidence intervals
- Tests-to-termination ECDF (cumulative distribution)
- Summary statistics table
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from pathlib import Path
from util import (
    wilson_score_interval, format_ci, save_figure,
    chi_squared_test, cohens_h, effect_size_interpretation, odds_ratio,
    power_analysis_proportion
)

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/detection.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def method_sort_key(method: str) -> tuple:
    """Sort methods: fixed_* by N ascending, confidence_* by level ascending"""
    if method.startswith('fixed_'):
        return (0, int(method.split('_')[1]))
    elif method.startswith('confidence_'):
        return (1, float(method.split('_')[1]))
    return (2, 0)

def main():
    print("=== Detection Rate Analysis ===\n")
    
    # Load data
    print(f"Loading: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")
    
    # Get bug failure rate
    bug_rate = df['bug_failure_rate'].iloc[0]
    print(f"Bug failure rate: {bug_rate} (1 in {int(1/bug_rate)})\n")
    
    # Group by method
    methods = sorted(df['method'].unique(), key=method_sort_key)
    
    # Compute detection rates
    results = []
    for method in methods:
        group = df[df['method'] == method]
        n = len(group)
        detections = group['bug_found'].sum()
        detection_rate = detections / n
        
        lower, upper = wilson_score_interval(detections, n, 0.95)
        
        mean_tests = group['tests_run'].mean()
        median_tests = group['tests_run'].median()
        
        # Timing analysis
        mean_time_micros = group['elapsed_micros'].mean()
        median_time_micros = group['elapsed_micros'].median()
        mean_time_ms = mean_time_micros / 1000
        
        # ROI metrics
        # Time per test (microseconds)
        time_per_test = mean_time_micros / mean_tests if mean_tests > 0 else 0
        
        # Detection efficiency: bugs found per millisecond
        bugs_found = group['bug_found'].sum()
        total_time_ms = group['elapsed_micros'].sum() / 1000
        detection_per_ms = bugs_found / total_time_ms if total_time_ms > 0 else 0
        
        # Time to first detection (only for trials that found bugs)
        bug_trials = group[group['bug_found']]
        mean_time_to_detection = bug_trials['elapsed_micros'].mean() / 1000 if len(bug_trials) > 0 else np.nan
        
        # Expected detection for fixed methods: 1 - (1-p)^n
        if method.startswith('fixed_'):
            sample_size = int(method.split('_')[1])
            expected = 1 - (1 - bug_rate) ** sample_size
        else:
            expected = None
        
        results.append({
            'method': method,
            'detection_rate': detection_rate,
            'ci_lower': lower,
            'ci_upper': upper,
            'expected_rate': expected,
            'mean_tests': mean_tests,
            'median_tests': median_tests,
            'mean_time_ms': mean_time_ms,
            'median_time_micros': median_time_micros,
            'time_per_test': time_per_test,
            'detection_per_ms': detection_per_ms,
            'mean_time_to_detection': mean_time_to_detection,
            'n_trials': n
        })
    
    results_df = pd.DataFrame(results)
    
    # Print summary table
    print("Detection Rate Results:")
    print("=" * 100)
    print(f"{'Method':<18} {'Rate':<8} {'Expected':<10} {'95% CI':<20} "
          f"{'Mean Tests':<12} {'Median':<10} {'N':<6}")
    print("-" * 100)
    
    for _, row in results_df.iterrows():
        ci_str = format_ci(row['ci_lower'], row['ci_upper'])
        expected_str = f"{row['expected_rate']:.3f}" if pd.notna(row['expected_rate']) else "adaptive"
        print(f"{row['method']:<18} "
              f"{row['detection_rate']:<8.3f} "
              f"{expected_str:<10} "
              f"{ci_str:<20} "
              f"{row['mean_tests']:<12.1f} "
              f"{row['median_tests']:<10.0f} "
              f"{int(row['n_trials']):<6}")
    print("-" * 100)
    
    # Create detection rate bar chart
    fig, ax = plt.subplots(figsize=(12, 7))
    
    x_pos = np.arange(len(results_df))
    
    # Color by method type
    colors = []
    for method in results_df['method']:
        if method.startswith('fixed_'):
            colors.append('#ff7f0e')  # Orange for fixed
        else:
            colors.append('#2ca02c')  # Green for confidence
    
    bars = ax.bar(
        x_pos,
        results_df['detection_rate'],
        yerr=[
            results_df['detection_rate'] - results_df['ci_lower'],
            results_df['ci_upper'] - results_df['detection_rate']
        ],
        capsize=5,
        alpha=0.7,
        edgecolor='black',
        color=colors
    )
    
    # Add expected detection rate markers for fixed methods
    for i, (_, row) in enumerate(results_df.iterrows()):
        if pd.notna(row['expected_rate']):
            ax.scatter([i], [row['expected_rate']], marker='_', s=200, 
                      color='red', zorder=5, linewidth=3)
    
    ax.set_xlabel('Method', fontsize=12)
    ax.set_ylabel('Detection Rate', fontsize=12)
    ax.set_title(f'Bug Detection Rate by Method\n(Bug rate: {bug_rate*100:.1f}% = 1 in {int(1/bug_rate)}, 95% CI)', 
                fontsize=14)
    ax.set_xticks(x_pos)
    ax.set_xticklabels([m.replace('_', '\n') for m in results_df['method']], fontsize=10)
    ax.set_ylim(0, 1.05)
    ax.grid(True, axis='y', alpha=0.3)
    
    # Add legend
    from matplotlib.patches import Patch
    from matplotlib.lines import Line2D
    legend_elements = [
        Patch(facecolor='#ff7f0e', alpha=0.7, label='Fixed N'),
        Patch(facecolor='#2ca02c', alpha=0.7, label='Confidence-based'),
        Line2D([0], [0], marker='_', color='red', linestyle='None', 
               markersize=15, markeredgewidth=3, label='Expected (fixed)')
    ]
    ax.legend(handles=legend_elements, loc='upper left', fontsize=10)
    
    output_path = OUTPUT_DIR / "detection_rates.png"
    save_figure(fig, output_path)
    
    # Create ECDF of tests-to-termination (much clearer than overlapping histograms)
    fig, ax = plt.subplots(figsize=(12, 7))
    
    # Define colors: shades of blue for fixed methods, shades of red for confidence methods
    # All solid lines, same width
    method_styles = {
        'fixed_50': {'color': '#c6dbef', 'linestyle': '-', 'linewidth': 2},      # lightest blue
        'fixed_100': {'color': '#9ecae1', 'linestyle': '-', 'linewidth': 2},     # light blue
        'fixed_200': {'color': '#6baed6', 'linestyle': '-', 'linewidth': 2},     # medium-light blue
        'fixed_500': {'color': '#3182bd', 'linestyle': '-', 'linewidth': 2},     # medium blue
        'fixed_1000': {'color': '#08519c', 'linestyle': '-', 'linewidth': 2},    # dark blue
        'confidence_0.80': {'color': '#fcbba1', 'linestyle': '-', 'linewidth': 2},  # lightest red
        'confidence_0.90': {'color': '#fc9272', 'linestyle': '-', 'linewidth': 2},  # light red
        'confidence_0.95': {'color': '#fb6a4a', 'linestyle': '-', 'linewidth': 2},  # medium red
        'confidence_0.99': {'color': '#de2d26', 'linestyle': '-', 'linewidth': 2},  # dark red
    }
    
    for method in methods:
        group = df[df['method'] == method]
        style = method_styles.get(method, {'color': 'gray', 'linestyle': '-', 'linewidth': 2})
        
        # Plot ECDF
        sns.ecdfplot(
            data=group,
            x='tests_run',
            ax=ax,
            label=method.replace('_', ' '),
            **style
        )
    
    ax.set_xlabel('Tests Run Until Termination', fontsize=12)
    ax.set_ylabel('Cumulative Proportion of Trials', fontsize=12)
    ax.set_title('Termination Speed: Cumulative Distribution by Method\n'
                 '(Higher/left = faster termination)', fontsize=14)
    ax.legend(loc='lower right', fontsize=9, title='Method')
    ax.grid(True, alpha=0.3)
    ax.set_xlim(left=0)
    
    output_path = OUTPUT_DIR / "detection_ecdf.png"
    save_figure(fig, output_path)
    
    # Print insights
    print(f"\nKey Insights:")
    print("-" * 60)
    
    # Best and worst
    best = results_df.loc[results_df['detection_rate'].idxmax()]
    worst = results_df.loc[results_df['detection_rate'].idxmin()]
    
    print(f"  Best detection: {best['method']} ({best['detection_rate']*100:.1f}%)")
    print(f"  Worst detection: {worst['method']} ({worst['detection_rate']*100:.1f}%)")
    
    if worst['detection_rate'] > 0:
        improvement = best['detection_rate'] / worst['detection_rate']
        print(f"  Improvement factor: {improvement:.1f}x")
    
    # Compare fixed vs confidence
    fixed_methods = results_df[results_df['method'].str.startswith('fixed_')]
    conf_methods = results_df[results_df['method'].str.startswith('confidence_')]
    
    if len(fixed_methods) > 0 and len(conf_methods) > 0:
        best_fixed = fixed_methods.loc[fixed_methods['detection_rate'].idxmax()]
        best_conf = conf_methods.loc[conf_methods['detection_rate'].idxmax()]
        
        print(f"\nFixed vs Confidence comparison:")
        print(f"  Best fixed ({best_fixed['method']}): {best_fixed['detection_rate']*100:.1f}% @ {best_fixed['mean_tests']:.0f} mean tests")
        print(f"  Best confidence ({best_conf['method']}): {best_conf['detection_rate']*100:.1f}% @ {best_conf['mean_tests']:.0f} mean tests")
        
        # Efficiency: detection per test
        if best_fixed['mean_tests'] > 0 and best_conf['mean_tests'] > 0:
            fixed_efficiency = best_fixed['detection_rate'] / best_fixed['mean_tests'] * 100
            conf_efficiency = best_conf['detection_rate'] / best_conf['mean_tests'] * 100
            print(f"  Fixed efficiency: {fixed_efficiency:.4f}% detection per test")
            print(f"  Confidence efficiency: {conf_efficiency:.4f}% detection per test")
    
    # Statistical Hypothesis Testing
    print("\n" + "=" * 100)
    print("STATISTICAL HYPOTHESIS TESTS")
    print("=" * 100)
    
    # Compare pairs of methods using Chi-squared tests
    print("\nPairwise Chi-squared Tests (detection rate comparisons):")
    print("-" * 100)
    cohens_h_label = "Cohen's h"
    print(f"{'Comparison':<35} {'Chi²':<10} {'p-value':<12} {'Significant':<12} {cohens_h_label:<12} {'Effect Size':<12}")
    print("-" * 100)
    
    # Key comparisons
    comparisons = [
        ('fixed_100', 'confidence_0.95'),
        ('fixed_500', 'confidence_0.99'),
        ('fixed_1000', 'confidence_0.99'),
        ('confidence_0.90', 'confidence_0.99'),
        ('fixed_100', 'fixed_500'),
    ]
    
    for method1, method2 in comparisons:
        row1 = results_df[results_df['method'] == method1]
        row2 = results_df[results_df['method'] == method2]
        
        if len(row1) == 0 or len(row2) == 0:
            continue
            
        row1 = row1.iloc[0]
        row2 = row2.iloc[0]
        
        # Get raw counts from original data
        g1 = df[df['method'] == method1]
        g2 = df[df['method'] == method2]
        
        n1, n2 = len(g1), len(g2)
        s1 = g1['bug_found'].sum()
        s2 = g2['bug_found'].sum()
        
        # Chi-squared test
        chi2_result = chi_squared_test(s1, n1, s2, n2)
        
        # Effect size
        p1, p2 = row1['detection_rate'], row2['detection_rate']
        h = cohens_h(p1, p2)
        effect = effect_size_interpretation(h)
        
        sig_str = "Yes*" if chi2_result['significant'] else "No"
        
        print(f"{method1} vs {method2:<15} "
              f"{chi2_result['chi2']:<10.3f} "
              f"{chi2_result['p_value']:<12.4f} "
              f"{sig_str:<12} "
              f"{h:<12.3f} "
              f"{effect:<12}")
    
    print("-" * 100)
    print("* Significant at α = 0.05 (with Yates continuity correction)")
    
    # Odds ratios for significant comparisons
    print("\nOdds Ratios (for detection success):")
    print("-" * 80)
    print(f"{'Comparison':<35} {'OR':<10} {'95% CI':<25} {'Interpretation':<20}")
    print("-" * 80)
    
    for method1, method2 in comparisons:
        row1 = results_df[results_df['method'] == method1]
        row2 = results_df[results_df['method'] == method2]
        
        if len(row1) == 0 or len(row2) == 0:
            continue
            
        g1 = df[df['method'] == method1]
        g2 = df[df['method'] == method2]
        
        n1, n2 = len(g1), len(g2)
        s1 = g1['bug_found'].sum()
        s2 = g2['bug_found'].sum()
        
        or_result = odds_ratio(s1, n1, s2, n2)
        
        ci_str = f"[{or_result['ci_lower']:.2f}, {or_result['ci_upper']:.2f}]"
        
        if or_result['odds_ratio'] > 1:
            interp = f"{method1} has higher odds"
        elif or_result['odds_ratio'] < 1:
            interp = f"{method2} has higher odds"
        else:
            interp = "No difference"
        
        print(f"{method1} vs {method2:<15} "
              f"{or_result['odds_ratio']:<10.2f} "
              f"{ci_str:<25} "
              f"{interp:<20}")
    
    print("-" * 80)
    
    # Power analysis
    print("\nPower Analysis:")
    print("-" * 60)
    
    # For the fixed_500 vs confidence_0.99 comparison
    if 'fixed_500' in results_df['method'].values and 'confidence_0.99' in results_df['method'].values:
        p1 = results_df[results_df['method'] == 'fixed_500']['detection_rate'].iloc[0]
        p2 = results_df[results_df['method'] == 'confidence_0.99']['detection_rate'].iloc[0]
        
        h = abs(cohens_h(p1, p2))
        actual_n = len(df[df['method'] == 'fixed_500'])
        required_n = power_analysis_proportion(p1, p2, alpha=0.05, power=0.80)
        
        print(f"  Comparing fixed_500 ({p1*100:.1f}%) vs confidence_0.99 ({p2*100:.1f}%)")
        print(f"  Effect size (Cohen's h): {h:.3f} ({effect_size_interpretation(h)})")
        print(f"  Actual sample size per group: {actual_n}")
        print(f"  Required sample size for 80% power: {required_n}")
        
        if actual_n >= required_n:
            print(f"  → Adequately powered to detect this effect size")
        else:
            print(f"  → Underpowered: need {required_n - actual_n} more samples per group")
    
    print("-" * 60)
    
    # Performance ROI Analysis
    print("\n" + "=" * 100)
    print("PERFORMANCE ROI ANALYSIS")
    print("=" * 100)
    
    print("\nTime Investment by Method:")
    print("-" * 100)
    print(f"{'Method':<18} {'Mean Time (ms)':<16} {'Time/Test (µs)':<16} {'Detection Rate':<16} {'ROI*':<16}")
    print("-" * 100)
    
    for _, row in results_df.iterrows():
        roi = (row['detection_rate'] / row['mean_time_ms'] * 1000) if row['mean_time_ms'] > 0 else 0
        print(f"{row['method']:<18} "
              f"{row['mean_time_ms']:<16.2f} "
              f"{row['time_per_test']:<16.1f} "
              f"{row['detection_rate']*100:<15.1f}% "
              f"{roi:<16.4f}")
    
    print("-" * 100)
    print("* ROI = (detection_rate / time_ms) × 1000 = bugs found per second of testing")
    
    # Time to first detection
    print("\nTime to First Detection (when bug found):")
    print("-" * 80)
    print(f"{'Method':<18} {'Mean Time (ms)':<20} {'Median Time (µs)':<20}")
    print("-" * 80)
    
    for _, row in results_df.iterrows():
        if not np.isnan(row['mean_time_to_detection']):
            print(f"{row['method']:<18} "
                  f"{row['mean_time_to_detection']:<20.2f} "
                  f"{row['median_time_micros']:<20.0f}")
        else:
            print(f"{row['method']:<18} {'N/A':<20} {'N/A':<20}")
    
    print("-" * 80)
    
    # Cost-benefit analysis
    print("\nCost-Benefit Analysis:")
    print("-" * 80)
    
    # Compare best fixed vs best confidence
    if len(fixed_methods) > 0 and len(conf_methods) > 0:
        best_fixed = fixed_methods.loc[fixed_methods['detection_rate'].idxmax()]
        best_conf = conf_methods.loc[conf_methods['detection_rate'].idxmax()]
        
        print(f"\nBest Fixed Method ({best_fixed['method']}):")
        print(f"  Detection rate: {best_fixed['detection_rate']*100:.1f}%")
        print(f"  Mean time: {best_fixed['mean_time_ms']:.2f} ms")
        print(f"  Time per test: {best_fixed['time_per_test']:.1f} µs")
        print(f"  ROI: {(best_fixed['detection_rate'] / best_fixed['mean_time_ms'] * 1000):.4f} bugs/sec")
        
        print(f"\nBest Confidence Method ({best_conf['method']}):")
        print(f"  Detection rate: {best_conf['detection_rate']*100:.1f}%")
        print(f"  Mean time: {best_conf['mean_time_ms']:.2f} ms")
        print(f"  Time per test: {best_conf['time_per_test']:.1f} µs")
        print(f"  ROI: {(best_conf['detection_rate'] / best_conf['mean_time_ms'] * 1000):.4f} bugs/sec")
        
        # Time trade-off
        time_diff = best_fixed['mean_time_ms'] - best_conf['mean_time_ms']
        detection_diff = (best_fixed['detection_rate'] - best_conf['detection_rate']) * 100
        
        print(f"\nTrade-off:")
        if time_diff > 0:
            print(f"  {best_fixed['method']} takes {time_diff:.2f} ms MORE ({(time_diff/best_conf['mean_time_ms']*100):.1f}%)")
        else:
            print(f"  {best_fixed['method']} takes {abs(time_diff):.2f} ms LESS ({(abs(time_diff)/best_fixed['mean_time_ms']*100):.1f}%)")
        
        print(f"  {best_fixed['method']} detects {detection_diff:.1f}% MORE bugs")
        
        # Cost per bug found
        if best_fixed['detection_rate'] > 0:
            cost_per_bug_fixed = best_fixed['mean_time_ms'] / best_fixed['detection_rate']
            print(f"  Cost per bug (fixed): {cost_per_bug_fixed:.2f} ms")
        
        if best_conf['detection_rate'] > 0:
            cost_per_bug_conf = best_conf['mean_time_ms'] / best_conf['detection_rate']
            print(f"  Cost per bug (confidence): {cost_per_bug_conf:.2f} ms")
            
            if best_fixed['detection_rate'] > 0:
                efficiency_ratio = cost_per_bug_fixed / cost_per_bug_conf
                if efficiency_ratio > 1:
                    print(f"  → Confidence is {efficiency_ratio:.2f}x MORE time-efficient per bug")
                else:
                    print(f"  → Fixed is {1/efficiency_ratio:.2f}x MORE time-efficient per bug")
    
    # Find most time-efficient method overall
    results_df['roi'] = (results_df['detection_rate'] / results_df['mean_time_ms'] * 1000)
    best_roi = results_df.loc[results_df['roi'].idxmax()]
    
    print(f"\nMost Time-Efficient Method:")
    print(f"  {best_roi['method']}: {best_roi['roi']:.4f} bugs/sec")
    print(f"  Detection: {best_roi['detection_rate']*100:.1f}% in {best_roi['mean_time_ms']:.2f} ms")
    
    print("-" * 80)
    
    print(f"\n✓ Detection rate analysis complete")

if __name__ == "__main__":
    main()
