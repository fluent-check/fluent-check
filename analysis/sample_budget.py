#!/usr/bin/env python3
"""
Sample Budget Distribution Analysis

Metrics:
- Effective Sample Size: Unique values tested per quantifier
- Detection Efficiency: Effective / Total Budget

Generates:
- sample-budget.png: Effective sample size vs Depth
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from pathlib import Path
from util import save_figure

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/sample-budget.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=== Sample Budget Distribution Analysis ===\n")

    if not CSV_PATH.exists():
        print(f"Error: CSV file not found at {CSV_PATH}")
        return

    # 1. Load data
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} rows\n")

    # 2. Compute aggregate statistics
    summary = df.groupby(['depth', 'quantifier_index']).agg({
        'unique_values': 'mean',
        'expected_unique': 'mean'
    }).reset_index()

    # 3. Print summary table
    print("Summary Statistics (Unique Values per Quantifier):")
    print("=" * 80)
    print(f"{'Depth':<10} {'Quantifier':<10} {'Observed':<10} {'Expected':<10} {'Efficiency':<10}")
    print("-" * 80)
    
    unique_depths = sorted(summary['depth'].unique())
    for d in unique_depths:
        d_data = summary[summary['depth'] == d]
        observed = d_data['unique_values'].mean()
        expected = d_data['expected_unique'].mean()
        efficiency = observed / 1000 * 100 # Assuming N=1000
        print(f"{d:<10} {'Avg':<10} {observed:<10.1f} {expected:<10.1f} {efficiency:<9.1f}%")

    # 4. Create visualizations
    fig, ax = plt.subplots(figsize=(10, 6))

    # Plot observed vs expected
    sns.lineplot(x='depth', y='unique_values', data=df, marker='o', label='Observed (Mean)', ax=ax, linewidth=2)
    
    # Plot theoretical N^(1/d)
    x = np.linspace(1, 5, 50)
    y = 1000 ** (1/x)
    ax.plot(x, y, 'r--', label='Theoretical $N^{1/d}$', linewidth=2)
    
    # Plot ideal (N)
    ax.axhline(1000, color='green', linestyle=':', label='Ideal (Random Sampling)')

    ax.set_xlabel('Chain Depth (Number of Quantifiers)')
    ax.set_ylabel('Effective Sample Size (Unique Values)')
    ax.set_title('Effective Sample Size per Quantifier (N=1000)')
    ax.grid(True, alpha=0.3)
    ax.legend()
    ax.set_yscale('log')
    
    plt.tight_layout()
    output_path = OUTPUT_DIR / "sample-budget.png"
    save_figure(fig, output_path)

    # 5. Conclusion
    print("=" * 80)
    print(f"\nConclusion:")
    print("-" * 60)
    
    depth_3_eff = summary[summary['depth'] == 3]['unique_values'].mean()
    if depth_3_eff < 100: # 1000^(1/3) = 10
        print(f"  ✓ Hypothesis supported: Effective sample size collapses with depth.")
        print(f"    At depth 3, only ~{depth_3_eff:.1f} unique values tested per quantifier (vs 1000 budget).")
        print(f"    This is a {1000/depth_3_eff:.1f}x reduction in detection power for single-variable bugs.")
    else:
        print(f"  ✗ Hypothesis not supported.")

    print(f"\n✓ Sample Budget analysis complete")

if __name__ == "__main__":
    main()
