#!/usr/bin/env python3
"""
Caching Trade-off Analysis: Detection diversity vs time savings

This analysis examines the impact of CachedSampler on bug detection and diversity.

Metrics:
- Detection Rate: Proportion of trials where the bug was found
- Time Savings: Relative execution time (cache enabled vs disabled)

Generates:
- caching-tradeoff.png: Detection rates comparison
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from util import save_figure

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/caching-tradeoff.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=== Caching Trade-off Analysis ===\n")

    if not CSV_PATH.exists():
        print(f"Error: CSV file not found at {CSV_PATH}")
        return

    # 1. Load data
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")

    # 2. Compute aggregate statistics
    summary = df.groupby(['bug_type', 'cache_enabled']).agg({
        'bug_detected': ['sum', 'count', 'mean'],
        'elapsed_micros': 'mean'
    }).reset_index()
    summary.columns = ['bug_type', 'cache_enabled', 'detected_sum', 'total_count', 'detection_rate', 'mean_time']

    # 3. Print summary table
    print("Summary Statistics:")
    print("=" * 80)
    print(summary[['bug_type', 'cache_enabled', 'detection_rate', 'mean_time']])
    print("=" * 80)

    # 4. Create visualizations
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Left panel: Detection Rate
    ax1 = axes[0]
    sns.barplot(x='bug_type', y='detection_rate', hue='cache_enabled', data=summary, ax=ax1, palette='muted')
    ax1.set_xlabel('Bug Type')
    ax1.set_ylabel('Detection Rate')
    ax1.set_title('Bug Detection Rate (Cache Enabled vs Disabled)')
    ax1.set_ylim(0, 1.1)
    ax1.grid(True, axis='y', alpha=0.3)

    # Right panel: Time Overhead
    ax2 = axes[1]
    sns.barplot(x='bug_type', y='mean_time', hue='cache_enabled', data=summary, ax=ax2, palette='muted')
    ax2.set_xlabel('Bug Type')
    ax2.set_ylabel('Mean Execution Time (µs)')
    ax2.set_title('Execution Time')
    ax2.grid(True, axis='y', alpha=0.3)

    plt.tight_layout()
    output_path = OUTPUT_DIR / "caching-tradeoff.png"
    save_figure(fig, output_path)

    # 5. Conclusion
    print(f"\nConclusion:")
    print("-" * 60)
    
    any_val_cache = summary[(summary['bug_type'] == 'any_value') & (summary['cache_enabled'] == True)]['detection_rate'].values[0]
    any_val_fresh = summary[(summary['bug_type'] == 'any_value') & (summary['cache_enabled'] == False)]['detection_rate'].values[0]
    
    print(f"  Any-Value Bug Detection:")
    print(f"    Cached: {any_val_cache*100:.1f}%")
    print(f"    Fresh : {any_val_fresh*100:.1f}%")
    
    if any_val_fresh > any_val_cache * 1.5:
         print(f"  ✓ Hypothesis supported: Caching significantly reduces detection for 'any-value' bugs.")
    else:
         print(f"  ✗ Hypothesis not supported: Detection rates similar.")

    print(f"\n✓ Caching Trade-off analysis complete")

if __name__ == "__main__":
    main()
