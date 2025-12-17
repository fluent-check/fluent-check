## ADDED Requirements

### Requirement: Statistical Evidence Generation

The system SHALL provide tooling to generate reproducible statistical evidence for confidence-based termination claims through Monte Carlo experiments.

#### Scenario: Calibration evidence generation

- **WHEN** `npm run evidence:generate` is executed
- **THEN** the system SHALL run calibration experiments with 1000 trials across confidence levels 0.80, 0.90, 0.95, 0.99
- **AND** output results to `docs/evidence/raw/calibration.csv` with columns: trial_id, seed, tests_run, bug_found, claimed_confidence, true_pass_rate, threshold, target_confidence, threshold_actually_met, termination_reason, elapsed_ms
- **AND** each trial SHALL use deterministic seed = trial_id * 7919 for reproducibility

#### Scenario: Detection rate evidence generation

- **WHEN** `npm run evidence:generate` is executed
- **THEN** the system SHALL run detection rate experiments with 500 trials per method (Fixed N=100, N=500, Confidence 90%/95%/99%)
- **AND** test against rare bug property (0.2% failure rate)
- **AND** output results to `docs/evidence/raw/detection.csv` with columns: trial_id, seed, tests_run, bug_found, claimed_confidence, method, bug_failure_rate, termination_reason, elapsed_ms

#### Scenario: Efficiency evidence generation

- **WHEN** `npm run evidence:generate` is executed  
- **THEN** the system SHALL run efficiency experiments with 200 trials for always-true and 1%-failure properties
- **AND** measure tests-to-termination at 95% confidence
- **AND** output results to `docs/evidence/raw/efficiency.csv` with columns: trial_id, seed, tests_run, bug_found, claimed_confidence, property_type, target_confidence, termination_reason, elapsed_ms

### Requirement: Evidence Visualization

The system SHALL provide Python scripts to generate publication-quality visualizations from experiment data.

#### Scenario: Calibration plot generation

- **WHEN** `npm run evidence:analyze` is executed
- **THEN** Python scripts SHALL read `docs/evidence/raw/calibration.csv`
- **AND** compute summary statistics with 95% confidence intervals
- **AND** generate calibration curve showing predicted vs observed confidence
- **AND** save to `docs/evidence/figures/calibration.png` at 150 DPI

#### Scenario: Detection rate visualization

- **WHEN** `npm run evidence:analyze` is executed
- **THEN** Python scripts SHALL read `docs/evidence/raw/detection.csv`
- **AND** generate bar chart comparing detection rates with error bars
- **AND** generate histogram showing tests-to-termination distributions
- **AND** save figures to `docs/evidence/figures/`

#### Scenario: Efficiency visualization

- **WHEN** `npm run evidence:analyze` is executed
- **THEN** Python scripts SHALL read `docs/evidence/raw/efficiency.csv`
- **AND** generate box plot comparing property type distributions
- **AND** compute summary table with mean, std, percentiles
- **AND** save to `docs/evidence/figures/efficiency_boxplot.png`

### Requirement: Evidence Documentation

The system SHALL provide comprehensive documentation of evidence studies with embedded visualizations.

#### Scenario: Evidence report structure

- **WHEN** evidence is generated and analyzed
- **THEN** `docs/evidence/README.md` SHALL document each study including:
  - Hypothesis statement
  - Method description
  - Summary statistics table with confidence intervals
  - Embedded PNG figures via markdown image syntax
  - Conclusion interpreting results

#### Scenario: Evidence reproducibility

- **WHEN** external reviewer runs `npm run evidence`
- **THEN** the system SHALL produce identical CSV outputs (given same code version)
- **AND** Python analysis SHALL produce visually consistent plots
- **AND** all data SHALL be version-controlled in `docs/evidence/`

### Requirement: Evidence Environment Management

The system SHALL manage Python dependencies through uv for analysis scripts.

#### Scenario: Python environment setup

- **WHEN** developer runs `cd analysis && uv init && uv sync`
- **THEN** uv SHALL create virtual environment with matplotlib>=3.8.0, seaborn>=0.13.0, pandas>=2.1.0, numpy>=1.26.0, scipy>=1.11.0
- **AND** Python scripts SHALL be executable via `uv run <script>.py`

#### Scenario: Quick mode for development

- **WHEN** `npm run evidence:quick` is executed with QUICK_MODE=1
- **THEN** experiment runners SHALL use reduced sample sizes (100 trials instead of 1000)
- **AND** total runtime SHALL be under 1 minute
- **AND** output format SHALL remain identical for testing analysis pipeline
