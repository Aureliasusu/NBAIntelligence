"""
Tools for the AI Assistant agent: data analysis on database_24_25.csv and Plotly visualization.
"""
import json
import unicodedata
from pathlib import Path
from typing import Dict, List, Optional, Union

import pandas as pd
import plotly.express as px

# Path to CSV: project root is parent of backend/
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = PROJECT_ROOT / "resources" / "data" / "database_24_25.csv"

_df_cache = None


def _normalize_for_match(s: str) -> str:
    """Normalize string for case-insensitive, accent-insensitive match (e.g. Jokic matches Jokić)."""
    if not s:
        return ""
    s = str(s).strip().lower()
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")


def _get_df():
    global _df_cache
    if _df_cache is None:
        if not DATA_PATH.exists():
            raise FileNotFoundError(f"Data file not found: {DATA_PATH}")
        _df_cache = pd.read_csv(DATA_PATH)
    return _df_cache.copy()


def _parse_include(include: Optional[Union[str, List[str]]]):
    """Parse include into a list of column names. include can be comma-separated string or list."""
    if include is None:
        return None
    if isinstance(include, list):
        return [str(c).strip() for c in include if c]
    if isinstance(include, str):
        return [c.strip() for c in include.split(",") if c.strip()]
    return None


def _parse_filters(
    filters: Optional[str],
    filter_column: Optional[str] = None,
    filter_value: Optional[str] = None,
):
    """Return a list of (column, value) from filters JSON string and/or single filter_column/filter_value."""
    out = []
    if filter_column and filter_value is not None:
        out.append((str(filter_column).strip(), filter_value))
    if filters and isinstance(filters, str):
        try:
            obj = json.loads(filters)
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if k and v is not None:
                        out.append((str(k).strip(), v))
        except json.JSONDecodeError:
            pass
    return out


def _apply_filters(df: pd.DataFrame, filter_list: List[tuple]):
    """Apply a list of (column, value) filters to df."""
    for col, val in filter_list:
        if col not in df.columns:
            continue
        try:
            if df[col].dtype.kind in "fc":
                df = df[df[col] == float(val)]
            else:
                df = df[df[col].astype(str).str.strip() == str(val).strip()]
        except Exception:
            pass
    return df


def _table_result(df: pd.DataFrame, limit: int = 100, summary: str = "") -> Dict:
    """Build standard { columns, rows, summary } from a dataframe."""
    df = df.head(limit)
    out_df = df.fillna("").astype(str)
    return {
        "columns": out_df.columns.tolist(),
        "rows": out_df.values.tolist(),
        "summary": summary or f"Returned {len(out_df)} rows.",
    }


def data_query_analysis(
    include: Optional[Union[str, List[str]]] = None,
    limit: int = 100,
    sort_by: Optional[str] = None,
    sort_order: str = "desc",
    filters: Optional[str] = None,
    filter_column: Optional[str] = None,
    filter_value: Optional[str] = None,
    group_by: Optional[str] = None,
    agg_column: Optional[str] = None,
    agg_func: Optional[str] = None,
) -> Dict:
    """
    Retrieve and analyze data from the NBA 24-25 season database.
    Supports: column selection (include), filtering (filters or filter_column/filter_value),
    sorting (sort_by, sort_order), aggregation (group_by + agg_column + agg_func).
    Order: filter -> aggregate (if requested) -> sort -> select columns -> limit.
    """
    df = _get_df()
    filter_list = _parse_filters(filters, filter_column, filter_value)
    df = _apply_filters(df, filter_list)

    if group_by and group_by in df.columns:
        agg_col = agg_column if agg_column and agg_column in df.columns else None
        func = (agg_func or "sum").lower() if agg_col else "count"
        if agg_col:
            if func == "sum":
                df = df.groupby(group_by)[agg_col].sum().reset_index()
                df.columns = [group_by, f"{agg_col}_total"]
            elif func == "mean":
                df = df.groupby(group_by)[agg_col].mean().reset_index()
                df.columns = [group_by, f"{agg_col}_avg"]
            elif func == "count":
                df = df.groupby(group_by)[agg_col].count().reset_index()
                df.columns = [group_by, f"{agg_col}_count"]
            elif func in ("min", "max"):
                df = df.groupby(group_by)[agg_col].agg(func).reset_index()
                df.columns = [group_by, f"{agg_col}_{func}"]
            else:
                df = df.groupby(group_by)[agg_col].sum().reset_index()
                df.columns = [group_by, f"{agg_col}_total"]
        else:
            df = df.groupby(group_by).size().reset_index(name="count")

    if sort_by and sort_by in df.columns:
        asc = (sort_order or "desc").lower() != "desc"
        df = df.sort_values(by=sort_by, ascending=asc)

    inc = _parse_include(include)
    if inc:
        valid = [c for c in inc if c in df.columns]
        if valid:
            df = df[valid]

    return _table_result(df, limit=limit)


def query_data(
    action: str,
    columns: Optional[str] = None,
    filter_column: Optional[str] = None,
    filter_value: Optional[str] = None,
    limit: int = 100,
    group_by: Optional[str] = None,
    agg_column: Optional[str] = None,
    agg_func: Optional[str] = None,
) -> Dict:
    """
    Query or analyze the NBA 24-25 season database.

    Args:
        action: One of "head", "describe", "columns", "value_counts", "filter", "summary", "aggregate".
        columns: Comma-separated column names (optional).
        filter_column: Column name to filter on (for action "filter").
        filter_value: Value to match in filter_column.
        limit: Max rows to return (default 100).
        group_by: Column to group by (for action "aggregate").
        agg_column: Column to aggregate (e.g. PTS) for action "aggregate".
        agg_func: "sum" or "mean" for action "aggregate".

    Returns:
        dict with "columns", "rows", "summary".
    """
    df = _get_df()
    if columns and isinstance(columns, str):
        columns = [c.strip() for c in columns.split(",") if c.strip()]
    else:
        columns = None

    if action == "columns":
        return {"columns": ["column"], "rows": [[c] for c in df.columns.tolist()], "summary": f"Total columns: {len(df.columns)}"}

    if action == "head":
        subset = df.head(limit)
        return {"columns": subset.columns.tolist(), "rows": subset.fillna("").astype(str).values.tolist()}

    if action == "describe":
        subset = df.describe(include="all").fillna("").astype(str)
        subset = subset.reset_index()
        subset = subset.astype(str)
        return {"columns": subset.columns.tolist(), "rows": subset.values.tolist()}

    if action == "value_counts":
        if not columns or len(columns) != 1:
            return {"columns": ["column", "count"], "rows": [], "summary": "value_counts requires exactly one column name."}
        col = columns[0]
        if col not in df.columns:
            return {"columns": [], "rows": [], "summary": f"Column '{col}' not found. Available: {list(df.columns)}"}
        vc = df[col].value_counts().head(limit).reset_index()
        vc.columns = [col, "count"]
        return {"columns": vc.columns.tolist(), "rows": vc.fillna("").astype(str).values.tolist()}

    if action == "filter":
        if not filter_column or filter_value is None:
            return {"columns": [], "rows": [], "summary": "filter requires filter_column and filter_value."}
        if filter_column not in df.columns:
            return {"columns": [], "rows": [], "summary": f"Column '{filter_column}' not found."}
        try:
            if df[filter_column].dtype.kind in "fc":
                val = float(filter_value)
                subset = df[df[filter_column] == val]
            else:
                subset = df[df[filter_column].astype(str) == str(filter_value)]
            subset = subset.head(limit)
            return {"columns": subset.columns.tolist(), "rows": subset.fillna("").astype(str).values.tolist()}
        except Exception as e:
            return {"columns": [], "rows": [], "summary": f"Filter error: {e}"}

    if action == "aggregate":
        group_col = group_by or "Player"
        agg_col = agg_column or "PTS"
        func = (agg_func or "sum").lower()
        if group_col not in df.columns:
            return {"columns": [], "rows": [], "summary": f"Column '{group_col}' not found."}
        if agg_col not in df.columns:
            return {"columns": [], "rows": [], "summary": f"Column '{agg_col}' not found."}
        try:
            if func == "sum":
                agg_df = df.groupby(group_col)[agg_col].sum().sort_values(ascending=False).head(limit).reset_index()
                agg_df.columns = [group_col, f"{agg_col}_total"]
            elif func == "mean":
                agg_df = df.groupby(group_col)[agg_col].mean().sort_values(ascending=False).head(limit).reset_index()
                agg_df.columns = [group_col, f"{agg_col}_avg"]
            else:
                return {"columns": [], "rows": [], "summary": "agg_func must be 'sum' or 'mean'."}
            return {"columns": agg_df.columns.tolist(), "rows": agg_df.fillna("").astype(str).values.tolist(), "summary": f"Top {limit} by {agg_col} ({func})."}
        except Exception as e:
            return {"columns": [], "rows": [], "summary": f"Aggregate error: {e}"}

    if action == "summary":
        subset = df.head(limit) if columns else df.head(limit)
        if columns:
            subset = subset[[c for c in columns if c in subset.columns]]
        return {"columns": subset.columns.tolist(), "rows": subset.fillna("").astype(str).values.tolist(), "summary": f"Shape: {df.shape[0]} rows, {df.shape[1]} columns."}

    return {"columns": [], "rows": [], "summary": f"Unknown action: {action}. Use one of: head, describe, columns, value_counts, filter, summary, aggregate."}


def visualize(
    chart_type: str,
    x: str,
    y: Optional[str] = None,
    group_by: Optional[str] = None,
    filter_column: Optional[str] = None,
    filter_value: Optional[str] = None,
    limit: int = 500,
    title: Optional[str] = None,
    x_label: Optional[str] = None,
    y_label: Optional[str] = None,
    agg_column: Optional[str] = None,
    agg_func: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: str = "desc",
    highlight_value: Optional[str] = None,
) -> Dict:
    """
    Create a Plotly chart from the NBA database.

    Args:
        chart_type: "bar", "scatter", "line", or "histogram".
        x: Column name for x-axis (or single variable for histogram).
        y: Column name for y-axis (optional for bar/histogram when aggregating).
        group_by: Column to group/color by (optional).
        filter_column: Column to filter on before plotting.
        filter_value: Value to filter by.
        limit: Max points to plot (default 500).

    Returns:
        dict with "plotly_json": Plotly figure as JSON string for frontend.
    """
    df = _get_df()
    if filter_column and filter_value is not None and filter_column in df.columns:
        try:
            if df[filter_column].dtype.kind in "fc":
                df = df[df[filter_column] == float(filter_value)]
            else:
                df = df[df[filter_column].astype(str) == str(filter_value)]
        except Exception:
            pass

    if group_by and group_by in df.columns and agg_column and agg_column in df.columns:
        func = (agg_func or "sum").lower()
        if func == "sum":
            df = df.groupby(group_by)[agg_column].sum().reset_index()
            df.columns = [group_by, f"{agg_column}_total"]
        elif func == "mean":
            df = df.groupby(group_by)[agg_column].mean().reset_index()
            df.columns = [group_by, f"{agg_column}_avg"]
        else:
            df = df.groupby(group_by)[agg_column].agg(func).reset_index()
            df.columns = [group_by, f"{agg_column}_{func}"]
        if sort_by and sort_by in df.columns:
            asc = (sort_order or "desc").lower() != "desc"
            df = df.sort_values(by=sort_by, ascending=asc)
        df = df.head(limit)
        x = group_by
        y = df.columns[1] if len(df.columns) > 1 else None
    elif chart_type == "bar" and x in df.columns and y and y in df.columns and len(df) > 30:
        # Fallback: bar chart with many raw rows → aggregate by x, sum y, top 30 so we don't show hundreds of bars
        df = df.groupby(x)[y].sum().reset_index()
        df = df.sort_values(by=y, ascending=False).head(min(limit, 30))
        group_by = None

    df = df.head(limit)

    if x not in df.columns:
        return {"plotly_json": None, "error": f"Column '{x}' not found. Available: {list(df.columns)}"}
    if y and y not in df.columns:
        return {"plotly_json": None, "error": f"Column '{y}' not found."}
    if group_by and group_by not in df.columns:
        return {"plotly_json": None, "error": f"Column '{group_by}' not found."}

    try:
        if chart_type == "bar":
            if y and (group_by or x in df.columns):
                if highlight_value and x in df.columns:
                    hv = str(highlight_value).strip()
                    df = df.copy()
                    norm_hv = _normalize_for_match(hv)
                    x_vals = df[x].astype(str).str.strip()
                    is_hl = x_vals.str.lower().str.contains(hv.lower(), na=False) | (x_vals.str.lower() == hv.lower())
                    if norm_hv:
                        is_hl = is_hl | x_vals.apply(lambda v: norm_hv in _normalize_for_match(v))
                    colors = ["#F1C40F" if h else "rgba(128,128,128,0.6)" for h in is_hl]
                    fig = px.bar(df, x=x, y=y, title=title or f"{y} by {x}")
                    fig.update_traces(marker_color=colors)
                    fig.update_layout(showlegend=False)
                else:
                    fig = px.bar(df, x=x, y=y, color=x if x in df.columns else None, title=title or f"{y} by {x}")
            elif y:
                fig = px.bar(df, x=x, y=y, color=group_by or None, title=title or f"{y} by {x}")
            else:
                vc = df[x].value_counts().reset_index()
                vc.columns = [x, "count"]
                fig = px.bar(vc.head(30), x=x, y="count", color="count", title=title or f"Count by {x}")
            if not highlight_value and x in df.columns and len(df) <= 20:
                fig.update_layout(showlegend=False)
        elif chart_type == "scatter":
            fig = px.scatter(df, x=x, y=y or "PTS", color=group_by or None, title=f"{y or 'PTS'} vs {x}")
        elif chart_type == "line":
            if group_by:
                agg = df.groupby([x, group_by])[y or "PTS"].mean().reset_index()
                fig = px.line(agg, x=x, y=y or "PTS", color=group_by, title=f"{y or 'PTS'} by {x}")
            else:
                agg = df.groupby(x)[y or "PTS"].mean().reset_index()
                fig = px.line(agg, x=x, y=y or "PTS", title=f"Mean {y or 'PTS'} by {x}")
        elif chart_type == "histogram":
            fig = px.histogram(df, x=x, color=group_by or None, title=f"Distribution of {x}")
        else:
            return {"plotly_json": None, "error": f"Unknown chart_type: {chart_type}. Use bar, scatter, line, or histogram."}

        fig.update_layout(template="plotly_dark", margin=dict(l=50, r=50, t=50, b=50), height=360)
        if title:
            fig.update_layout(title=title)
        if x_label:
            fig.update_layout(xaxis_title=x_label)
        if y_label:
            fig.update_layout(yaxis_title=y_label)
        return {"plotly_json": fig.to_json()}
    except Exception as e:
        return {"plotly_json": None, "error": str(e)}
