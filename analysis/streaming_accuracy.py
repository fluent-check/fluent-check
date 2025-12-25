#!/usr/bin/env python3
"""
Streaming Statistics Accuracy Analysis: Calibration of Bayesian Confidence

Metrics:
- Calibration Error: |Mean Confidence - Observed Accuracy| per bin
- ECE (Expected Calibration Error): Weighted average of errors

Generates:
- streaming-accuracy.png: Reliability diagrams (Calibration plots)
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from pathlib import Path
from util import save_figure

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/streaming-accuracy.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=== Streaming Statistics Accuracy Analysis ===\n")

    if not CSV_PATH.exists():
        print(f"Error: CSV file not found at {CSV_PATH}")
        return

    # 1. Load data
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")

    # 2. Binning
    # Create bins for confidence: [0, 0.1, ..., 1.0]
    bins = np.linspace(0, 1, 11)
    df['conf_bin'] = pd.cut(df['confidence'], bins=bins, include_lowest=True)

    # 3. Analyze per sample size
    sample_sizes = sorted(df['n'].unique())
    
    fig, axes = plt.subplots(1, len(sample_sizes), figsize=(5 * len(sample_sizes), 5), sharey=True)
    if len(sample_sizes) == 1:
        axes = [axes]

    print("Calibration Analysis (ECE = Expected Calibration Error):")
    print("=" * 80)
    print(f"{ 'Sample Size':<12} {'ECE':<10} {'Max Error':<10}")
    print("-" * 80)

    for i, n in enumerate(sample_sizes):
        data = df[df['n'] == n]
        
        # Calculate stats per bin
        grouped = data.groupby('conf_bin', observed=False).agg({
            'confidence': 'mean',
            'truth': 'mean',
            'trial_id': 'count'
        }).rename(columns={'confidence': 'avg_conf', 'truth': 'accuracy', 'trial_id': 'count'})
        
        # Calculate ECE
        total_count = grouped['count'].sum()
        grouped['error'] = np.abs(grouped['avg_conf'] - grouped['accuracy'])
        grouped['weighted_error'] = grouped['error'] * grouped['count']
        ece = grouped['weighted_error'].sum() / total_count
        max_error = grouped['error'].max()

        print(f"n={n:<10} {ece:.4f}     {max_error:.4f}")

        # Plot
        ax = axes[i]
        
        # Perfect calibration line
        ax.plot([0, 1], [0, 1], 'k--', alpha=0.5, label='Perfect')
        
        # Observed
        ax.plot(grouped['avg_conf'], grouped['accuracy'], 'o-', linewidth=2, label=f'n={n}')
        
        # Histogram of confidence distribution (scaled)
        # ax2 = ax.twinx()
        # ax2.bar(grouped.index.astype(str), grouped['count'], alpha=0.2)
        
        ax.set_xlabel('Predicted Confidence')
        if i == 0:
            ax.set_ylabel('Observed Accuracy')
        ax.set_title(f'Reliability Diagram (n={n})\nECE={ece:.3f}')
        ax.grid(True, alpha=0.3)
        ax.set_aspect('equal')
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.legend(loc='upper left')

    plt.tight_layout()
    output_path = OUTPUT_DIR / "streaming-accuracy.png"
    save_figure(fig, output_path)

    # 5. Conclusion
    print("=" * 80)
    print(f"\nConclusion:")
    print("-" * 60)
    
    # Check if max ECE is acceptable
    max_ece = 0
    for n in sample_sizes:
        data = df[df['n'] == n]
        grouped = data.groupby('conf_bin', observed=False).agg({
            'confidence': 'mean', 'truth': 'mean', 'trial_id': 'count'
        })
        
        avg_conf = grouped['confidence']
        acc = grouped['truth']
        count = grouped['trial_id']
        
        # Filter bins with no data to avoid NaN
        mask = count > 0
        if mask.sum() > 0:
            avg_conf = avg_conf[mask]
            acc = acc[mask]
            count = count[mask]
            
            ece = (np.abs(avg_conf - acc) * count).sum() / count.sum()
            max_ece = max(max_ece, ece)
        
    if max_ece < 0.05:
        print(f"  ✓ Hypothesis supported: Confidence is well-calibrated (ECE < 0.05).")
        print(f"    Max ECE observed: {max_ece:.4f}")
    else:
        print(f"  ✗ Hypothesis rejected: Calibration error too high.")
        print(f"    Max ECE observed: {max_ece:.4f}")

    print(f"\n✓ Streaming Accuracy analysis complete")

if __name__ == "__main__":
    main()
