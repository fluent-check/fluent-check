#!/usr/bin/env python3
"""
Mapped Arbitrary Size Analysis: Do non-bijective maps cause size overestimation?

Analyzes whether non-bijective mappings cause size overestimation and quantifies
the ratio of reported size to actual distinct values.

Metrics:
- Size ratio: reported_size / actual_distinct_values
- Comparison of Legacy (Naive) vs Fixed (Heuristic) estimation

Generates:
- mapped-size.png: Size ratio comparison (Legacy vs Fixed)
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
from util import wilson_score_interval, format_ci, save_figure

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/mapped-size.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=== Mapped Arbitrary Size Analysis ===\n")

    # Load data
    print(f"Loading: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")

    # Group by Implementation and Map Type
    print("Size Ratio (Reported / Actual) by Implementation:")
    print("=" * 80)
    
    stats = []
    map_types = ['bijective', 'surjective_10to1', 'surjective_5to1']
    implementations = ['legacy', 'fixed']
    
    for impl in implementations:
        print(f"\nImplementation: {impl.upper()}")
        for map_type in map_types:
            data = df[(df['map_type'] == map_type) & (df['implementation'] == impl)]
            
            if len(data) == 0: continue

            mean_ratio = data['size_ratio'].mean()
            std_ratio = data['size_ratio'].std()
            
            print(f"  {map_type:20s}: Mean Ratio={mean_ratio:5.2f} (std={std_ratio:.2f})")
            
            stats.append({
                'implementation': impl,
                'map_type': map_type,
                'mean_ratio': mean_ratio,
                'std_ratio': std_ratio
            })

    print("=" * 80)

    # Create visualizations
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Left panel: Size Ratio Comparison (Grouped Bar Chart)
    ax1 = axes[0]
    
    x = np.arange(len(map_types))
    width = 0.35
    
    # Plot Legacy
    legacy_means = [next((s['mean_ratio'] for s in stats if s['implementation'] == 'legacy' and s['map_type'] == mt), 0) for mt in map_types]
    legacy_errs = [next((s['std_ratio'] for s in stats if s['implementation'] == 'legacy' and s['map_type'] == mt), 0) for mt in map_types]
    
    ax1.bar(x - width/2, legacy_means, width, label='Legacy (Naive)', color='#e74c3c', yerr=legacy_errs, capsize=5, alpha=0.8)
    
    # Plot Fixed
    fixed_means = [next((s['mean_ratio'] for s in stats if s['implementation'] == 'fixed' and s['map_type'] == mt), 0) for mt in map_types]
    fixed_errs = [next((s['std_ratio'] for s in stats if s['implementation'] == 'fixed' and s['map_type'] == mt), 0) for mt in map_types]
    
    ax1.bar(x + width/2, fixed_means, width, label='Fixed (Heuristic)', color='#2ecc71', yerr=fixed_errs, capsize=5, alpha=0.8)
    
    ax1.set_ylabel('Size Ratio (Reported / Actual)')
    ax1.set_title('Size Overestimation Ratio')
    ax1.set_xticks(x)
    ax1.set_xticklabels([mt.replace('_', '\n') for mt in map_types])
    ax1.legend()
    ax1.grid(True, axis='y', alpha=0.3)
    
    # Add target line at 1.0 (Ideal)
    ax1.axhline(y=1.0, color='black', linestyle='--', linewidth=1, label='Ideal (1.0)')

    # Right panel: Impact on Union Probabilities (Simulated)
    # We show how the fixed implementation corrects the union bias
    ax2 = axes[1]
    
    # Scenario: Union(Exact100, Surjective10to1)
    # Legacy: Weights 50% / 50% (Wrong, actual size ratio is 10:1)
    # Fixed: Weights ~91% / ~9% (Correct, proportional to distinct values)
    # Target: 91% / 9%
    
    # Calculate derived weights
    legacy_ratio = next((s['mean_ratio'] for s in stats if s['implementation'] == 'legacy' and s['map_type'] == 'surjective_10to1'), 10.0)
    fixed_ratio = next((s['mean_ratio'] for s in stats if s['implementation'] == 'fixed' and s['map_type'] == 'surjective_10to1'), 1.0)
    
    # Assume distinct sizes: A=100, B=10
    # Legacy Reported: A=100, B=100 (due to 10x overestimation) -> Weights 50/50
    # Fixed Reported: A=100, B=10*ratio -> If ratio is 1.0, B=10 -> Weights 100/110 = 91%
    
    distinct_a = 100
    distinct_b = 10
    
    # Legacy
    rep_b_legacy = distinct_b * legacy_ratio
    prob_a_legacy = distinct_a / (distinct_a + rep_b_legacy)
    
    # Fixed
    rep_b_fixed = distinct_b * fixed_ratio
    prob_a_fixed = distinct_a / (distinct_a + rep_b_fixed)
    
    # Ideal
    prob_a_ideal = distinct_a / (distinct_a + distinct_b)
    
    labels = ['Legacy', 'Fixed', 'Ideal']
    values = [prob_a_legacy * 100, prob_a_fixed * 100, prob_a_ideal * 100]
    colors = ['#e74c3c', '#2ecc71', 'gray']
    
    bars = ax2.bar(labels, values, color=colors, alpha=0.8)
    ax2.set_ylabel('Prob(Branch A) (%)')
    ax2.set_title('Union Fairness Correction\n(Exact 100 vs Surjective 10:1)')
    ax2.set_ylim(0, 100)
    ax2.grid(True, axis='y', alpha=0.3)
    
    # Add value labels
    for bar in bars:
        height = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2., height + 1,
                f'{height:.1f}%',
                ha='center', va='bottom')

    plt.tight_layout()
    output_path = OUTPUT_DIR / "mapped-size.png"
    save_figure(fig, output_path)

    # Conclusion
    print(f"\nConclusion:")
    print("-" * 80)
    
    surj_legacy_stat = next((s for s in stats if s['implementation'] == 'legacy' and s['map_type'] == 'surjective_10to1'), None)
    surj_fixed_stat = next((s for s in stats if s['implementation'] == 'fixed' and s['map_type'] == 'surjective_10to1'), None)
    
    if surj_legacy_stat and surj_fixed_stat:
        print(f"Surjective 10:1 Case:")
        print(f"  Legacy Ratio: {surj_legacy_stat['mean_ratio']:.2f}x overestimation")
        print(f"  Fixed Ratio:  {surj_fixed_stat['mean_ratio']:.2f}x (Ideal: 1.0)")
        
        improvement = abs(surj_legacy_stat['mean_ratio'] - 1) / abs(surj_fixed_stat['mean_ratio'] - 1) if abs(surj_fixed_stat['mean_ratio'] - 1) > 0 else 999
        print(f"  Accuracy Improved by factor of {improvement:.1f}x")
    
    print(f"\n✓ Mapped size analysis complete")

if __name__ == "__main__":
    main()