"""
Base class for evidence analysis scripts.

Provides a template method pattern for analysis scripts with:
- Consistent data loading and validation
- Error handling
- Output directory management
- Common analysis patterns
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, List, Dict, Any
import pandas as pd

from constants import (
    PROJECT_ROOT, RAW_DATA_DIR, OUTPUT_DIR,
    DIVIDER_WIDTH, DIVIDER_CHAR, SUBDIV_CHAR
)


class AnalysisBase(ABC):
    """
    Base class for evidence analysis scripts.

    Subclasses must implement:
    - name: The analysis name (for logging)
    - csv_filename: The CSV file to load (without path)
    - analyze(): The main analysis logic

    Optional overrides:
    - required_columns: List of columns that must exist in the CSV
    - validate_data(): Additional data validation
    """

    def __init__(self):
        self.df: Optional[pd.DataFrame] = None
        self._ensure_output_dir()

    @property
    @abstractmethod
    def name(self) -> str:
        """The name of this analysis (for logging)."""
        pass

    @property
    @abstractmethod
    def csv_filename(self) -> str:
        """The CSV filename to load (without path, e.g., 'exists.csv')."""
        pass

    @property
    def required_columns(self) -> List[str]:
        """
        List of columns that must exist in the CSV.
        Override in subclass to add validation.
        """
        return []

    @property
    def csv_path(self) -> Path:
        """Full path to the CSV file."""
        return RAW_DATA_DIR / self.csv_filename

    @property
    def output_dir(self) -> Path:
        """Output directory for figures."""
        return OUTPUT_DIR

    def _ensure_output_dir(self) -> None:
        """Create output directory if it doesn't exist."""
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def run(self) -> bool:
        """
        Execute the analysis pipeline.

        Returns:
            True if analysis completed successfully, False otherwise.
        """
        self.print_header()

        if not self.load_data():
            return False

        if not self.validate_data():
            return False

        try:
            self.analyze()
            self.print_footer()
            return True
        except Exception as e:
            print(f"\nERROR during analysis: {e}")
            raise

    def load_data(self) -> bool:
        """
        Load data from CSV file.

        Returns:
            True if data loaded successfully, False otherwise.
        """
        print(f"Loading: {self.csv_path}")

        if not self.csv_path.exists():
            print(f"ERROR: {self.csv_path} not found.")
            print("  Run the study first: npm run evidence:generate")
            return False

        try:
            self.df = pd.read_csv(self.csv_path)
            print(f"  Loaded {len(self.df)} records\n")
            return True
        except Exception as e:
            print(f"ERROR loading CSV: {e}")
            return False

    def validate_data(self) -> bool:
        """
        Validate the loaded data.

        Checks required columns and allows subclasses to add validation.

        Returns:
            True if data is valid, False otherwise.
        """
        if self.df is None or len(self.df) == 0:
            print("ERROR: No data loaded")
            return False

        # Check required columns
        missing_cols = [col for col in self.required_columns if col not in self.df.columns]
        if missing_cols:
            print(f"ERROR: Missing required columns: {missing_cols}")
            print(f"  Available columns: {list(self.df.columns)}")
            return False

        return True

    @abstractmethod
    def analyze(self) -> None:
        """
        Perform the analysis.

        Subclasses must implement this method with their analysis logic.
        """
        pass

    # =========================================================================
    # Output helpers
    # =========================================================================

    def print_header(self) -> None:
        """Print the analysis header."""
        print(f"=== {self.name} ===\n")

    def print_footer(self) -> None:
        """Print the analysis footer."""
        print(f"\n{self.check_mark} {self.name} complete")

    def print_section(self, title: str) -> None:
        """Print a section header."""
        print(f"\n{DIVIDER_CHAR * DIVIDER_WIDTH}")
        print(title)
        print(DIVIDER_CHAR * DIVIDER_WIDTH)

    def print_subsection(self, title: str) -> None:
        """Print a subsection header."""
        print(f"\n{title}")
        print(SUBDIV_CHAR * min(len(title) + 10, 80))

    def print_divider(self, char: str = SUBDIV_CHAR, width: int = DIVIDER_WIDTH) -> None:
        """Print a divider line."""
        print(char * width)

    @property
    def check_mark(self) -> str:
        """Return a check mark character."""
        return '\u2713'

    # =========================================================================
    # Data access helpers with bounds checking
    # =========================================================================

    def safe_iloc(self, df: pd.DataFrame, index: int, column: str, default: Any = None) -> Any:
        """
        Safely access a DataFrame value by index with bounds checking.

        Args:
            df: The DataFrame to access
            index: The row index
            column: The column name
            default: Value to return if access fails

        Returns:
            The value at the location, or default if not found
        """
        if df is None or len(df) == 0:
            return default
        if column not in df.columns:
            return default
        if index < 0 or index >= len(df):
            return default
        return df[column].iloc[index]

    def safe_first(self, df: pd.DataFrame, column: str, default: Any = None) -> Any:
        """
        Safely get the first value of a column.

        Args:
            df: The DataFrame to access
            column: The column name
            default: Value to return if access fails

        Returns:
            The first value, or default if not found
        """
        return self.safe_iloc(df, 0, column, default)

    def get_groups(self, column: str, order: Optional[List[str]] = None) -> List[str]:
        """
        Get unique values from a column, optionally in a specific order.

        Args:
            column: The column to get unique values from
            order: Optional list specifying the desired order

        Returns:
            List of unique values, ordered if order is provided
        """
        if self.df is None or column not in self.df.columns:
            return []

        unique_vals = self.df[column].unique()

        if order is None:
            return list(unique_vals)

        # Return values in specified order, only including those that exist
        return [v for v in order if v in unique_vals]

    def filter_data(self, **conditions) -> pd.DataFrame:
        """
        Filter the DataFrame by multiple conditions.

        Args:
            **conditions: Column-value pairs to filter by

        Returns:
            Filtered DataFrame

        Example:
            self.filter_data(scenario='sparse', method='fixed_100')
        """
        if self.df is None:
            return pd.DataFrame()

        mask = pd.Series([True] * len(self.df))
        for col, val in conditions.items():
            if col in self.df.columns:
                mask &= (self.df[col] == val)

        return self.df[mask]

    # =========================================================================
    # Output path helpers
    # =========================================================================

    def get_output_path(self, filename: str) -> Path:
        """
        Get the full output path for a file.

        Args:
            filename: The filename (with extension)

        Returns:
            Full path to the output file
        """
        return self.output_dir / filename


class MultiFileAnalysis(AnalysisBase):
    """
    Base class for analyses that load multiple CSV files.

    Override csv_filenames to specify multiple files.
    Access loaded data via self.data_frames dict.
    """

    def __init__(self):
        self.data_frames: Dict[str, pd.DataFrame] = {}
        super().__init__()

    @property
    def csv_filename(self) -> str:
        """Not used for multi-file analysis."""
        return ""

    @property
    @abstractmethod
    def csv_filenames(self) -> Dict[str, str]:
        """
        Map of names to CSV filenames to load.

        Returns:
            Dict mapping logical names to filenames, e.g.,
            {'main': 'exists.csv', 'composition': 'composition.csv'}
        """
        pass

    def load_data(self) -> bool:
        """Load data from multiple CSV files."""
        for name, filename in self.csv_filenames.items():
            csv_path = RAW_DATA_DIR / filename
            print(f"Loading {name}: {csv_path}")

            if not csv_path.exists():
                print(f"WARNING: {csv_path} not found (optional file)")
                continue

            try:
                self.data_frames[name] = pd.read_csv(csv_path)
                print(f"  Loaded {len(self.data_frames[name])} records")
            except Exception as e:
                print(f"ERROR loading {filename}: {e}")
                return False

        # Set self.df to the first loaded DataFrame for compatibility
        if self.data_frames:
            self.df = next(iter(self.data_frames.values()))

        print()
        return len(self.data_frames) > 0

    def get_df(self, name: str) -> Optional[pd.DataFrame]:
        """Get a specific DataFrame by name."""
        return self.data_frames.get(name)
