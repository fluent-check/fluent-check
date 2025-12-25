#!/usr/bin/env python3
"""
Shrinking Fairness Analysis: Earlier quantifiers shrink more aggressively

This analysis examines if the position of a quantifier affects how much its
value is shrunken.

Metrics:
- Shrink Percentage: (initial - final) / initial
- Final Values: Average final value per position

Generates:
- shrinking-fairness.png: Box plot of final values by position
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from pathlib import Path
from util import save_figure

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/shrinking-fairness.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=== Shrinking Fairness Analysis ===\n")

    if not CSV_PATH.exists():
        print(f"Error: CSV file not found at {CSV_PATH}")
        return

    # 1. Load data
    df = pd.read_csv(CSV_PATH)
    
    # Filter out trials where no failure was found (initial sum <= 150)
    df = df[(df['initial_a'] + df['initial_b'] + df['initial_c']) > 150]
    print(f"  Loaded {len(df)} trials with valid counterexamples\n")

    # 2. Reshape data for position-based analysis
    # We want to map (a, b, c) to (first, second, third) based on quantifier_order
    rows = []
    for _, row in df.iterrows():
        order = row['quantifier_order']
        vals = {'a': row['final_a'], 'b': row['final_b'], 'c': row['final_c']}
        initials = {'a': row['initial_a'], 'b': row['initial_b'], 'c': row['initial_c']}
        
        # Position mapping
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
            
    pos_df = pd.DataFrame(rows)

    # 3. Print summary table
    summary = pos_df.groupby('position').agg({
        'initial_value': 'mean',
        'final_value': ['mean', 'std'],
        'shrink_amount': 'mean'
    })
    
    print("Summary Statistics by Position:")
    print("=" * 60)
    print(summary)
    print("=" * 60)

    # 4. Statistical tests
    from scipy.stats import f_oneway
    # One-way ANOVA for final values across positions
    groups = [pos_df[pos_df['position'] == p]['final_value'] for p in ['first', 'second', 'third']]
    f_stat, p_val = f_oneway(*groups)
    
    print(f"\nANOVA (Final Values across Positions):")
    print(f"  F-statistic = {f_stat:.4f}")
    print(f"  p-value = {p_val:.4f}")
    print(f"  Interpretation: {'Significant position effect' if p_val < 0.05 else 'No significant position effect'}")

    # 5. Create visualizations
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Left panel: Box plot of final values by position
    ax1 = axes[0]
    sns.boxplot(x='position', y='final_value', data=pos_df, ax=ax1, palette='muted', order=['first', 'second', 'third'])
    ax1.set_xlabel('Quantifier Position')
    ax1.set_ylabel('Final Value')
    ax1.set_title('Distribution of Final Values by Position')

    # Right panel: Average shrink amount
    ax2 = axes[1]
    sns.barplot(x='position', y='shrink_amount', data=pos_df, ax=ax2, palette='muted', order=['first', 'second', 'third'])
    ax2.set_xlabel('Quantifier Position')
    ax2.set_ylabel('Average Shrink Amount')
    ax2.set_title('Average Shrink Amount by Position')

    plt.tight_layout()
    output_path = OUTPUT_DIR / "shrinking-fairness.png"
    save_figure(fig, output_path)

    # 6. Conclusion
    print(f"\nConclusion:")
    print("-" * 60)
    if p_val < 0.05:
        print(f"  ✗ Hypothesis supported: Position DOES affect shrinking behavior.")
    else:
        print(f"  ✓ Hypothesis rejected: Shrinking is fair across positions (no bias detected).")

    print(f"\n✓ Shrinking Fairness analysis complete")

if __name__ == "__main__":
    main()
