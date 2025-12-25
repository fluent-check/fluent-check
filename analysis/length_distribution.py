#!/usr/bin/env python3
"""
Length Distribution Analysis: Finding boundary bugs faster with biased distributions

This analysis examines if different length distributions affect the detection rate
of length-related bugs.

Metrics:
- Detection Rate: Proportion of trials where the bug was detected
- Tests to Detection: Average number of tests run before finding the bug

Generates:
- length-distribution.png: Grouped bar chart of detection rates
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from pathlib import Path
from util import wilson_score_interval, save_figure

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/length-distribution.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=== Length Distribution Analysis ===\n")

    if not CSV_PATH.exists():
        print(f"Error: CSV file not found at {CSV_PATH}")
        return

    # 1. Load data
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")

    # 2. Compute aggregate statistics
    summary = df.groupby(['bug_type', 'length_distribution']).agg({
        'bug_detected': ['sum', 'count', 'mean'],
        'tests_to_detection': 'median'
    }).reset_index()
    summary.columns = ['bug_type', 'length_distribution', 'detected_sum', 'total_count', 'detection_rate', 'median_tests']

    # Add Wilson CIs
    cis = [wilson_score_interval(s, n) for s, n in zip(summary['detected_sum'], summary['total_count'])]
    summary['ci_lower'] = [ci[0] for ci in cis]
    summary['ci_upper'] = [ci[1] for ci in cis]
    summary['ci_err_lower'] = summary['detection_rate'] - summary['ci_lower']
    summary['ci_err_upper'] = summary['ci_upper'] - summary['detection_rate']

    # 3. Print summary table
    print("Summary Statistics:")
    print("=" * 80)
    print(summary[['bug_type', 'length_distribution', 'detection_rate', 'median_tests']])
    print("=" * 80)

    # 4. Create visualizations
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Left panel: Grouped bar chart - detection rate
    ax1 = axes[0]
    sns.barplot(x='bug_type', y='detection_rate', hue='length_distribution', data=summary, ax=ax1, palette='muted')
    
    # Add error bars manually because seaborn's internal ones aren't Wilson
    # (Simplified for now, seaborn hue handling with manual error bars is tricky)
    
    ax1.set_xlabel('Bug Type')
    ax1.set_ylabel('Detection Rate')
    ax1.set_title('Detection Rate by Bug Type and Distribution')
    ax1.set_ylim(0, 1.1)
    ax1.grid(True, axis='y', alpha=0.3)

    # Right panel: Tests to detection (for detected only)
    ax2 = axes[1]
    detected_df = df[df['bug_detected'] == True]
    sns.boxplot(x='bug_type', y='tests_to_detection', hue='length_distribution', data=detected_df, ax=ax2, palette='muted')
    ax2.set_xlabel('Bug Type')
    ax2.set_ylabel('Tests to Detection')
    ax2.set_title('Tests to Detection (Detected Trials Only)')
    ax2.grid(True, axis='y', alpha=0.3)

    plt.tight_layout()
    output_path = OUTPUT_DIR / "length-distribution.png"
    save_figure(fig, output_path)

    # 5. Conclusion
    print(f"\nConclusion:")
    print("-" * 60)
    
    # Check if edge_biased is generally faster for boundary bugs
    boundary_bugs = ['empty', 'max_boundary']
    edge_results = summary[summary['bug_type'].isin(boundary_bugs)]
    
    faster_count = 0
    for bug in boundary_bugs:
        bug_data = edge_results[edge_results['bug_type'] == bug]
        edge_tests = bug_data[bug_data['length_distribution'] == 'edge_biased']['median_tests'].values[0]
        uniform_tests = bug_data[bug_data['length_distribution'] == 'uniform']['median_tests'].values[0]
        if edge_tests < uniform_tests:
            faster_count += 1
            
    if faster_count > 0:
        print(f"  ✓ Hypothesis supported: Edge-biased distribution found {faster_count} boundary bug types faster than uniform.")
    else:
        print(f"  ✗ Hypothesis rejected: Edge-biased distribution showed no speed improvement.")

    print(f"\n✓ Length Distribution analysis complete")

if __name__ == "__main__":
    main()