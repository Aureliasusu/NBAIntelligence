"""
Simple dynamic agent: LLM + system prompt + tools (query_data, visualize).
"""
import json
import os
from typing import Any, Optional

from openai import OpenAI

from tools import query_data, visualize, data_query_analysis

# Default system prompt: instructions and flow tags
DEFAULT_SYSTEM_PROMPT = """
You are the NBA Intelligence assistant. 
You help users explore, analyze, and visualize NBA player performance data of the 2024-2025 season.

[TOOLS]
You have access to two tools:
1. data_query_analysis — Retrive structured data from the database and help user run analysis on the data.
2. visualize — Create charts (bar, scatter, line, histogram) from the data.

[WORKFLOW]
Plan in your mind and call the tools as needed. In your reply to the user, do not show intermediate variables, code, or execution steps. Only present the final solution and refer to the table or chart results.
- Use the tools (data_query_analysis, visualize) as needed.
- Then reply with a short summary that refers to the results (e.g. "The top 10 players by points are shown in the table and chart above."). Do not output <THINK>, <EXECUTE>, or pseudo-code; only the solution.

[CONTEXT — RESOLVING "THEM", "THAT", "THOSE"]
The user often refers to the previous turn (e.g. "Show them in a bar chart", "What about average per game?", "Visualize that"). You MUST use the conversation history to resolve these references. Look at the user's previous message and your previous reply to determine:
- What "them" / "that" / "those" refers to (e.g. "the top 5 players by average rebounds" from the last exchange).
- The exact metric (e.g. TRB, PTS, AST), aggregation (sum vs mean), and N (e.g. 5). Then call the tool with those same parameters. Do not guess or use default columns when the context clearly specifies a different metric (e.g. rebounds → TRB, not PTS).

[GENERAL INSTRUCTIONS]
- The database has columns: 
  -- Player: player name
  -- Tm: team name
  -- Opp: opponent team name
  -- Res: result of the game
  -- MP: minutes played
  -- FG: field goals made
  -- FGA: field goals attempted
  -- FG%: field goal percentage
  -- 3P: three-pointers made
  -- 3PA: three-pointers attempted
  -- 3P%: three-pointer percentage
  -- FT: free throws made
  -- FTA: free throws attempted
  -- FT%: free throw percentage
  -- ORB: offensive rebounds
  -- DRB: defensive rebounds
  -- TRB: total rebounds
  -- AST: assists
  -- STL: steals
  -- BLK: blocks
  -- TOV: turnovers
  -- PF: personal fouls
  -- PTS: points
  -- GmSc: game score
  -- Data: game date
- When the user asks about data, stats, or players, use data_query_analysis to retrieve data from the database and run analysis on the dataframe.
    When retrieving data, use include to select columns, filters (or filter_column/filter_value) to restrict by player, team, or date, sort_by and sort_order to order results, and group_by with agg_column and agg_func for aggregations (e.g. total or average points per player).
    You can call data_query_analysis multiple times with different parameters to get different views of the data.
- For "top N by [metric]" (e.g. top 7 players by points, top 5 by rebounds): You MUST use aggregation in BOTH tools so the table and chart show the same N players. Never use only limit=N without group_by, agg_column, agg_func, and sort_by — that returns the first N rows in table order (e.g. alphabetically by name), not the top N by the metric.
  -- "Total" (e.g. most points, total rebounds): group_by="Player", agg_column="PTS" or "TRB" or "AST" etc., agg_func="sum", sort_by="PTS_total" or "TRB_total" or "AST_total", sort_order="desc", limit=N, include e.g. "Player,PTS_total". Use the same in visualize.
  -- "Average per game" (e.g. average pts, average rebounds per game): group_by="Player", agg_column="PTS" or "TRB" etc., agg_func="mean", sort_by="PTS_avg" or "TRB_avg", sort_order="desc", limit=N, include e.g. "Player,TRB_avg". Use the same in visualize. Aggregated column names: sum → "{col}_total", mean → "{col}_avg".
- When the user asks to "show them in a bar chart" or "visualize them" as a follow-up to a previous answer about top N by a metric (e.g. top 5 by average rebounds), you MUST call visualize with the SAME aggregation and limit: group_by="Player", agg_column set to that metric (e.g. "TRB" for rebounds), agg_func="mean" or "sum" as in the previous answer, sort_by="TRB_avg" or "TRB_total" accordingly, sort_order="desc", limit=N. Do NOT call visualize with only x, y, and limit — that plots raw rows and shows the first N players alphabetically, not the top N by the metric.
- If not explicitly asked for a chart, you may show a table or summarize in text. Otherwise use the visualize tool with chart_type, x, y, and optional title, x_label, y_label. For "top N" bar charts always pass group_by, agg_column, agg_func, sort_by (e.g. PTS_avg or TRB_avg), sort_order, limit to visualize.
- When the user asks to "highlight" a player (e.g. "highlight Jokic", "highlight LeBron"): pass highlight_value set to that player's name (e.g. "Jokic" or "Nikola Jokić") to the visualize tool. The chart will show that player's bar in a distinct color (e.g. gold) and all other bars in gray. Use highlight_value in every visualize call when the user asked to highlight that player.
- When the user asks for "top N for all 3 categories" (e.g. points, rebounds, assists): create 3 separate bar charts — one for top N by PTS, one for top N by TRB, one for top N by AST. Use the same limit (e.g. 10) and, if the user asked to highlight a player, pass highlight_value in all three visualize calls so that player is highlighted in each chart.
- Always summarize results in a short reply; include the tool output when relevant. If results are in a table or plot, refer to them and summarize briefly.
- If a tool returns an error, explain and suggest a different query.
- In your final message: do not show variable names, code, or step-by-step execution. Only the answer and a brief reference to the table or chart.

EXAMPLE (what to do internally; do not output this to the user):
Query: "What are the top 7 players by points? Show them in a bar chart."
- data_query_analysis: group_by="Player", agg_column="PTS", agg_func="sum", sort_by="PTS_total", sort_order="desc", limit=7, include="Player,PTS_total".
- visualize: chart_type="bar", group_by="Player", agg_column="PTS", agg_func="sum", sort_by="PTS_total", sort_order="desc", limit=7, title="Top 7 players by total points", x_label="Player", y_label="Points".
- Reply: "The top 7 players by total points are shown in the table and bar chart above."

Query: "How about top 7 players by their average pts per game? Show them in a bar chart."
- data_query_analysis: group_by="Player", agg_column="PTS", agg_func="mean", sort_by="PTS_avg", sort_order="desc", limit=7, include="Player,PTS_avg". (Use mean for average per game; sort by PTS_avg.)
- visualize: chart_type="bar", group_by="Player", agg_column="PTS", agg_func="mean", sort_by="PTS_avg", sort_order="desc", limit=7, title="Top 7 players by average points per game", x_label="Player", y_label="Avg points per game".
- Reply: "The top 7 players by average points per game are shown in the table and bar chart above."

Follow-up: User previously asked about top 5 by average rebounds per game; now says "Show them in a bar chart."
- You MUST call visualize with the same aggregation as the previous answer: chart_type="bar", group_by="Player", agg_column="TRB", agg_func="mean", sort_by="TRB_avg", sort_order="desc", limit=5, title="Top 5 players by average rebounds per game", x_label="Player", y_label="Avg rebounds per game". Do NOT call visualize with only x="Player", y="TRB", limit=5 — that shows first 5 players by name, not top 5 by rebounds.

"""


# OpenAI-compatible tool definitions for the LLM
TOOL_DEFS = [
    {
        "type": "function",
        "function": {
            "name": "data_query_analysis",
            "description": "Retrieve and analyze data from the NBA 24-25 season database. Single flexible tool: specify which columns to include, optional filters, optional sort, optional aggregation (group_by + agg_column + agg_func), and limit. For 'top N by total points' use group_by='Player', agg_column='PTS', agg_func='sum', sort_by='PTS_total'. For 'top N by average points per game' use agg_func='mean', sort_by='PTS_avg' (not PTS_total). Never use only limit without aggregation for 'top by' questions or you get first N rows by table order (e.g. alphabetically), not top by the metric.",
            "parameters": {
                "type": "object",
                "properties": {
                    "include": {"type": "string", "description": "Comma-separated column names to return (e.g. 'Player,PTS'). Omit for all columns."},
                    "limit": {"type": "integer", "description": "Max rows to return", "default": 100},
                    "sort_by": {"type": "string", "description": "Column name to sort by"},
                    "sort_order": {"type": "string", "enum": ["asc", "desc"], "description": "Sort order", "default": "desc"},
                    "filters": {"type": "string", "description": "JSON object of column-value pairs, e.g. {\"Tm\": \"LAL\", \"Player\": \"LeBron\"}"},
                    "filter_column": {"type": "string", "description": "Single filter column name"},
                    "filter_value": {"type": "string", "description": "Value for filter_column"},
                    "group_by": {"type": "string", "description": "Column to group by (e.g. Player) for aggregation"},
                    "agg_column": {"type": "string", "description": "Column to aggregate (e.g. PTS) when group_by is set"},
                    "agg_func": {"type": "string", "enum": ["sum", "mean", "count", "min", "max"], "description": "Aggregation when group_by and agg_column are set"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "visualize",
            "description": "Create a Plotly chart from the database: bar, scatter, line, or histogram. For 'top N' bar charts (e.g. top 7 by points, top 5 by average rebounds) you MUST pass group_by, agg_column, agg_func, sort_by (e.g. PTS_total, PTS_avg, TRB_avg), sort_order, and limit so the chart shows only N bars. When the user says 'show them in a bar chart' as a follow-up, use the SAME aggregation (e.g. for average rebounds: agg_column='TRB', agg_func='mean', sort_by='TRB_avg', limit=N). To highlight a specific player (e.g. Jokic), pass highlight_value='Jokic' or 'Nikola Jokić' so that bar is shown in a distinct color and others in gray. For 'top 10 for all 3 categories' create 3 charts (PTS, TRB, AST) and pass highlight_value in each if the user asked to highlight a player.",
            "parameters": {
                "type": "object",
                "properties": {
                    "chart_type": {"type": "string", "enum": ["bar", "scatter", "line", "histogram"]},
                    "x": {"type": "string", "description": "Column for x-axis"},
                    "y": {"type": "string", "description": "Column for y-axis (optional for bar/histogram)"},
                    "group_by": {"type": "string", "description": "Column to group or color by"},
                    "filter_column": {"type": "string"},
                    "filter_value": {"type": "string"},
                    "limit": {"type": "integer", "default": 500},
                    "title": {"type": "string", "description": "Chart title"},
                    "x_label": {"type": "string", "description": "X-axis label"},
                    "y_label": {"type": "string", "description": "Y-axis label"},
                    "agg_column": {"type": "string", "description": "Column to aggregate for bar chart (e.g. PTS); use with group_by and agg_func for top-N charts"},
                    "agg_func": {"type": "string", "enum": ["sum", "mean", "count", "min", "max"]},
                    "sort_by": {"type": "string", "description": "Column to sort by when using aggregation"},
                    "sort_order": {"type": "string", "enum": ["asc", "desc"], "default": "desc"},
                    "highlight_value": {"type": "string", "description": "Value to highlight in the chart (e.g. player name like 'Jokic' or 'Nikola Jokić'). That bar will be shown in a distinct color; other bars in gray. Use when user asks to 'highlight' a player or name."},
                },
                "required": ["chart_type", "x"],
            },
        },
    },
]


def run_tool(name: str, arguments: dict) -> dict:
    """Execute a tool by name with given arguments. Returns a dict for the LLM and frontend."""
    args = arguments or {}

    if name == "data_query_analysis":
        limit = args.get("limit")
        try:
            limit = int(limit) if limit is not None else 100
        except (TypeError, ValueError):
            limit = 100
        out = data_query_analysis(
            include=args.get("include"),
            limit=limit,
            sort_by=args.get("sort_by"),
            sort_order=args.get("sort_order") or "desc",
            filters=args.get("filters"),
            filter_column=args.get("filter_column"),
            filter_value=args.get("filter_value"),
            group_by=args.get("group_by"),
            agg_column=args.get("agg_column"),
            agg_func=args.get("agg_func"),
        )
        return {"tool": "query_data", "table": out, "text": out.get("summary", "") + "\n" + _table_preview(out)}

    if name == "query_data":
        limit = args.get("limit")
        try:
            limit = int(limit) if limit is not None else 100
        except (TypeError, ValueError):
            limit = 100
        out = query_data(
            action=args.get("action", "head"),
            columns=args.get("columns"),
            filter_column=args.get("filter_column"),
            filter_value=args.get("filter_value"),
            limit=limit,
            group_by=args.get("group_by"),
            agg_column=args.get("agg_column"),
            agg_func=args.get("agg_func"),
        )
        return {"tool": "query_data", "table": out, "text": out.get("summary", "") + "\n" + _table_preview(out)}

    if name == "visualize":
        viz_limit = args.get("limit")
        try:
            viz_limit = int(viz_limit) if viz_limit is not None else 500
        except (TypeError, ValueError):
            viz_limit = 500
        out = visualize(
            chart_type=args.get("chart_type", "bar"),
            x=args.get("x", ""),
            y=args.get("y"),
            group_by=args.get("group_by"),
            filter_column=args.get("filter_column"),
            filter_value=args.get("filter_value"),
            limit=viz_limit,
            title=args.get("title"),
            x_label=args.get("x_label"),
            y_label=args.get("y_label"),
            agg_column=args.get("agg_column"),
            agg_func=args.get("agg_func"),
            sort_by=args.get("sort_by"),
            sort_order=args.get("sort_order") or "desc",
            highlight_value=args.get("highlight_value"),
        )
        return {"tool": "visualize", "plotly_json": out.get("plotly_json"), "error": out.get("error"), "text": out.get("error") or "Chart generated."}

    return {"tool": name, "error": "Unknown tool", "text": "Unknown tool."}


def _table_preview(t: dict, max_rows: int = 10) -> str:
    """Short text preview of a table for the LLM."""
    cols = t.get("columns", [])
    rows = t.get("rows", [])[:max_rows]
    if not cols:
        return "(no columns)"
    lines = [" | ".join(str(c) for c in cols)]
    for row in rows:
        lines.append(" | ".join(str(x) for x in row))
    return "\n".join(lines)


def chat(
    messages: list[dict],
    *,
    api_key: Optional[str] = None,
    model: str = "gpt-4o-mini",
    system_prompt: Optional[str] = None,
    max_tool_rounds: int = 3,
) -> dict:
    """
    Run the agent: LLM with optional tool calls, execute tools, repeat until done or max rounds.

    Returns:
        {
          "messages": [...],  # full conversation including assistant and tool results
          "last_content": "...",  # final assistant text
          "tool_results": [{"tool": "query_data"|"visualize", "table"?: {...}, "plotly_json"?: str, "error"?: str}, ...]
        }
    """
    api_key = api_key or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return {
            "messages": messages,
            "last_content": "Error: OPENAI_API_KEY is not set. Set it in the environment or in the .env file.",
            "tool_results": [],
        }

    client = OpenAI(api_key=api_key)
    system = system_prompt or DEFAULT_SYSTEM_PROMPT
    conv = [{"role": "system", "content": system}] + [m for m in messages if m.get("role") in ("user", "assistant")]

    all_tool_results = []

    for _ in range(max_tool_rounds):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=conv,
                tools=TOOL_DEFS,
                tool_choice="auto",
            )
        except Exception as e:
            return {
                "messages": conv[1:],
                "last_content": f"Error: {getattr(e, 'message', str(e))}",
                "tool_results": all_tool_results,
            }
        if not response.choices:
            return {"messages": conv[1:], "last_content": "Error: No response from model.", "tool_results": all_tool_results}
        choice = response.choices[0]
        msg = choice.message
        if not msg.tool_calls:
            conv.append({"role": "assistant", "content": msg.content or ""})
            return {
                "messages": conv[1:],
                "last_content": msg.content or "",
                "tool_results": all_tool_results,
            }

        conv.append(
            {
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                    for tc in msg.tool_calls
                ],
            }
        )

        for tc in msg.tool_calls:
            name = tc.function.name
            try:
                args = json.loads(tc.function.arguments)
            except (json.JSONDecodeError, TypeError):
                args = {}
            try:
                result = run_tool(name, args)
            except Exception as e:
                result = {"tool": name, "error": str(e), "text": str(e)}
            all_tool_results.append(result)
            # Send a concise summary to the LLM; frontend gets full result via tool_results
            content_for_llm = result.get("text", "")
            if result.get("error"):
                content_for_llm += f"\nError: {result['error']}"
            conv.append({"role": "tool", "tool_call_id": tc.id, "content": content_for_llm})

    conv.append({"role": "assistant", "content": "I've used the tools as much as needed. Please ask a follow-up if you want more detail."})
    return {"messages": conv[1:], "last_content": conv[-1]["content"], "tool_results": all_tool_results}


