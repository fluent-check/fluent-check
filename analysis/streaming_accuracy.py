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

from base import AnalysisBase
from viz import save_figure


class StreamingAccuracyAnalysis(AnalysisBase):
    """Analysis of streaming statistics accuracy and calibration."""

    @property
    def name(self) -> str:
        return "Streaming Statistics Accuracy Analysis"

    @property
    def csv_filename(self) -> str:
        return "streaming-accuracy.csv"

    def analyze(self) -> None:
        """Perform the streaming accuracy analysis."""
        self._bin_data()
        self._compute_calibration()
        self._create_visualization()
        self._print_conclusion()

    def _bin_data(self) -> None:
        """Create confidence bins."""
        bins = np.linspace(0, 1, 11)
        self.df['conf_bin'] = pd.cut(self.df['confidence'], bins=bins, include_lowest=True)
        self.sample_sizes = sorted(self.df['n'].unique())

    def _compute_calibration(self) -> None:
        """Compute calibration statistics."""
        self.print_section("CALIBRATION ANALYSIS (ECE = EXPECTED CALIBRATION ERROR)")
        print(f"{'Sample Size':<12} {'ECE':<10} {'Max Error':<10}")
        self.print_divider(width=80)

        self.calibration_data = {}

        for n in self.sample_sizes:
            data = self.df[self.df['n'] == n]

            grouped = data.groupby('conf_bin', observed=False).agg({
                'confidence': 'mean',
                'truth': 'mean',
                'trial_id': 'count'
            }).rename(columns={'confidence': 'avg_conf', 'truth': 'accuracy', 'trial_id': 'count'})

            total_count = grouped['count'].sum()
            grouped['error'] = np.abs(grouped['avg_conf'] - grouped['accuracy'])
            grouped['weighted_error'] = grouped['error'] * grouped['count']
            ece = grouped['weighted_error'].sum() / total_count if total_count > 0 else 0
            max_error = grouped['error'].max() if len(grouped) > 0 else 0

            print(f"n={n:<10} {ece:.4f}     {max_error:.4f}")

            self.calibration_data[n] = {
                'grouped': grouped,
                'ece': ece,
                'max_error': max_error
            }

    def _create_visualization(self) -> None:
        """Create streaming accuracy visualization."""
        fig, axes = plt.subplots(1, len(self.sample_sizes), figsize=(5 * len(self.sample_sizes), 5), sharey=True)
        if len(self.sample_sizes) == 1:
            axes = [axes]

        for i, n in enumerate(self.sample_sizes):
            ax = axes[i]
            grouped = self.calibration_data[n]['grouped']
            ece = self.calibration_data[n]['ece']

            ax.plot([0, 1], [0, 1], 'k--', alpha=0.5, label='Perfect')
            ax.plot(grouped['avg_conf'], grouped['accuracy'], 'o-', linewidth=2, label=f'n={n}')

            ax.set_xlabel('Predicted Confidence')
            if i == 0:
                ax.set_ylabel('Observed Accuracy')
            ax.set_title(f'Reliability Diagram (n={n})\nECE={ece:.3f}')
            ax.grid(True, alpha=0.3)
            ax.set_aspect('equal')
            ax.set_xlim(0, 1)
            ax.set_ylim(0, 1)
            ax.legend(loc='upper left')

        save_figure(fig, self.get_output_path("streaming-accuracy.png"))

    def _print_conclusion(self) -> None:
        """Print conclusion."""
        self.print_section("CONCLUSION")

        max_ece = max(data['ece'] for data in self.calibration_data.values())

        if max_ece < 0.05:
            print(f"  {self.check_mark} Hypothesis supported: Confidence is well-calibrated (ECE < 0.05).")
            print(f"    Max ECE observed: {max_ece:.4f}")
        else:
            print(f"  x Hypothesis rejected: Calibration error too high.")
            print(f"    Max ECE observed: {max_ece:.4f}")

        print(f"\n  {self.check_mark} Streaming Accuracy analysis complete")


def main():
    analysis = StreamingAccuracyAnalysis()
    analysis.run()


if __name__ == "__main__":
    main()
