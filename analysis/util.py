"""
Shared utilities for evidence analysis and visualization.

BACKWARD COMPATIBILITY MODULE

This module re-exports functions from the new modular structure:
- stats.py: Statistical functions
- viz.py: Visualization functions

New code should import directly from stats.py and viz.py.
This module exists for backward compatibility with existing scripts.
"""

# Re-export all statistical functions
from stats import (
    wilson_score_interval,
    format_ci,
    compute_error_bars,
    chi_squared_test,
    fisher_exact_test,
    compare_proportions,
    mann_whitney_test,
    chi_squared_goodness_of_fit,
    cohens_h,
    effect_size_interpretation,
    odds_ratio,
    power_analysis_proportion,
    compute_summary_stats,
    print_summary_table,
)

# Re-export all visualization functions
from viz import (
    configure_matplotlib,
    save_figure,
    create_figure,
    create_bar_chart_with_ci,
    create_grouped_bar_chart,
    create_line_plot_with_theory,
    create_boxplot_by_group,
    create_grouped_boxplot,
    create_ecdf_plot,
    create_legend_elements,
    add_reference_line,
    add_expected_markers,
)

# Re-export constants
from constants import (
    PROJECT_ROOT,
    RAW_DATA_DIR,
    OUTPUT_DIR,
    DENSITY_SCENARIO_ORDER,
    DENSITY_SCENARIO_LABELS,
    SIMPLE_DENSITY_ORDER,
    SIMPLE_DENSITY_LABELS,
    SHRINKING_SCENARIO_ORDER,
    SHRINKING_SCENARIO_LABELS,
    COLORS,
    SAMPLER_COLORS,
    APPROACH_COLORS,
    ALPHA,
    get_csv_path,
    ensure_output_dir,
    get_scenario_label,
    get_scenario_order,
)

# Re-export base classes
from base import AnalysisBase, MultiFileAnalysis

# Ensure matplotlib is configured on import
configure_matplotlib()
