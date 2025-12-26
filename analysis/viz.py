"""
Visualization utilities for evidence analysis.

This module provides:
- Matplotlib configuration for publication-quality figures
- Reusable chart creation functions
- Consistent styling across all visualizations
"""

from typing import List, Tuple, Optional, Dict, Any, Union
from pathlib import Path
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.lines import Line2D
import seaborn as sns

from constants import FIGURE_SIZES, COLORS, OUTPUT_DIR


# =============================================================================
# MATPLOTLIB CONFIGURATION
# =============================================================================

def configure_matplotlib() -> None:
    """
    Configure matplotlib for publication-quality figures.

    Call this once at module import or at the start of analysis.
    """
    sns.set_theme(style="whitegrid", palette="muted")
    plt.rcParams['figure.dpi'] = 300
    plt.rcParams['savefig.dpi'] = 300
    plt.rcParams['font.size'] = 10
    plt.rcParams['axes.labelsize'] = 11
    plt.rcParams['axes.titlesize'] = 12
    plt.rcParams['xtick.labelsize'] = 9
    plt.rcParams['ytick.labelsize'] = 9
    plt.rcParams['legend.fontsize'] = 9


# Configure on import
configure_matplotlib()


# =============================================================================
# FIGURE MANAGEMENT
# =============================================================================

def save_figure(fig: plt.Figure, path: Union[str, Path], tight: bool = True) -> None:
    """
    Save figure with consistent settings.

    Args:
        fig: The matplotlib figure to save
        path: Output path (can be string or Path)
        tight: Whether to apply tight_layout (default True)
    """
    if tight:
        fig.tight_layout()
    fig.savefig(path, dpi=300, bbox_inches='tight')
    print(f"  Saved: {path}")
    plt.close(fig)


def create_figure(
    size: str = 'single',
    nrows: int = 1,
    ncols: int = 1,
    figsize: Optional[Tuple[float, float]] = None
) -> Tuple[plt.Figure, Union[plt.Axes, np.ndarray]]:
    """
    Create a figure with consistent sizing.

    Args:
        size: One of 'single', 'double', 'triple', 'wide'
        nrows: Number of subplot rows
        ncols: Number of subplot columns
        figsize: Override figure size (width, height)

    Returns:
        Tuple of (figure, axes)
    """
    if figsize is None:
        figsize = FIGURE_SIZES.get(size, FIGURE_SIZES['single'])

    return plt.subplots(nrows, ncols, figsize=figsize)


# =============================================================================
# BAR CHARTS
# =============================================================================

def create_bar_chart_with_ci(
    ax: plt.Axes,
    x_labels: List[str],
    values: List[float],
    ci_lower: List[float],
    ci_upper: List[float],
    colors: Optional[List[str]] = None,
    title: str = "",
    xlabel: str = "",
    ylabel: str = "",
    ylim: Tuple[float, float] = (0, 1.05),
    capsize: int = 5,
    alpha: float = 0.7,
    show_grid: bool = True
) -> None:
    """
    Create a bar chart with confidence interval error bars.

    Args:
        ax: Matplotlib axes to plot on
        x_labels: Labels for each bar
        values: Bar heights (point estimates)
        ci_lower: Lower CI bounds
        ci_upper: Upper CI bounds
        colors: Optional list of colors for each bar
        title: Chart title
        xlabel: X-axis label
        ylabel: Y-axis label
        ylim: Y-axis limits
        capsize: Size of error bar caps
        alpha: Bar transparency
        show_grid: Whether to show y-axis grid
    """
    x_pos = np.arange(len(x_labels))

    # Calculate error bar values
    yerr_lower = np.maximum(0, np.array(values) - np.array(ci_lower))
    yerr_upper = np.maximum(0, np.array(ci_upper) - np.array(values))

    if colors is None:
        colors = sns.color_palette("viridis", len(x_labels))

    ax.bar(
        x_pos,
        values,
        yerr=[yerr_lower, yerr_upper],
        capsize=capsize,
        alpha=alpha,
        edgecolor='black',
        color=colors
    )

    ax.set_xlabel(xlabel, fontsize=12)
    ax.set_ylabel(ylabel, fontsize=12)
    ax.set_title(title, fontsize=14)
    ax.set_xticks(x_pos)
    ax.set_xticklabels(x_labels, fontsize=10)
    ax.set_ylim(ylim)

    if show_grid:
        ax.grid(True, axis='y', alpha=0.3)


def create_grouped_bar_chart(
    ax: plt.Axes,
    x_labels: List[str],
    group1_values: List[float],
    group2_values: List[float],
    group1_label: str,
    group2_label: str,
    group1_errors: Optional[List[Tuple[float, float]]] = None,
    group2_errors: Optional[List[Tuple[float, float]]] = None,
    group1_color: str = COLORS['primary'],
    group2_color: str = COLORS['secondary'],
    title: str = "",
    xlabel: str = "",
    ylabel: str = "",
    ylim: Tuple[float, float] = (0, 1.05),
    bar_width: float = 0.35,
    capsize: int = 5,
    alpha: float = 0.7
) -> None:
    """
    Create a grouped bar chart comparing two groups.

    Args:
        ax: Matplotlib axes to plot on
        x_labels: Labels for each x position
        group1_values: Values for first group
        group2_values: Values for second group
        group1_label: Legend label for first group
        group2_label: Legend label for second group
        group1_errors: Optional error bars for group 1 as (lower, upper) tuples
        group2_errors: Optional error bars for group 2 as (lower, upper) tuples
        group1_color: Color for first group
        group2_color: Color for second group
        title: Chart title
        xlabel: X-axis label
        ylabel: Y-axis label
        ylim: Y-axis limits
        bar_width: Width of each bar
        capsize: Size of error bar caps
        alpha: Bar transparency
    """
    x_pos = np.arange(len(x_labels))

    # Prepare error bars if provided
    yerr1 = None
    yerr2 = None
    if group1_errors:
        yerr1 = np.array([[e[0] for e in group1_errors],
                          [e[1] for e in group1_errors]])
    if group2_errors:
        yerr2 = np.array([[e[0] for e in group2_errors],
                          [e[1] for e in group2_errors]])

    ax.bar(x_pos - bar_width/2, group1_values, bar_width,
           label=group1_label, color=group1_color, alpha=alpha,
           yerr=yerr1, capsize=capsize if yerr1 is not None else 0)
    ax.bar(x_pos + bar_width/2, group2_values, bar_width,
           label=group2_label, color=group2_color, alpha=alpha,
           yerr=yerr2, capsize=capsize if yerr2 is not None else 0)

    ax.set_xlabel(xlabel, fontsize=12)
    ax.set_ylabel(ylabel, fontsize=12)
    ax.set_title(title, fontsize=14)
    ax.set_xticks(x_pos)
    ax.set_xticklabels(x_labels, fontsize=10)
    ax.set_ylim(ylim)
    ax.legend(loc='lower right', fontsize=10)
    ax.grid(True, axis='y', alpha=0.3)


# =============================================================================
# LINE PLOTS
# =============================================================================

def create_line_plot_with_theory(
    ax: plt.Axes,
    x_values: np.ndarray,
    observed_values: np.ndarray,
    theoretical_values: np.ndarray,
    label: str,
    color: str,
    marker: str = 'o',
    show_theory: bool = True
) -> None:
    """
    Create a line plot with observed data and theoretical curve.

    Args:
        ax: Matplotlib axes to plot on
        x_values: X-axis values
        observed_values: Observed data points
        theoretical_values: Theoretical curve values
        label: Legend label
        color: Line color
        marker: Marker style for observed data
        show_theory: Whether to show theoretical curve
    """
    ax.plot(
        x_values,
        observed_values,
        marker=marker,
        linewidth=2,
        markersize=8,
        label=label,
        color=color
    )

    if show_theory:
        ax.plot(
            x_values,
            theoretical_values,
            linestyle='--',
            alpha=0.5,
            color=color
        )


# =============================================================================
# BOX PLOTS
# =============================================================================

def create_boxplot_by_group(
    ax: plt.Axes,
    df: Any,  # pd.DataFrame
    x_column: str,
    y_column: str,
    order: Optional[List[str]] = None,
    labels: Optional[Dict[str, str]] = None,
    title: str = "",
    xlabel: str = "",
    ylabel: str = "",
    palette: str = 'viridis',
    rotation: int = 0
) -> None:
    """
    Create a box plot grouped by a categorical column.

    Args:
        ax: Matplotlib axes to plot on
        df: DataFrame with data
        x_column: Column for x-axis grouping
        y_column: Column for y-axis values
        order: Optional ordering of x categories
        labels: Optional dict mapping category values to display labels
        title: Chart title
        xlabel: X-axis label
        ylabel: Y-axis label
        palette: Seaborn color palette
        rotation: X-label rotation angle
    """
    # Filter order to only include existing values
    if order is not None:
        order = [o for o in order if o in df[x_column].values]

    sns.boxplot(
        data=df,
        x=x_column,
        y=y_column,
        order=order,
        palette=palette,
        ax=ax
    )

    ax.set_xlabel(xlabel, fontsize=12)
    ax.set_ylabel(ylabel, fontsize=12)
    ax.set_title(title, fontsize=14)
    ax.grid(True, axis='y', alpha=0.3)

    # Apply custom labels if provided
    if labels and order:
        ax.set_xticklabels(
            [labels.get(o, o) for o in order],
            fontsize=10,
            rotation=rotation,
            ha='right' if rotation else 'center'
        )


def create_grouped_boxplot(
    ax: plt.Axes,
    df: Any,  # pd.DataFrame
    x_column: str,
    y_column: str,
    hue_column: str,
    order: Optional[List[str]] = None,
    title: str = "",
    xlabel: str = "",
    ylabel: str = ""
) -> None:
    """
    Create a grouped box plot with hue.

    Args:
        ax: Matplotlib axes to plot on
        df: DataFrame with data
        x_column: Column for x-axis grouping
        y_column: Column for y-axis values
        hue_column: Column for hue grouping
        order: Optional ordering of x categories
        title: Chart title
        xlabel: X-axis label
        ylabel: Y-axis label
    """
    # Filter order to only include existing values
    if order is not None:
        order = [o for o in order if o in df[x_column].values]

    sns.boxplot(
        data=df,
        x=x_column,
        y=y_column,
        hue=hue_column,
        order=order,
        ax=ax
    )

    ax.set_xlabel(xlabel, fontsize=12)
    ax.set_ylabel(ylabel, fontsize=12)
    ax.set_title(title, fontsize=14)
    ax.legend(title=hue_column.replace('_', ' ').title())
    ax.grid(True, axis='y', alpha=0.3)


# =============================================================================
# ECDF PLOTS
# =============================================================================

def create_ecdf_plot(
    ax: plt.Axes,
    df: Any,  # pd.DataFrame
    x_column: str,
    group_column: str,
    styles: Dict[str, Dict[str, Any]],
    title: str = "",
    xlabel: str = "",
    ylabel: str = "Cumulative Proportion"
) -> None:
    """
    Create an ECDF (Empirical Cumulative Distribution Function) plot.

    Args:
        ax: Matplotlib axes to plot on
        df: DataFrame with data
        x_column: Column for x-axis values
        group_column: Column for grouping lines
        styles: Dict mapping group values to style dicts (color, linestyle, linewidth)
        title: Chart title
        xlabel: X-axis label
        ylabel: Y-axis label
    """
    for group in df[group_column].unique():
        group_data = df[df[group_column] == group]
        style = styles.get(group, {'color': 'gray', 'linestyle': '-', 'linewidth': 2})

        sns.ecdfplot(
            data=group_data,
            x=x_column,
            ax=ax,
            label=group.replace('_', ' '),
            **style
        )

    ax.set_xlabel(xlabel, fontsize=12)
    ax.set_ylabel(ylabel, fontsize=12)
    ax.set_title(title, fontsize=14)
    ax.legend(loc='lower right', fontsize=9)
    ax.grid(True, alpha=0.3)


# =============================================================================
# LEGEND HELPERS
# =============================================================================

def create_legend_elements(
    labels: List[str],
    colors: List[str],
    markers: Optional[List[str]] = None,
    linestyles: Optional[List[str]] = None
) -> List[Any]:
    """
    Create legend elements for custom legends.

    Args:
        labels: List of legend labels
        colors: List of colors
        markers: Optional list of marker styles (for scatter/line)
        linestyles: Optional list of line styles

    Returns:
        List of legend handles
    """
    elements = []

    for i, (label, color) in enumerate(zip(labels, colors)):
        if markers:
            marker = markers[i] if i < len(markers) else 'o'
            linestyle = linestyles[i] if linestyles and i < len(linestyles) else 'None'
            elements.append(
                Line2D([0], [0], marker=marker, color=color, linestyle=linestyle,
                       markersize=10, markeredgewidth=2, label=label)
            )
        else:
            elements.append(
                mpatches.Patch(facecolor=color, alpha=0.7, label=label)
            )

    return elements


def add_reference_line(
    ax: plt.Axes,
    value: float,
    orientation: str = 'horizontal',
    color: str = 'green',
    linestyle: str = '--',
    alpha: float = 0.5,
    label: Optional[str] = None
) -> None:
    """
    Add a reference line to the plot.

    Args:
        ax: Matplotlib axes
        value: Position of the line
        orientation: 'horizontal' or 'vertical'
        color: Line color
        linestyle: Line style
        alpha: Line transparency
        label: Optional legend label
    """
    if orientation == 'horizontal':
        ax.axhline(y=value, color=color, linestyle=linestyle, alpha=alpha, label=label)
    else:
        ax.axvline(x=value, color=color, linestyle=linestyle, alpha=alpha, label=label)


def add_expected_markers(
    ax: plt.Axes,
    x_positions: List[float],
    expected_values: List[float],
    color: str = 'red',
    marker: str = '_',
    size: int = 200,
    linewidth: int = 3,
    label: str = 'Expected (theoretical)'
) -> None:
    """
    Add expected value markers to a bar chart.

    Args:
        ax: Matplotlib axes
        x_positions: X positions for markers
        expected_values: Expected values to mark
        color: Marker color
        marker: Marker style
        size: Marker size
        linewidth: Marker line width
        label: Legend label
    """
    ax.scatter(
        x_positions,
        expected_values,
        marker=marker,
        s=size,
        color=color,
        zorder=5,
        linewidth=linewidth,
        label=label
    )
