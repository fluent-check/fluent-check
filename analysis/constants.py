"""
Shared constants for evidence analysis scripts.

This module centralizes all configuration, scenario definitions, colors,
and other constants to eliminate duplication across analysis scripts.
"""

from pathlib import Path

# =============================================================================
# PATHS
# =============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
RAW_DATA_DIR = PROJECT_ROOT / "docs/evidence/raw"
OUTPUT_DIR = PROJECT_ROOT / "docs/evidence/figures"

# =============================================================================
# SCENARIO DEFINITIONS
# =============================================================================

# Witness density scenarios (used in exists.py, double_negation.py, etc.)
DENSITY_SCENARIO_ORDER = ['sparse', 'rare', 'moderate', 'dense', 'exists_forall', 'forall_exists']
DENSITY_SCENARIO_LABELS = {
    'sparse': 'Sparse\n(0.01%)',
    'rare': 'Rare\n(1%)',
    'moderate': 'Moderate\n(10%)',
    'dense': 'Dense\n(50%)',
    'exists_forall': 'Exists-Forall\n(~50%)',
    'forall_exists': 'Forall-Exists\n(0.01%/a)'
}

# Simple density scenarios (used in double_negation.py)
SIMPLE_DENSITY_ORDER = ['sparse', 'rare', 'moderate', 'dense']
SIMPLE_DENSITY_LABELS = {
    'sparse': 'Sparse\n(0.01%)',
    'rare': 'Rare\n(1%)',
    'moderate': 'Moderate\n(10%)',
    'dense': 'Dense\n(50%)'
}

# Shrinking scenarios (used in shrinking.py)
SHRINKING_SCENARIO_ORDER = [
    'threshold_gt_100',
    'modular_10000',
    'square_gt_50000',
    'range_1000_10000',
    'composite_gt100_mod7'
]
SHRINKING_SCENARIO_LABELS = {
    'threshold_gt_100': 'x > 100\n(min: 101)',
    'modular_10000': 'x % 10000 = 0\n(min: 10000)',
    'square_gt_50000': 'x² > 50000\n(min: 224)',
    'range_1000_10000': '1000 ≤ x ≤ 10000\n(min: 1000)',
    'composite_gt100_mod7': 'x > 100 ∧ x % 7 = 0\n(min: 105)'
}

# Bug type labels (used in biased_sampling.py)
BUG_TYPE_LABELS = {
    'boundary_min': 'Boundary\nMin',
    'boundary_max': 'Boundary\nMax',
    'middle': 'Middle\nRange',
    'random': 'Random\nValue'
}

# Arbitrary type labels (used in deduplication.py)
ARBITRARY_TYPE_LABELS = {
    'exact': 'Exact (100 distinct)',
    'non_injective': 'Non-injective (10 distinct)',
    'filtered': 'Filtered (10 distinct)'
}

# =============================================================================
# COLOR SCHEMES
# =============================================================================

# Primary colors for two-group comparisons
COLORS = {
    'primary': '#2ca02c',      # Green - usually for "better" or "new" approach
    'secondary': '#ff7f0e',    # Orange - usually for "baseline" or "old" approach
    'accent': '#1f77b4',       # Blue - for highlights
    'warning': '#d62728',      # Red - for alerts/issues
    'neutral': '#7f7f7f',      # Gray - for neutral elements
}

# Sampler type colors
SAMPLER_COLORS = {
    'biased': '#2ecc71',       # Green
    'random': '#3498db',       # Blue
    'deduping': '#2ecc71',     # Green
}

# Approach colors (first-class vs double-negation, etc.)
APPROACH_COLORS = {
    'first_class': 'steelblue',
    'double_negation': 'coral',
    'fixed': '#ff7f0e',        # Orange
    'confidence': '#2ca02c',   # Green
}

# Arbitrary type colors
ARBITRARY_COLORS = {
    'exact': '#2ecc71',
    'non_injective': '#e74c3c',
    'filtered': '#f39c12'
}

# Detection method colors (for detection.py)
DETECTION_METHOD_STYLES = {
    'fixed_50': {'color': '#c6dbef', 'linestyle': '-', 'linewidth': 2},
    'fixed_100': {'color': '#9ecae1', 'linestyle': '-', 'linewidth': 2},
    'fixed_200': {'color': '#6baed6', 'linestyle': '-', 'linewidth': 2},
    'fixed_500': {'color': '#3182bd', 'linestyle': '-', 'linewidth': 2},
    'fixed_1000': {'color': '#08519c', 'linestyle': '-', 'linewidth': 2},
    'confidence_0.80': {'color': '#fcbba1', 'linestyle': '-', 'linewidth': 2},
    'confidence_0.90': {'color': '#fc9272', 'linestyle': '-', 'linewidth': 2},
    'confidence_0.95': {'color': '#fb6a4a', 'linestyle': '-', 'linewidth': 2},
    'confidence_0.99': {'color': '#de2d26', 'linestyle': '-', 'linewidth': 2},
}

# =============================================================================
# STATISTICAL THRESHOLDS
# =============================================================================

# Significance level
ALPHA = 0.05

# Effect size thresholds (Cohen's h)
EFFECT_SIZE_THRESHOLDS = {
    'negligible': 0.2,
    'small': 0.5,
    'medium': 0.8,
}

# Minimum improvement thresholds
MIN_IMPROVEMENT_RATIO = 1.1      # 10% improvement
MIN_TRIGGER_RATE_WARNING = 0.10  # 10% trigger rate

# =============================================================================
# VISUALIZATION DEFAULTS
# =============================================================================

# Figure sizes
FIGURE_SIZES = {
    'single': (12, 7),
    'double': (14, 6),
    'triple': (15, 5),
    'wide': (12, 7),
}

# Print formatting
DIVIDER_WIDTH = 100
DIVIDER_CHAR = '='
SUBDIV_CHAR = '-'


def get_csv_path(name: str) -> Path:
    """Get the path to a CSV file in the raw data directory."""
    return RAW_DATA_DIR / f"{name}.csv"


def ensure_output_dir() -> Path:
    """Ensure the output directory exists and return its path."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return OUTPUT_DIR


def get_scenario_label(scenario: str, scenario_type: str = 'density') -> str:
    """
    Get the display label for a scenario.

    Args:
        scenario: The scenario key
        scenario_type: One of 'density', 'simple_density', 'shrinking'

    Returns:
        The formatted label, or the scenario key if not found
    """
    label_maps = {
        'density': DENSITY_SCENARIO_LABELS,
        'simple_density': SIMPLE_DENSITY_LABELS,
        'shrinking': SHRINKING_SCENARIO_LABELS,
    }
    labels = label_maps.get(scenario_type, DENSITY_SCENARIO_LABELS)
    return labels.get(scenario, scenario)


def get_scenario_order(scenario_type: str = 'density') -> list:
    """
    Get the ordering for scenarios.

    Args:
        scenario_type: One of 'density', 'simple_density', 'shrinking'

    Returns:
        List of scenario keys in display order
    """
    order_maps = {
        'density': DENSITY_SCENARIO_ORDER,
        'simple_density': SIMPLE_DENSITY_ORDER,
        'shrinking': SHRINKING_SCENARIO_ORDER,
    }
    return order_maps.get(scenario_type, DENSITY_SCENARIO_ORDER)
