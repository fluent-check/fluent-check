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
plt.rcParams['figure.dpi'] = 300
plt.rcParams['savefig.dpi'] = 300
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
    fig.savefig(path, dpi=300, bbox_inches='tight')
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


def chi_squared_test(success1: int, n1: int, success2: int, n2: int) -> dict:
    """
    Perform a 2x2 Chi-squared test comparing two proportions.
    
    Args:
        success1: Number of successes in group 1
        n1: Total trials in group 1
        success2: Number of successes in group 2
        n2: Total trials in group 2
    
    Returns:
        dict with chi2 statistic, p-value, and whether result is significant at alpha=0.05
    """
    # Create contingency table
    #                  Success  Failure
    # Group 1          success1  n1-success1
    # Group 2          success2  n2-success2
    observed = np.array([
        [success1, n1 - success1],
        [success2, n2 - success2]
    ])
    
    # Use chi2_contingency for small samples (applies Yates correction)
    chi2, p_value, dof, expected = stats.chi2_contingency(observed, correction=True)
    
    return {
        'chi2': chi2,
        'p_value': p_value,
        'dof': dof,
        'significant': p_value < 0.05,
        'expected': expected
    }


def cohens_h(p1: float, p2: float) -> float:
    """
    Calculate Cohen's h effect size for comparing two proportions.
    
    Cohen's h = 2 * arcsin(sqrt(p1)) - 2 * arcsin(sqrt(p2))
    
    Interpretation:
        |h| < 0.2: small
        0.2 <= |h| < 0.5: small to medium
        0.5 <= |h| < 0.8: medium to large
        |h| >= 0.8: large
    
    Args:
        p1: First proportion (0-1)
        p2: Second proportion (0-1)
    
    Returns:
        Cohen's h effect size
    """
    phi1 = 2 * np.arcsin(np.sqrt(p1))
    phi2 = 2 * np.arcsin(np.sqrt(p2))
    return phi1 - phi2


def effect_size_interpretation(h: float) -> str:
    """
    Interpret Cohen's h effect size.
    """
    abs_h = abs(h)
    if abs_h < 0.2:
        return "negligible"
    elif abs_h < 0.5:
        return "small"
    elif abs_h < 0.8:
        return "medium"
    else:
        return "large"


def odds_ratio(success1: int, n1: int, success2: int, n2: int) -> dict:
    """
    Calculate odds ratio and its 95% confidence interval.
    
    OR > 1: Group 1 has higher odds of success
    OR < 1: Group 2 has higher odds of success
    OR = 1: No difference
    
    Args:
        success1: Number of successes in group 1
        n1: Total trials in group 1
        success2: Number of successes in group 2
        n2: Total trials in group 2
    
    Returns:
        dict with odds_ratio, 95% CI, and interpretation
    """
    # Handle edge cases
    failure1 = n1 - success1
    failure2 = n2 - success2
    
    # Add 0.5 to each cell if any zero (Haldane-Anscombe correction)
    if success1 == 0 or failure1 == 0 or success2 == 0 or failure2 == 0:
        success1 += 0.5
        failure1 += 0.5
        success2 += 0.5
        failure2 += 0.5
    
    OR = (success1 / failure1) / (success2 / failure2)
    
    # Log odds ratio and SE
    log_OR = np.log(OR)
    SE_log_OR = np.sqrt(1/success1 + 1/failure1 + 1/success2 + 1/failure2)
    
    # 95% CI
    z = stats.norm.ppf(0.975)
    ci_lower = np.exp(log_OR - z * SE_log_OR)
    ci_upper = np.exp(log_OR + z * SE_log_OR)
    
    return {
        'odds_ratio': OR,
        'ci_lower': ci_lower,
        'ci_upper': ci_upper,
        'log_OR': log_OR,
        'SE': SE_log_OR,
        'significant': ci_lower > 1 or ci_upper < 1
    }


def power_analysis_proportion(p1: float, p2: float, alpha: float = 0.05, power: float = 0.80) -> int:
    """
    Calculate required sample size per group for comparing two proportions.
    
    Uses the formula for two-proportion z-test with equal groups.
    
    Args:
        p1: Expected proportion in group 1
        p2: Expected proportion in group 2
        alpha: Significance level (default 0.05)
        power: Desired power (default 0.80)
    
    Returns:
        Required sample size per group
    """
    # Effect size (Cohen's h)
    h = abs(cohens_h(p1, p2))
    
    if h == 0:
        return float('inf')  # Can't detect no difference
    
    # Standard normal quantiles
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(power)
    
    # Sample size formula for two-proportion test
    n = 2 * ((z_alpha + z_beta) / h) ** 2
    
    return int(np.ceil(n))
