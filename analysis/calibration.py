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

from base import AnalysisBase
from stats import wilson_score_interval, format_ci
from viz import save_figure


class CalibrationAnalysis(AnalysisBase):
    """Analysis of sensitivity/specificity for confidence-based termination."""

    @property
    def name(self) -> str:
        return "Calibration Analysis (Sensitivity/Specificity)"

    @property
    def csv_filename(self) -> str:
        return "calibration.csv"

    def analyze(self) -> None:
        """Perform the calibration analysis."""
        self._compute_outcomes()
        self._print_confusion_matrix()
        self._compute_metrics()
        self._print_breakdown_by_rate()
        self._create_visualization()
        self._print_conclusion()

    def _compute_outcomes(self) -> None:
        """Compute or extract outcomes from the data."""
        if 'outcome' in self.df.columns:
            self.valid_df = self.df[self.df['outcome'].notna()]
        else:
            def classify_outcome(row):
                if row['termination_reason'] == 'confidence':
                    return 'TP' if row['threshold_actually_met'] else 'FP'
                elif row['termination_reason'] == 'bugFound':
                    return 'TN' if not row['threshold_actually_met'] else 'FN'
                else:
                    return None

            self.df['outcome'] = self.df.apply(classify_outcome, axis=1)
            self.valid_df = self.df[self.df['outcome'].notna()]

        self.tp = (self.valid_df['outcome'] == 'TP').sum()
        self.fn = (self.valid_df['outcome'] == 'FN').sum()
        self.tn = (self.valid_df['outcome'] == 'TN').sum()
        self.fp = (self.valid_df['outcome'] == 'FP').sum()

    def _print_confusion_matrix(self) -> None:
        """Print the confusion matrix."""
        self.print_section("CONFUSION MATRIX")
        print(f"                     Predicted")
        print(f"                     Confidence    Bug Found")
        print(f"Actual  Met:         TP={self.tp:<6}      FN={self.fn:<6}")
        print(f"        Not Met:     FP={self.fp:<6}      TN={self.tn:<6}")

    def _compute_metrics(self) -> None:
        """Compute performance metrics."""
        total_met = self.tp + self.fn
        total_not_met = self.tn + self.fp
        total_confidence = self.tp + self.fp
        total_valid = self.tp + self.tn + self.fp + self.fn

        self.sensitivity = self.tp / total_met if total_met > 0 else 0
        self.specificity = self.tn / total_not_met if total_not_met > 0 else 0
        self.precision = self.tp / total_confidence if total_confidence > 0 else 0
        self.accuracy = (self.tp + self.tn) / total_valid if total_valid > 0 else 0

        self.sens_ci = wilson_score_interval(self.tp, total_met, 0.95) if total_met > 0 else (0, 0)
        self.spec_ci = wilson_score_interval(self.tn, total_not_met, 0.95) if total_not_met > 0 else (0, 0)
        self.prec_ci = wilson_score_interval(self.tp, total_confidence, 0.95) if total_confidence > 0 else (0, 0)

        self.print_section("PERFORMANCE METRICS")
        print(f"Sensitivity (TPR): {self.sensitivity:.1%} {format_ci(*self.sens_ci)}")
        print(f"  When threshold IS met, probability of achieving confidence")
        print(f"Specificity (TNR): {self.specificity:.1%} {format_ci(*self.spec_ci)}")
        print(f"  When threshold NOT met, probability of finding bug")
        print(f"Precision (PPV):   {self.precision:.1%} {format_ci(*self.prec_ci)}")
        print(f"  When confidence claimed, probability threshold actually met")
        print(f"Accuracy:          {self.accuracy:.1%}")

    def _print_breakdown_by_rate(self) -> None:
        """Print breakdown by true pass rate."""
        self.print_section("BREAKDOWN BY TRUE PASS RATE")
        print(f"{'Pass Rate':<12} {'N':<6} {'TP':<6} {'FN':<6} {'TN':<6} {'FP':<6} {'Sensitivity':<15} {'Specificity':<15}")
        self.print_divider(width=90)

        self.results_by_rate = []
        for rate in sorted(self.valid_df['true_pass_rate'].unique(), reverse=True):
            group = self.valid_df[self.valid_df['true_pass_rate'] == rate]
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

            threshold = self.safe_first(group, 'threshold', 0.0)
            met_status = "MET" if rate > threshold else "NOT MET"

            print(f"{rate:<12.3f} {n:<6} {g_tp:<6} {g_fn:<6} {g_tn:<6} {g_fp:<6} "
                  f"{sens_str:<15} {spec_str:<15} [{met_status}]")

            self.results_by_rate.append({
                'pass_rate': rate,
                'threshold_met': rate > threshold,
                'sensitivity': g_sens,
                'specificity': g_spec,
                'n': n
            })

        self.print_divider(width=90)

    def _create_visualization(self) -> None:
        """Create sensitivity/specificity visualization."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))
        results_df = pd.DataFrame(self.results_by_rate)

        # Left: Sensitivity by pass rate (threshold MET)
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

        # Right: Specificity by pass rate (threshold NOT MET)
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

        save_figure(fig, self.get_output_path("calibration.png"))

    def _print_conclusion(self) -> None:
        """Print conclusion."""
        self.print_section("CONCLUSION")

        if self.sensitivity >= 0.90 and self.specificity >= 0.90:
            print(f"  {self.check_mark} Excellent discrimination: sensitivity={self.sensitivity:.1%}, "
                  f"specificity={self.specificity:.1%}")
        elif self.sensitivity >= 0.80 and self.specificity >= 0.80:
            print(f"  i Good discrimination: sensitivity={self.sensitivity:.1%}, "
                  f"specificity={self.specificity:.1%}")
        else:
            print(f"  Warning: Poor discrimination: sensitivity={self.sensitivity:.1%}, "
                  f"specificity={self.specificity:.1%}")

        if self.fp > 0:
            print(f"  Warning: {self.fp} false positives: Claimed confidence when threshold NOT met")
        else:
            print(f"  {self.check_mark} No false positives: Never claimed confidence when threshold was NOT met")

        fn_rate = self.fn / (self.tp + self.fn) if (self.tp + self.fn) > 0 else 0
        if fn_rate > 0.2:
            print(f"  Warning: High false negative rate ({fn_rate:.1%}): "
                  "Often finds spurious bugs when threshold IS met")


def main():
    analysis = CalibrationAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
