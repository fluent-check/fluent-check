#!/usr/bin/env python3
"""
Chained Distribution Analysis: Predictability of flatMap distributions

This analysis verifies that chained arbitraries produce the expected
theoretical distribution.

Metrics:
- Empirical Frequency: Observed count for each result value (1-10)
- Theoretical Frequency: Expected count based on P(k) = (11-k)/55
- Chi-squared: Goodness-of-fit test

Generates:
- chained-distribution.png: Histogram with theoretical overlay and pair heatmap
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from pathlib import Path
from util import save_figure

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/chained-distribution.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=== Chained Distribution Analysis ===\n")

    if not CSV_PATH.exists():
        print(f"Error: CSV file not found at {CSV_PATH}")
        return

    # 1. Load data
    print(f"Loading: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} samples\n")

    # 2. Compute aggregate statistics
    observed_counts = df['result_value'].value_counts().sort_index()
    total_samples = len(df)
    
    # Theoretical P(k) = (1/10) * sum_{n=k}^{10} (1/n)
    k_values = np.arange(1, 11)
    theoretical_probs = np.array([np.sum(1.0 / np.arange(k, 11)) / 10.0 for k in k_values])
    expected_counts = theoretical_probs * total_samples

    # 3. Print summary table
    print("Summary Statistics:")
    print("=" * 60)
    print(f"{ 'Value':>6} | {'Observed %':>12} | {'Expected %':>12} | {'Residual %':>12}")
    print("-" * 60)
    
    for i, k in enumerate(k_values):
        obs_p = (observed_counts.get(k, 0) / total_samples) * 100
        exp_p = theoretical_probs[i] * 100
        res_p = obs_p - exp_p
        print(f"{k:>6} | {obs_p:>11.2f}% | {exp_p:>11.2f}% | {res_p:>11.2f}%")
    print("=" * 60)

    # 4. Statistical hypothesis tests
    # Chi-squared test for goodness of fit
    from scipy.stats import chisquare
    chi2, p_val = chisquare(observed_counts.values, f_exp=expected_counts)
    
    print(f"\nGoodness-of-Fit (Chi-squared):")
    print(f"  χ² = {chi2:.4f}")
    print(f"  p-value = {p_val:.4f}")
    print(f"  Interpretation: {'Matches theory' if p_val > 0.05 else 'Significant deviation'}")

    # 5. Create visualizations
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Left panel: Histogram with theoretical overlay
    ax1 = axes[0]
    sns.barplot(x=observed_counts.index, y=observed_counts.values / total_samples, 
                ax=ax1, alpha=0.7, color='skyblue', label='Observed')
    ax1.plot(np.arange(0, 10), theoretical_probs, 'r--', marker='o', label='Theoretical')
    ax1.set_xlabel('Result Value (k)')
    ax1.set_ylabel('Probability')
    ax1.set_title('Empirical vs Theoretical Distribution')
    ax1.legend()
    ax1.grid(True, axis='y', alpha=0.3)

    # Right panel: Heatmap of (base, result) pairs
    ax2 = axes[1]
    heatmap_data = pd.crosstab(df['result_value'], df['base_value'])
    # Ensure all 1-10 are present
    for i in range(1, 11):
        if i not in heatmap_data.index: heatmap_data.loc[i] = 0
        if i not in heatmap_data.columns: heatmap_data[i] = 0
    heatmap_data = heatmap_data.sort_index(axis=0).sort_index(axis=1)
    
    sns.heatmap(heatmap_data, ax=ax2, annot=False, cmap='YlGnBu')
    ax2.set_xlabel('Base Value (n)')
    ax2.set_ylabel('Result Value (k)')
    ax2.set_title('Frequency Heatmap of (base, result) Pairs')

    plt.tight_layout()
    output_path = OUTPUT_DIR / "chained-distribution.png"
    save_figure(fig, output_path)

    # 6. Conclusion
    print(f"\nConclusion:")
    print("-" * 60)
    if p_val > 0.05:
        print(f"  ✓ Hypothesis supported: flatMap produces the expected distribution.")
    else:
        print(f"  ✗ Hypothesis rejected: Significant deviation from theoretical distribution.")

    print(f"\n✓ Chained Distribution analysis complete")

if __name__ == "__main__":
    main()
