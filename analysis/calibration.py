#!/usr/bin/env python3
"""
Calibration Analysis: Sensitivity/Specificity of Confidence-Based Termination

Instead of traditional calibration (predicted vs observed), this measures
how reliably the system distinguishes between:
- Properties where pass_rate > threshold (should achieve confidence)
- Properties where pass_rate < threshold (should find bugs)

Metrics:
- Sensitivity (TPR): When threshold IS met, how often do we correctly achieve confidence?
- Specificity (TNR): When threshold NOT met, how often do we correctly find bugs?
- Precision (PPV): When we claim confidence, how often is threshold actually met?

Generates:
- Confusion matrix heatmap
- ROC-like sensitivity/specificity by pass rate
- Summary statistics
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
from util import wilson_score_interval, format_ci, save_figure

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/calibration.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=== Calibration Analysis (Sensitivity/Specificity) ===\n")
    
    # Load data
    print(f"Loading: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")
    
    # Check if outcome column exists (new format)
    has_outcome = 'outcome' in df.columns
    
    if has_outcome:
        # Use pre-computed outcomes
        tp = (df['outcome'] == 'TP').sum()
        fn = (df['outcome'] == 'FN').sum()
        tn = (df['outcome'] == 'TN').sum()
        fp = (df['outcome'] == 'FP').sum()
    else:
        # Compute outcomes from threshold_actually_met and bug_found
        df['outcome'] = df.apply(lambda r: 
            'TP' if r['threshold_actually_met'] and not r['bug_found'] else
            'FN' if r['threshold_actually_met'] and r['bug_found'] else
            'TN' if not r['threshold_actually_met'] and r['bug_found'] else
            'FP', axis=1)
        tp = (df['outcome'] == 'TP').sum()
        fn = (df['outcome'] == 'FN').sum()
        tn = (df['outcome'] == 'TN').sum()
        fp = (df['outcome'] == 'FP').sum()
    
    # Print confusion matrix
    print("Confusion Matrix:")
    print("=" * 60)
    print(f"                     Predicted")
    print(f"                     Confidence    Bug Found")
    print(f"Actual  Met:         TP={tp:<6}      FN={fn:<6}")
    print(f"        Not Met:     FP={fp:<6}      TN={tn:<6}")
    print("=" * 60)
    
    # Calculate metrics
    total_met = tp + fn
    total_not_met = tn + fp
    total_confidence = tp + fp
    total_bug = tn + fn
    
    sensitivity = tp / total_met if total_met > 0 else 0
    specificity = tn / total_not_met if total_not_met > 0 else 0
    precision = tp / total_confidence if total_confidence > 0 else 0
    accuracy = (tp + tn) / len(df)
    
    # Wilson score CIs for metrics
    sens_ci = wilson_score_interval(tp, total_met, 0.95) if total_met > 0 else (0, 0)
    spec_ci = wilson_score_interval(tn, total_not_met, 0.95) if total_not_met > 0 else (0, 0)
    prec_ci = wilson_score_interval(tp, total_confidence, 0.95) if total_confidence > 0 else (0, 0)
    
    print(f"\nPerformance Metrics:")
    print("-" * 60)
    print(f"Sensitivity (TPR): {sensitivity:.1%} {format_ci(sens_ci[0], sens_ci[1])}")
    print(f"  When threshold IS met, probability of achieving confidence")
    print(f"Specificity (TNR): {specificity:.1%} {format_ci(spec_ci[0], spec_ci[1])}")
    print(f"  When threshold NOT met, probability of finding bug")
    print(f"Precision (PPV):   {precision:.1%} {format_ci(prec_ci[0], prec_ci[1])}")
    print(f"  When confidence claimed, probability threshold actually met")
    print(f"Accuracy:          {accuracy:.1%}")
    print("-" * 60)
    
    # Breakdown by pass rate
    print(f"\nBreakdown by True Pass Rate:")
    print("=" * 90)
    print(f"{'Pass Rate':<12} {'N':<6} {'TP':<6} {'FN':<6} {'TN':<6} {'FP':<6} {'Sensitivity':<15} {'Specificity':<15}")
    print("-" * 90)
    
    results_by_rate = []
    for rate in sorted(df['true_pass_rate'].unique(), reverse=True):
        group = df[df['true_pass_rate'] == rate]
        n = len(group)
        g_tp = (group['outcome'] == 'TP').sum()
        g_fn = (group['outcome'] == 'FN').sum()
        g_tn = (group['outcome'] == 'TN').sum()
        g_fp = (group['outcome'] == 'FP').sum()
        
        g_total_met = g_tp + g_fn
        g_total_not_met = g_tn + g_fp
        
        g_sens = g_tp / g_total_met if g_total_met > 0 else None
        g_spec = g_tn / g_total_not_met if g_total_not_met > 0 else None
        
        sens_str = f"{g_sens:.1%}" if g_sens is not None else "N/A"
        spec_str = f"{g_spec:.1%}" if g_spec is not None else "N/A"
        
        threshold = group['threshold'].iloc[0]
        met_status = "MET" if rate > threshold else "NOT MET"
        
        print(f"{rate:<12.3f} {n:<6} {g_tp:<6} {g_fn:<6} {g_tn:<6} {g_fp:<6} {sens_str:<15} {spec_str:<15} [{met_status}]")
        
        results_by_rate.append({
            'pass_rate': rate,
            'threshold_met': rate > threshold,
            'sensitivity': g_sens,
            'specificity': g_spec,
            'n': n
        })
    
    print("-" * 90)
    
    results_df = pd.DataFrame(results_by_rate)
    
    # Create visualization
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # Left: Sensitivity by pass rate (for threshold MET scenarios)
    ax1 = axes[0]
    met_df = results_df[results_df['threshold_met'] == True].copy()
    if len(met_df) > 0:
        met_df = met_df.sort_values('pass_rate')
        ax1.bar(range(len(met_df)), met_df['sensitivity'].fillna(0), 
                color='#2ca02c', alpha=0.7, edgecolor='black')
        ax1.set_xticks(range(len(met_df)))
        ax1.set_xticklabels([f"{r:.1%}" for r in met_df['pass_rate']], rotation=45)
        ax1.set_xlabel('True Pass Rate')
        ax1.set_ylabel('Sensitivity (True Positive Rate)')
        ax1.set_title('Sensitivity: When Threshold MET\nHow often do we correctly achieve confidence?')
        ax1.set_ylim(0, 1.05)
        ax1.axhline(y=0.95, color='red', linestyle='--', alpha=0.5, label='95% target')
        ax1.legend()
        ax1.grid(True, axis='y', alpha=0.3)
    
    # Right: Specificity by pass rate (for threshold NOT MET scenarios)
    ax2 = axes[1]
    not_met_df = results_df[results_df['threshold_met'] == False].copy()
    if len(not_met_df) > 0:
        not_met_df = not_met_df.sort_values('pass_rate', ascending=False)
        ax2.bar(range(len(not_met_df)), not_met_df['specificity'].fillna(0),
                color='#d62728', alpha=0.7, edgecolor='black')
        ax2.set_xticks(range(len(not_met_df)))
        ax2.set_xticklabels([f"{r:.1%}" for r in not_met_df['pass_rate']], rotation=45)
        ax2.set_xlabel('True Pass Rate')
        ax2.set_ylabel('Specificity (True Negative Rate)')
        ax2.set_title('Specificity: When Threshold NOT MET\nHow often do we correctly find bugs?')
        ax2.set_ylim(0, 1.05)
        ax2.axhline(y=0.95, color='red', linestyle='--', alpha=0.5, label='95% target')
        ax2.legend()
        ax2.grid(True, axis='y', alpha=0.3)
    
    plt.tight_layout()
    output_path = OUTPUT_DIR / "calibration.png"
    save_figure(fig, output_path)
    
    # Print conclusion
    print(f"\nConclusion:")
    print("-" * 60)
    
    if sensitivity >= 0.90 and specificity >= 0.90:
        print(f"  ✓ Excellent discrimination: sensitivity={sensitivity:.1%}, specificity={specificity:.1%}")
    elif sensitivity >= 0.80 and specificity >= 0.80:
        print(f"  ℹ Good discrimination: sensitivity={sensitivity:.1%}, specificity={specificity:.1%}")
    else:
        print(f"  ⚠ Poor discrimination: sensitivity={sensitivity:.1%}, specificity={specificity:.1%}")
    
    # Check for false positives (claiming confidence when threshold not met)
    if fp > 0:
        print(f"  ⚠ {fp} false positives: Claimed confidence when threshold NOT met")
    else:
        print(f"  ✓ No false positives: Never claimed confidence when threshold was NOT met")
    
    # Check for high false negative rate
    fn_rate = fn / total_met if total_met > 0 else 0
    if fn_rate > 0.2:
        print(f"  ⚠ High false negative rate ({fn_rate:.1%}): Often finds spurious bugs when threshold IS met")
    
    print(f"\n✓ Calibration analysis complete")

if __name__ == "__main__":
    main()
