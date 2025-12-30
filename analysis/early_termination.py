#!/usr/bin/env python3
"""
Early Termination Analysis

Tests whether the early termination heuristic (stopping when CI upper bound < 1)
is correct and safe.

Hypotheses:
- B1: Precision: When terminating early, true size is < 1 (or 0) with high probability.
- B2: Recall: When true size > 1, we rarely terminate early (False Positive Rate <= 10%).
- B3: Efficiency: When true size is 0, we terminate reasonably fast.
"""

from base import AnalysisBase

class EarlyTerminationAnalysis(AnalysisBase):
    def __init__(self):
        super().__init__()
        self.b1_pass = None
        self.b2_pass = None
        self.b3_pass = None

    @property
    def name(self) -> str:
        return "Early Termination Analysis"

    @property
    def csv_filename(self) -> str:
        return "early-termination.csv"

    @property
    def required_columns(self) -> list:
        return ['pass_rate', 'terminated', 'false_termination', 'failed_termination', 'samples_taken']

    def analyze(self) -> None:
        self._check_precision()
        self._check_false_positive_rate()
        self._check_efficiency()
        self._print_conclusion()

    def _check_precision(self) -> None:
        """B1: Precision of termination decision."""
        self.print_section("B1: PRECISION (Safe Termination)")
        
        # Filter for rows where we terminated
        terminated_df = self.df[self.df['terminated'] == True]
        
        if len(terminated_df) == 0:
            print("No terminations observed.")
            self.b1_pass = True # Technically pass?
            return

        # False termination means we terminated but true size >= 1
        false_term_count = terminated_df['false_termination'].sum()
        total_term = len(terminated_df)
        precision = 1.0 - (false_term_count / total_term)
        
        print(f"Total Terminations: {total_term}")
        print(f"False Terminations (Bad): {false_term_count}")
        print(f"Precision: {precision:.1%}")
        
        self.b1_pass = precision >= 0.90
        print(f"Result: {'PASS' if self.b1_pass else 'FAIL'} (Target >= 90%)")

    def _check_false_positive_rate(self) -> None:
        """B2: False Positive Rate (Terminating when we shouldn't)."""
        self.print_section("B2: FALSE POSITIVE RATE")
        
        # Consider cases where true size >= 1
        should_continue_df = self.df[self.df['true_size'] >= 1]
        
        if len(should_continue_df) == 0:
            print("No positive cases available.")
            self.b2_pass = True
            return

        # How many of these terminated?
        false_positives = should_continue_df['terminated'].sum()
        total_positives = len(should_continue_df)
        fpr = false_positives / total_positives
        
        print(f"Cases where Size >= 1: {total_positives}")
        print(f"Terminated incorrectly: {false_positives}")
        print(f"False Positive Rate: {fpr:.1%}")
        
        self.b2_pass = fpr <= 0.10
        print(f"Result: {'PASS' if self.b2_pass else 'FAIL'} (Target <= 10%)")

    def _check_efficiency(self) -> None:
        """B3: Efficiency (Speed of correct termination)."""
        self.print_section("B3: EFFICIENCY")
        
        # Consider cases where true size < 1 (should terminate)
        should_term_df = self.df[self.df['true_size'] < 1]
        
        if len(should_term_df) == 0:
            print("No negative cases available.")
            self.b3_pass = True
            return
            
        # Check termination rate
        term_rate = should_term_df['terminated'].mean()
        avg_samples = should_term_df[should_term_df['terminated']]['samples_taken'].mean()
        
        print(f"Cases where Size < 1: {len(should_term_df)}")
        print(f"Termination Rate: {term_rate:.1%}")
        print(f"Avg Samples to Terminate: {avg_samples:.1f}")
        
        self.b3_pass = term_rate >= 0.90
        print(f"Result: {'PASS' if self.b3_pass else 'FAIL'} (Target >= 90% terminated)")

    def _print_conclusion(self) -> None:
        self.print_section("CONCLUSION")
        print(f"B1 (Precision): {'PASS' if self.b1_pass else 'FAIL'}")
        print(f"B2 (FPR):       {'PASS' if self.b2_pass else 'FAIL'}")
        print(f"B3 (Efficiency):{'PASS' if self.b3_pass else 'FAIL'}")

def main():
    analysis = EarlyTerminationAnalysis()
    analysis.run()

if __name__ == "__main__":
    main()
