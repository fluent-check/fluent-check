#!/usr/bin/env python3
"""
Filter Cascade Impact Analysis: Does size estimation degrade with filter depth?

Analyzes the accuracy of size estimation when filters are chained, and whether
credible intervals maintain proper coverage as chain depth increases.

Metrics:
- Relative error: (estimated - actual) / actual
- Credible interval coverage rate (target: 95%)
- Error accumulation pattern vs chain depth

Generates:
- filter-cascade.png: Estimation error and CI coverage analysis (Legacy vs Fixed)
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
from util import wilson_score_interval, save_figure

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/filter-cascade.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=== Filter Cascade Impact Analysis ===\n")

    # Load data
    print(f"Loading: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")

    # Filter to 50% pass rate for the main comparison (worst case)
    target_pass_rate = 0.5
    print(f"Analyzing worst-case scenario (Pass Rate = {target_pass_rate*100:.0f}%):")
    
    stats = []
    
    for impl in ['legacy', 'fixed']:
        print(f"\nImplementation: {impl}")
        print("-" * 40)
        
        for depth in [1, 2, 3, 5]:
            data = df[
                (df['chain_depth'] == depth) & 
                (df['filter_pass_rate'] == target_pass_rate) &
                (df['implementation'] == impl)
            ]
            
            if len(data) == 0:
                continue

            # Error stats
            errors = data['relative_error']
            mean_error = errors.mean()
            std_error = errors.std()
            
            # Coverage stats
            coverage_count = data['true_value_in_ci'].sum()
            total = len(data)
            coverage_rate = coverage_count / total
            ci = wilson_score_interval(coverage_count, total)

            print(f"  Depth {depth}: Error={mean_error*100:+.0f}% (std={std_error*100:.0f}%), CI Coverage={coverage_rate*100:.1f}%")

            stats.append({
                'implementation': impl,
                'depth': depth,
                'mean_error': mean_error,
                'std_error': std_error,
                'coverage_rate': coverage_rate,
                'ci_lower': ci[0],
                'ci_upper': ci[1]
            })

    print("=" * 80)

    # Create visualizations
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Left panel: Relative error vs chain depth (Legacy vs Fixed)
    ax1 = axes[0]
    
    colors = {'legacy': '#e74c3c', 'fixed': '#2ecc71'}
    labels = {'legacy': 'Legacy (No Warm-up)', 'fixed': 'Fixed (Warm-up)'}
    markers = {'legacy': 'x', 'fixed': 'o'}
    linestyles = {'legacy': '--', 'fixed': '-'}

    for impl in ['legacy', 'fixed']:
        impl_stats = [s for s in stats if s['implementation'] == impl]
        if not impl_stats: continue
        
        depths = [s['depth'] for s in impl_stats]
        mean_errors = [s['mean_error'] * 100 for s in impl_stats]
        std_errors = [s['std_error'] * 100 for s in impl_stats]

        ax1.plot(depths, mean_errors, marker=markers[impl], label=labels[impl],
                color=colors[impl], linestyle=linestyles[impl], linewidth=2)
        ax1.fill_between(depths,
                         [m - s for m, s in zip(mean_errors, std_errors)],
                         [m + s for m, s in zip(mean_errors, std_errors)],
                         alpha=0.1, color=colors[impl])

    ax1.axhline(y=0, color='black', linestyle='-', alpha=0.3, linewidth=1)
    ax1.set_xlabel('Chain Depth (number of filters)')
    ax1.set_ylabel('Relative Estimation Error (%)')
    ax1.set_title(f'Size Estimation Error (Pass Rate {target_pass_rate*100:.0f}%)')
    ax1.set_xticks([1, 2, 3, 5])
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Log scale y-axis if error is massive (Legacy goes to +3000%)
    # But Fixed stays near 0. Let's try symlog or just let it scale.
    # Given +3600% vs +60%, a linear scale hides the fixed detail, but shows the improvement.
    # Let's use symlog to show both? Or just linear to emphasize the fix magnitude.
    # Linear is fine to show "Look how bad it was".

    # Right panel: CI coverage rate (Legacy vs Fixed)
    ax2 = axes[1]
    
    width = 0.35
    depths = np.array([1, 2, 3, 5])
    
    for i, impl in enumerate(['legacy', 'fixed']):
        impl_stats = [s for s in stats if s['implementation'] == impl]
        if not impl_stats: continue
        
        # Ensure alignment
        impl_depths = [s['depth'] for s in impl_stats]
        if impl_depths != list(depths): continue # Skip if mismatched
        
        rates = [s['coverage_rate'] * 100 for s in impl_stats]
        
        # Offset bars
        x_pos = depths - width/2 + i*width
        
        ax2.bar(x_pos, rates, width, label=labels[impl], color=colors[impl], alpha=0.8)

    ax2.axhline(y=95, color='black', linestyle='--', alpha=0.5, linewidth=2, label='Target (95%)')
    ax2.set_xlabel('Chain Depth')
    ax2.set_ylabel('CI Coverage (%)')
    ax2.set_title(f'Credible Interval Validity (Pass Rate {target_pass_rate*100:.0f}%)')
    ax2.set_xticks(depths)
    ax2.set_ylim(0, 105)
    ax2.legend()
    ax2.grid(True, axis='y', alpha=0.3)

    plt.tight_layout()
    output_path = OUTPUT_DIR / "filter-cascade.png"
    save_figure(fig, output_path)

    # Comparison summary
    print(f"\nConclusion (Depth 5):")
    legacy_d5 = next((s for s in stats if s['implementation'] == 'legacy' and s['depth'] == 5), None)
    fixed_d5 = next((s for s in stats if s['implementation'] == 'fixed' and s['depth'] == 5), None)
    
    if legacy_d5 and fixed_d5:
        legacy_err = legacy_d5['mean_error'] * 100
        fixed_err = fixed_d5['mean_error'] * 100
        reduction = legacy_err / fixed_err if fixed_err != 0 else 0
        
        print(f"  Legacy Error: {legacy_err:+.1f}%")
        print(f"  Fixed Error:  {fixed_err:+.1f}%")
        print(f"  Improvement:  Error reduced by factor of ~{reduction:.1f}x")

    print(f"\n✓ Filter cascade analysis complete")

if __name__ == "__main__":
    main()
