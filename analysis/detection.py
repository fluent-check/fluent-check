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
from util import wilson_score_interval, format_ci, save_figure, compute_summary_stats

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
    
    # Define colors and line styles for methods
    method_styles = {
        'fixed_50': {'color': '#ffbb78', 'linestyle': '-', 'linewidth': 1.5},
        'fixed_100': {'color': '#ff7f0e', 'linestyle': '-', 'linewidth': 2},
        'fixed_200': {'color': '#d62728', 'linestyle': '-', 'linewidth': 1.5},
        'fixed_500': {'color': '#c49c94', 'linestyle': '-', 'linewidth': 2},
        'fixed_1000': {'color': '#8c564b', 'linestyle': '-', 'linewidth': 1.5},
        'confidence_0.90': {'color': '#98df8a', 'linestyle': '--', 'linewidth': 1.5},
        'confidence_0.95': {'color': '#2ca02c', 'linestyle': '--', 'linewidth': 2.5},
        'confidence_0.99': {'color': '#1f77b4', 'linestyle': '--', 'linewidth': 2.5},
    }
    
    for method in methods:
        group = df[df['method'] == method]
        style = method_styles.get(method, {'color': 'gray', 'linestyle': '-', 'linewidth': 1})
        
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
    
    print(f"\n✓ Detection rate analysis complete")

if __name__ == "__main__":
    main()
