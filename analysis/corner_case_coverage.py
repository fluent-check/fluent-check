#!/usr/bin/env python3
"""
Corner Case Coverage Analysis: What percentage of bugs are found via corner cases?

Analyzes the effectiveness of corner case testing across different bug types
and sampling modes. Tests whether corner cases alone catch majority of boundary bugs.

Metrics:
- Detection rate per bug type × sampling mode
- Attribution: percentage of hybrid-mode detections from corner cases
- Coverage: corner-only detection rate for boundary bugs

Generates:
- corner-case-coverage.png: Detection rates and attribution analysis
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
from util import wilson_score_interval, format_ci, save_figure, chi_squared_test, cohens_h, effect_size_interpretation

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "docs/evidence/raw/corner-case-coverage.csv"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=== Corner Case Coverage Analysis ===\n")

    # Load data
    print(f"Loading: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"  Loaded {len(df)} trials\n")

    # Compute detection rates by bug type × sampling mode
    print("Detection Rates by Bug Type × Sampling Mode:")
    print("=" * 80)

    results = []
    for bug_type in ['zero_boundary', 'empty_boundary', 'off_by_one', 'interior']:
        print(f"\n{bug_type.replace('_', ' ').title()}:")

        mode_results = {}
        for mode in ['corner_only', 'random_only', 'hybrid']:
            mode_data = df[(df['bug_type'] == bug_type) & (df['sampling_mode'] == mode)]

            detected = mode_data['bug_detected'].sum()
            total = len(mode_data)
            rate = detected / total if total > 0 else 0

            # Handle edge case where total is 0
            if total > 0:
                ci = wilson_score_interval(detected, total)
            else:
                ci = (0.0, 0.0)

            mode_results[mode] = {
                'rate': rate,
                'ci_lower': ci[0],
                'ci_upper': ci[1],
                'detected': detected,
                'total': total
            }

            if total > 0:
                print(f"  {mode:15s}: {rate*100:5.1f}% {format_ci(*ci)} ({detected}/{total})")
            else:
                print(f"  {mode:15s}: N/A (no data)")

        results.append({
            'bug_type': bug_type,
            **mode_results
        })

    print("=" * 80)

    # Attribution analysis: In hybrid mode, how many detections came from corner cases?
    print("\n\nAttribution in Hybrid Mode (among detected bugs):")
    print("=" * 80)

    attribution_results = []
    hybrid_detected = df[(df['sampling_mode'] == 'hybrid') & (df['bug_detected'] == True)]

    for bug_type in ['zero_boundary', 'empty_boundary', 'off_by_one', 'interior']:
        bug_hybrid = hybrid_detected[hybrid_detected['bug_type'] == bug_type]

        # Count attributions
        corner_detections = (bug_hybrid['detected_by_corner_case'] == True).sum()
        random_detections = (bug_hybrid['detected_by_corner_case'] == False).sum()
        total_detections = len(bug_hybrid)

        if total_detections > 0:
            corner_pct = corner_detections / total_detections
            ci = wilson_score_interval(corner_detections, total_detections)

            print(f"\n{bug_type.replace('_', ' ').title()}:")
            print(f"  Corner case detections: {corner_detections}/{total_detections} ({corner_pct*100:.1f}%) {format_ci(*ci)}")
            print(f"  Random detections:      {random_detections}/{total_detections} ({(1-corner_pct)*100:.1f}%)")

            attribution_results.append({
                'bug_type': bug_type,
                'corner_pct': corner_pct,
                'corner_count': corner_detections,
                'random_count': random_detections,
                'total': total_detections
            })

    print("=" * 80)

    # Create visualizations
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Left panel: Detection rates grouped bar chart
    ax1 = axes[0]

    bug_labels = ['Zero\nBoundary\n(x=0)', 'Empty\nBoundary\n(x=0,100)', 'Off By\nOne\n(x=1,99)', 'Interior\n(x=50)']
    x = np.arange(len(bug_labels))
    width = 0.25

    corner_rates = [r['corner_only']['rate'] for r in results]
    random_rates = [r['random_only']['rate'] for r in results]
    hybrid_rates = [r['hybrid']['rate'] for r in results]

    # Calculate error bars, ensuring non-negative values
    corner_errors = []
    random_errors = []
    hybrid_errors = []

    for r in results:
        # Corner errors
        lower_err = max(0, r['corner_only']['rate'] - r['corner_only']['ci_lower'])
        upper_err = max(0, r['corner_only']['ci_upper'] - r['corner_only']['rate'])
        corner_errors.append((lower_err, upper_err))

        # Random errors
        lower_err = max(0, r['random_only']['rate'] - r['random_only']['ci_lower'])
        upper_err = max(0, r['random_only']['ci_upper'] - r['random_only']['rate'])
        random_errors.append((lower_err, upper_err))

        # Hybrid errors
        lower_err = max(0, r['hybrid']['rate'] - r['hybrid']['ci_lower'])
        upper_err = max(0, r['hybrid']['ci_upper'] - r['hybrid']['rate'])
        hybrid_errors.append((lower_err, upper_err))

    corner_errors_array = np.array(corner_errors).T
    random_errors_array = np.array(random_errors).T
    hybrid_errors_array = np.array(hybrid_errors).T

    ax1.bar(x - width, corner_rates, width, label='Corner Only',
            yerr=corner_errors_array, capsize=3, color='#e74c3c', alpha=0.8)
    ax1.bar(x, random_rates, width, label='Random Only',
            yerr=random_errors_array, capsize=3, color='#3498db', alpha=0.8)
    ax1.bar(x + width, hybrid_rates, width, label='Hybrid',
            yerr=hybrid_errors_array, capsize=3, color='#2ecc71', alpha=0.8)

    ax1.set_xlabel('Bug Type')
    ax1.set_ylabel('Detection Rate')
    ax1.set_title('Detection Rate by Bug Type and Sampling Mode')
    ax1.set_xticks(x)
    ax1.set_xticklabels(bug_labels, fontsize=9)
    ax1.set_ylim(0, 1.05)
    ax1.legend()
    ax1.grid(True, axis='y', alpha=0.3)

    # Right panel: Attribution pie charts or stacked bar
    ax2 = axes[1]

    # Stacked bar chart showing corner vs random attribution in hybrid mode
    if attribution_results:
        labels = [r['bug_type'].replace('_', '\n').title() for r in attribution_results]
        corner_pcts = [r['corner_pct'] * 100 for r in attribution_results]
        random_pcts = [(1 - r['corner_pct']) * 100 for r in attribution_results]

        x_attr = np.arange(len(labels))
        ax2.bar(x_attr, corner_pcts, label='Corner Case', color='#e74c3c', alpha=0.8)
        ax2.bar(x_attr, random_pcts, bottom=corner_pcts, label='Random Sample', color='#3498db', alpha=0.8)

        ax2.set_xlabel('Bug Type')
        ax2.set_ylabel('Percentage of Detections')
        ax2.set_title('Attribution in Hybrid Mode (Detected Bugs Only)')
        ax2.set_xticks(x_attr)
        ax2.set_xticklabels(labels, fontsize=9)
        ax2.set_ylim(0, 105)
        ax2.legend()
        ax2.grid(True, axis='y', alpha=0.3)

        # Add 50% reference line
        ax2.axhline(y=50, color='red', linestyle='--', alpha=0.5, linewidth=1, label='50%')

    plt.tight_layout()
    output_path = OUTPUT_DIR / "corner-case-coverage.png"
    save_figure(fig, output_path)

    # Print conclusion
    print(f"\nConclusion:")
    print("-" * 80)

    # Check hypothesis: >50% of boundary bugs found via corner cases
    boundary_types = ['zero_boundary', 'empty_boundary', 'off_by_one']
    boundary_attributions = [r for r in attribution_results if r['bug_type'] in boundary_types]

    if boundary_attributions:
        avg_corner_pct = np.mean([r['corner_pct'] for r in boundary_attributions])
        all_above_50 = all(r['corner_pct'] > 0.5 for r in boundary_attributions)

        if all_above_50:
            print(f"  ✓ Hypothesis supported: >50% of boundary bugs found via corner cases")
            print(f"    Average across boundary bugs: {avg_corner_pct*100:.1f}%")
        else:
            print(f"  ✗ Hypothesis not fully supported:")
            print(f"    Average corner case attribution: {avg_corner_pct*100:.1f}%")

        for r in boundary_attributions:
            print(f"    • {r['bug_type']}: {r['corner_pct']*100:.1f}% from corner cases")

    # Report corner-only coverage
    print(f"\n  Corner-only detection rates:")
    for r in results:
        if r['bug_type'] in boundary_types:
            rate = r['corner_only']['rate']
            print(f"    • {r['bug_type']}: {rate*100:.1f}%")

    print(f"\n✓ Corner case coverage analysis complete")

if __name__ == "__main__":
    main()
