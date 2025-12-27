"""
Statistical utilities for evidence analysis.

This module provides statistical functions for:
- Confidence interval calculation (Wilson score)
- Hypothesis testing (Chi-squared, Fisher exact, Mann-Whitney U)
- Effect size calculation (Cohen's h)
- Power analysis
- Odds ratios
"""

from typing import Tuple, Dict, Any, Optional
import numpy as np
from scipy import stats as scipy_stats

from constants import ALPHA, EFFECT_SIZE_THRESHOLDS


# =============================================================================
# CONFIDENCE INTERVALS
# =============================================================================

def wilson_score_interval(
    successes: int,
    total: int,
    confidence: float = 0.95
) -> Tuple[float, float]:
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
    z = scipy_stats.norm.ppf(1 - (1 - confidence) / 2)

    denominator = 1 + z**2 / total
    center = (p + z**2 / (2 * total)) / denominator
    margin = z * np.sqrt(p * (1 - p) / total + z**2 / (4 * total**2)) / denominator

    return (max(0, center - margin), min(1, center + margin))


def format_ci(lower: float, upper: float, as_percent: bool = True) -> str:
    """
    Format confidence interval as string.

    Args:
        lower: Lower bound
        upper: Upper bound
        as_percent: If True, format as percentage

    Returns:
        Formatted string like "[5.2%, 15.3%]" or "[0.052, 0.153]"
    """
    if as_percent:
        return f"[{lower*100:.1f}%, {upper*100:.1f}%]"
    else:
        return f"[{lower:.3f}, {upper:.3f}]"


def compute_error_bars(
    rate: float,
    ci_lower: float,
    ci_upper: float
) -> Tuple[float, float]:
    """
    Compute error bar values from rate and confidence interval.

    Args:
        rate: The point estimate
        ci_lower: Lower CI bound
        ci_upper: Upper CI bound

    Returns:
        Tuple of (lower_error, upper_error) for matplotlib error bars
    """
    return (
        max(0, rate - ci_lower),
        max(0, ci_upper - rate)
    )


# =============================================================================
# HYPOTHESIS TESTING
# =============================================================================

def chi_squared_test(
    success1: int,
    n1: int,
    success2: int,
    n2: int,
    alpha: float = ALPHA
) -> Dict[str, Any]:
    """
    Perform a 2x2 Chi-squared test comparing two proportions.

    Args:
        success1: Number of successes in group 1
        n1: Total trials in group 1
        success2: Number of successes in group 2
        n2: Total trials in group 2
        alpha: Significance level (default 0.05)

    Returns:
        dict with:
        - chi2: Chi-squared statistic
        - p_value: p-value
        - dof: Degrees of freedom
        - significant: Whether result is significant at alpha
        - expected: Expected frequencies
    """
    observed = np.array([
        [success1, n1 - success1],
        [success2, n2 - success2]
    ])

    # Use chi2_contingency for small samples (applies Yates correction)
    chi2, p_value, dof, expected = scipy_stats.chi2_contingency(observed, correction=True)

    return {
        'chi2': chi2,
        'p_value': p_value,
        'dof': dof,
        'significant': p_value < alpha,
        'expected': expected
    }


def fisher_exact_test(
    success1: int,
    n1: int,
    success2: int,
    n2: int,
    alpha: float = ALPHA
) -> Dict[str, Any]:
    """
    Perform Fisher's exact test for 2x2 contingency tables.

    Preferred over chi-squared when sample sizes are small or
    expected frequencies are low.

    Args:
        success1: Number of successes in group 1
        n1: Total trials in group 1
        success2: Number of successes in group 2
        n2: Total trials in group 2
        alpha: Significance level (default 0.05)

    Returns:
        dict with:
        - odds_ratio: The odds ratio
        - p_value: p-value
        - significant: Whether result is significant at alpha
    """
    table = [
        [success1, n1 - success1],
        [success2, n2 - success2]
    ]
    odds_ratio, p_value = scipy_stats.fisher_exact(table)

    return {
        'odds_ratio': odds_ratio,
        'p_value': p_value,
        'significant': p_value < alpha
    }


def compare_proportions(
    success1: int,
    n1: int,
    success2: int,
    n2: int,
    alpha: float = ALPHA
) -> Dict[str, Any]:
    """
    Compare two proportions using the appropriate test.

    Uses Fisher's exact test when any cell has expected count < 5,
    otherwise uses Chi-squared test.

    Args:
        success1: Number of successes in group 1
        n1: Total trials in group 1
        success2: Number of successes in group 2
        n2: Total trials in group 2
        alpha: Significance level (default 0.05)

    Returns:
        dict with test results and method used
    """
    # Calculate expected counts
    total_success = success1 + success2
    total_n = n1 + n2
    expected1 = n1 * total_success / total_n if total_n > 0 else 0
    expected2 = n2 * total_success / total_n if total_n > 0 else 0

    # Check if any expected count is too small
    min_expected = min(expected1, n1 - expected1, expected2, n2 - expected2)

    if min_expected < 5:
        result = fisher_exact_test(success1, n1, success2, n2, alpha)
        result['method'] = 'fisher'
    else:
        result = chi_squared_test(success1, n1, success2, n2, alpha)
        result['method'] = 'chi_squared'

    return result


def mann_whitney_test(
    group1: np.ndarray,
    group2: np.ndarray,
    alternative: str = 'two-sided',
    alpha: float = ALPHA
) -> Dict[str, Any]:
    """
    Perform Mann-Whitney U test for comparing two independent samples.

    Non-parametric alternative to the independent samples t-test.

    Args:
        group1: First sample
        group2: Second sample
        alternative: 'two-sided', 'less', or 'greater'
        alpha: Significance level (default 0.05)

    Returns:
        dict with:
        - statistic: U statistic
        - p_value: p-value
        - significant: Whether result is significant at alpha
    """
    if len(group1) == 0 or len(group2) == 0:
        return {
            'statistic': np.nan,
            'p_value': np.nan,
            'significant': False
        }

    statistic, p_value = scipy_stats.mannwhitneyu(
        group1, group2, alternative=alternative
    )

    return {
        'statistic': statistic,
        'p_value': p_value,
        'significant': p_value < alpha
    }


def chi_squared_goodness_of_fit(
    observed: np.ndarray,
    expected: np.ndarray,
    alpha: float = ALPHA
) -> Dict[str, Any]:
    """
    Perform chi-squared goodness-of-fit test.

    Args:
        observed: Observed frequencies
        expected: Expected frequencies
        alpha: Significance level (default 0.05)

    Returns:
        dict with:
        - chi2: Chi-squared statistic
        - p_value: p-value
        - significant: Whether result is significant at alpha
    """
    # Skip if expected counts are too small
    if np.any(expected < 5):
        return {
            'chi2': np.nan,
            'p_value': np.nan,
            'significant': None
        }

    chi2, p_value = scipy_stats.chisquare(observed, expected)

    return {
        'chi2': chi2,
        'p_value': p_value,
        'significant': p_value < alpha
    }


# =============================================================================
# EFFECT SIZE
# =============================================================================

def cohens_h(p1: float, p2: float) -> float:
    """
    Calculate Cohen's h effect size for comparing two proportions.

    Cohen's h = 2 * arcsin(sqrt(p1)) - 2 * arcsin(sqrt(p2))

    Interpretation:
        |h| < 0.2: negligible
        0.2 <= |h| < 0.5: small
        0.5 <= |h| < 0.8: medium
        |h| >= 0.8: large

    Args:
        p1: First proportion (0-1)
        p2: Second proportion (0-1)

    Returns:
        Cohen's h effect size
    """
    # Handle edge cases
    p1 = np.clip(p1, 0, 1)
    p2 = np.clip(p2, 0, 1)

    phi1 = 2 * np.arcsin(np.sqrt(p1))
    phi2 = 2 * np.arcsin(np.sqrt(p2))
    return phi1 - phi2


def effect_size_interpretation(h: float) -> str:
    """
    Interpret Cohen's h effect size.

    Args:
        h: Cohen's h value

    Returns:
        String interpretation ('negligible', 'small', 'medium', 'large')
    """
    abs_h = abs(h)
    if abs_h < EFFECT_SIZE_THRESHOLDS['negligible']:
        return "negligible"
    elif abs_h < EFFECT_SIZE_THRESHOLDS['small']:
        return "small"
    elif abs_h < EFFECT_SIZE_THRESHOLDS['medium']:
        return "medium"
    else:
        return "large"


# =============================================================================
# ODDS RATIO
# =============================================================================

def odds_ratio(
    success1: int,
    n1: int,
    success2: int,
    n2: int
) -> Dict[str, Any]:
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
        dict with:
        - odds_ratio: The odds ratio
        - ci_lower: Lower 95% CI bound
        - ci_upper: Upper 95% CI bound
        - log_OR: Log odds ratio
        - SE: Standard error of log odds ratio
        - significant: Whether CI excludes 1
    """
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
    z = scipy_stats.norm.ppf(0.975)
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


# =============================================================================
# POWER ANALYSIS
# =============================================================================

def power_analysis_proportion(
    p1: float,
    p2: float,
    alpha: float = 0.05,
    power: float = 0.80
) -> int:
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
    h = abs(cohens_h(p1, p2))

    if h == 0:
        return float('inf')  # Can't detect no difference

    # Standard normal quantiles
    z_alpha = scipy_stats.norm.ppf(1 - alpha / 2)
    z_beta = scipy_stats.norm.ppf(power)

    # Sample size formula for two-proportion test
    n = 2 * ((z_alpha + z_beta) / h) ** 2

    return int(np.ceil(n))


# =============================================================================
# SUMMARY STATISTICS
# =============================================================================

def compute_summary_stats(data: np.ndarray) -> Dict[str, float]:
    """
    Compute summary statistics for a dataset.

    Args:
        data: NumPy array of values

    Returns:
        dict with mean, std, min, max, percentiles, and count
    """
    if len(data) == 0:
        return {
            'mean': np.nan,
            'std': np.nan,
            'min': np.nan,
            'max': np.nan,
            'p25': np.nan,
            'p50': np.nan,
            'p75': np.nan,
            'p95': np.nan,
            'count': 0
        }

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


def print_summary_table(stats: Dict[str, float], title: str = "Summary Statistics") -> None:
    """
    Print formatted summary statistics table.

    Args:
        stats: dict from compute_summary_stats
        title: Title for the table
    """
    print(f"\n{title}")
    print("-" * 60)
    print(f"  Count:  {stats['count']}")
    print(f"  Mean:   {stats['mean']:.2f} +/- {stats['std']:.2f}")
    print(f"  Median: {stats['p50']:.2f}")
    print(f"  Range:  [{stats['min']:.0f}, {stats['max']:.0f}]")
    print(f"  P25-P75: [{stats['p25']:.2f}, {stats['p75']:.2f}]")
    print(f"  P95:    {stats['p95']:.2f}")
    print("-" * 60)
