#!/usr/bin/env python3
"""
Efficiency Analysis: Compare tests-to-termination for different property complexities

Key insight: FluentCheck checks confidence every 100 tests (confidenceCheckInterval).
This means:
- Minimum termination: 100 tests (first confidence check)
- always_true: Should always terminate at 100 (trivially achieves confidence)
- Failure properties: May find bug before 100 tests, or achieve confidence at check

Generates:
- Box plot comparing property types
- Histogram showing termination distribution
- Summary statistics table
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from pathlib import Path
from util import save_figure, compute_summary_stats, print_summary_table

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/efficiency.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=== Efficiency Analysis ===\n")
    print("Note: Confidence checked every 100 tests (minimum termination point)\n")
    
    # Load data
    print(f"Loading: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")
    
    # Group by property type
    property_types = sorted(df['property_type'].unique())
    print(f"Property types found: {property_types}\n")
    
    grouped = df.groupby('property_type')
    
    # Compute summary statistics for each property type
    print("Tests-to-Termination Summary:")
    print("=" * 90)
    
    all_stats = {}
    termination_summary = {}
    
    for prop_type in property_types:
        group = grouped.get_group(prop_type)
        tests_run = group['tests_run'].values
        stats = compute_summary_stats(tests_run)
        all_stats[prop_type] = stats
        
        # Termination reasons
        term_counts = group['termination_reason'].value_counts().to_dict()
        termination_summary[prop_type] = term_counts
        
        true_pass_rate = group['true_pass_rate'].iloc[0]
        bug_found_count = group['bug_found'].sum()
        
        print(f"\n{prop_type}:")
        print(f"  True pass rate: {true_pass_rate*100:.1f}%")
        print(f"  Bug found: {bug_found_count}/{len(group)} ({bug_found_count/len(group)*100:.1f}%)")
        print(f"  Termination: {term_counts}")
        print_summary_table(stats, "  ")
    
    # Create visualization with two subplots
    fig, axes = plt.subplots(1, 2, figsize=(16, 7))
    
    # Left: Box plot
    ax1 = axes[0]
    
    # Prepare data for seaborn with better labels
    plot_data = df[['property_type', 'tests_run', 'true_pass_rate', 'bug_found']].copy()
    
    # Create nice labels with pass rate info
    label_map = {}
    for pt in property_types:
        rate = df[df['property_type'] == pt]['true_pass_rate'].iloc[0]
        label_map[pt] = f"{pt}\n({rate*100:.1f}%)"
    
    plot_data['property_label'] = plot_data['property_type'].map(label_map)
    
    # Order by pass rate (descending)
    order = (df.groupby('property_type')['true_pass_rate']
             .first()
             .sort_values(ascending=False)
             .index
             .map(label_map)
             .tolist())
    
    # Color palette based on pass rate
    n_types = len(property_types)
    colors = plt.cm.RdYlGn(np.linspace(0.3, 0.9, n_types))[::-1]
    
    # Suppress the warning by using hue
    sns.boxplot(
        data=plot_data,
        x='property_label',
        y='tests_run',
        ax=ax1,
        hue='property_label',
        palette=dict(zip(order, colors)),
        width=0.6,
        order=order,
        legend=False
    )
    
    # Add swarm plot for individual points
    sns.swarmplot(
        data=plot_data,
        x='property_label',
        y='tests_run',
        ax=ax1,
        color='black',
        alpha=0.3,
        size=3,
        order=order
    )
    
    # Add 100-test reference line
    ax1.axhline(y=100, color='red', linestyle='--', alpha=0.5, 
                label='Min termination (confidence check interval)')
    
    ax1.set_xlabel('Property Type (Pass Rate)')
    ax1.set_ylabel('Tests Run Until Termination')
    ax1.set_title('Efficiency: Tests-to-Termination by Property Complexity')
    ax1.legend(loc='upper right')
    ax1.grid(True, axis='y', alpha=0.3)
    
    # Right: Stacked bar showing termination reasons
    ax2 = axes[1]
    
    term_data = []
    for pt in property_types:
        rate = df[df['property_type'] == pt]['true_pass_rate'].iloc[0]
        terms = termination_summary.get(pt, {})
        term_data.append({
            'property': pt,
            'pass_rate': rate,
            'confidence': terms.get('confidence', 0),
            'bugFound': terms.get('bugFound', 0),
            'maxIterations': terms.get('maxIterations', 0)
        })
    
    term_df = pd.DataFrame(term_data)
    term_df = term_df.sort_values('pass_rate', ascending=False)
    
    x = np.arange(len(term_df))
    width = 0.6
    
    ax2.bar(x, term_df['confidence'], width, label='Confidence achieved', color='#2ca02c', alpha=0.8)
    ax2.bar(x, term_df['bugFound'], width, bottom=term_df['confidence'], 
            label='Bug found', color='#d62728', alpha=0.8)
    ax2.bar(x, term_df['maxIterations'], width, 
            bottom=term_df['confidence'] + term_df['bugFound'],
            label='Max iterations', color='#7f7f7f', alpha=0.8)
    
    ax2.set_xlabel('Property Type')
    ax2.set_ylabel('Number of Trials')
    ax2.set_title('Termination Reasons by Property Complexity')
    ax2.set_xticks(x)
    ax2.set_xticklabels([f"{r['property']}\n({r['pass_rate']*100:.1f}%)" 
                         for _, r in term_df.iterrows()], fontsize=9)
    ax2.legend(loc='upper right')
    ax2.grid(True, axis='y', alpha=0.3)
    
    plt.tight_layout()
    output_path = OUTPUT_DIR / "efficiency_boxplot.png"
    save_figure(fig, output_path)
    
    # Compare efficiency
    print("\n" + "=" * 90)
    print("Efficiency Comparison:")
    print("-" * 90)
    
    # Find baseline (highest pass rate, should be always_true)
    baseline_type = max(all_stats.keys(), 
                        key=lambda pt: df[df['property_type'] == pt]['true_pass_rate'].iloc[0])
    baseline_stats = all_stats[baseline_type]
    
    print(f"\nBaseline ({baseline_type}): {baseline_stats['mean']:.1f} tests (median: {baseline_stats['p50']:.0f})")
    
    for prop_type in sorted(all_stats.keys(), 
                            key=lambda pt: df[df['property_type'] == pt]['true_pass_rate'].iloc[0],
                            reverse=True):
        if prop_type == baseline_type:
            continue
        stats = all_stats[prop_type]
        terms = termination_summary.get(prop_type, {})
        bug_pct = terms.get('bugFound', 0) / sum(terms.values()) * 100 if sum(terms.values()) > 0 else 0
        
        print(f"  {prop_type}: {stats['mean']:.1f} tests ({bug_pct:.0f}% terminated by finding bug)")
    
    # Check for the 100-test minimum behavior
    print(f"\n100-Test Minimum Check:")
    for prop_type in property_types:
        group = df[df['property_type'] == prop_type]
        terms = termination_summary.get(prop_type, {})
        
        # Trials that terminated with confidence should be at 100 tests (or multiples)
        conf_trials = group[group['termination_reason'] == 'confidence']
        if len(conf_trials) > 0:
            unique_tests = conf_trials['tests_run'].unique()
            at_100 = (conf_trials['tests_run'] == 100).sum()
            print(f"  {prop_type}: {at_100}/{len(conf_trials)} confidence terminations at exactly 100 tests")
            if len(unique_tests) <= 3:
                print(f"    Unique test counts: {sorted(unique_tests)}")
    
    print(f"\n✓ Efficiency analysis complete")

if __name__ == "__main__":
    main()
