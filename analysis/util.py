"""
Shared utilities for evidence analysis and visualization
"""

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from typing import Tuple

# Set publication-quality style
sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams['figure.dpi'] = 150
plt.rcParams['savefig.dpi'] = 150
plt.rcParams['font.size'] = 10
plt.rcParams['axes.labelsize'] = 11
plt.rcParams['axes.titlesize'] = 12
plt.rcParams['xtick.labelsize'] = 9
plt.rcParams['ytick.labelsize'] = 9
plt.rcParams['legend.fontsize'] = 9


def wilson_score_interval(successes: int, total: int, confidence: float = 0.95) -> Tuple[float, float]:
    """
    Calculate Wilson score confidence interval for a proportion.
    
    More accurate than normal approximation for small samples or extreme proportions.
    
    Args:
        successes: Number of successes
        total: Total number of trials
        confidence: Confidence level (default 0.95)
    
    Returns:
        Tuple of (lower_bound, upper_bound)
    """
    if total == 0:
        return (0.0, 0.0)
    
    p = successes / total
    z = stats.norm.ppf(1 - (1 - confidence) / 2)
    
    denominator = 1 + z**2 / total
    center = (p + z**2 / (2 * total)) / denominator
    margin = z * np.sqrt(p * (1 - p) / total + z**2 / (4 * total**2)) / denominator
    
    return (max(0, center - margin), min(1, center + margin))


def format_ci(lower: float, upper: float, as_percent: bool = True) -> str:
    """Format confidence interval as string"""
    if as_percent:
        return f"[{lower*100:.1f}%, {upper*100:.1f}%]"
    else:
        return f"[{lower:.3f}, {upper:.3f}]"


def save_figure(fig: plt.Figure, path: str, tight: bool = True) -> None:
    """Save figure with consistent settings"""
    if tight:
        fig.tight_layout()
    fig.savefig(path, dpi=150, bbox_inches='tight')
    print(f"  Saved: {path}")


def compute_summary_stats(data: np.ndarray) -> dict:
    """Compute summary statistics for a dataset"""
    return {
        'mean': np.mean(data),
        'std': np.std(data, ddof=1),
        'min': np.min(data),
        'max': np.max(data),
        'p25': np.percentile(data, 25),
        'p50': np.percentile(data, 50),
        'p75': np.percentile(data, 75),
        'p95': np.percentile(data, 95),
        'count': len(data)
    }


def print_summary_table(stats: dict, title: str = "Summary Statistics") -> None:
    """Print formatted summary statistics table"""
    print(f"\n{title}")
    print("-" * 60)
    print(f"  Count:  {stats['count']}")
    print(f"  Mean:   {stats['mean']:.2f} ± {stats['std']:.2f}")
    print(f"  Median: {stats['p50']:.2f}")
    print(f"  Range:  [{stats['min']:.0f}, {stats['max']:.0f}]")
    print(f"  P25-P75: [{stats['p25']:.2f}, {stats['p75']:.2f}]")
    print(f"  P95:    {stats['p95']:.2f}")
    print("-" * 60)
