# AI Assistant backend

Simple dynamic agent: configurable **LLM** + **system prompt** + **tools** (data analysis, Plotly visualization).

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Set your OpenAI API key:

**Option A — .env file (recommended)**  
Copy the example file and add your key (the file is git-ignored):

```bash
cp .env.example .env
# Edit .env and set: OPENAI_API_KEY=sk-your-key-here
```

Put `.env` either in the **project root** or in the **backend/** folder; the app loads from both.

**Option B — shell**  
```bash
export OPENAI_API_KEY=sk-...
```

## Run

```bash
uvicorn main:app --reload --port 8000
```

The frontend (Vite on port 5173) proxies `/api` to `http://127.0.0.1:8000`.

## API

- **GET /api/health** — Health check.
- **POST /api/chat** — Run the agent.

  Body:
  ```json
  {
    "messages": [{"role": "user", "content": "Who are the top scorers?"}],
    "system_prompt": null,
    "model": "gpt-4o-mini",
    "api_key": null
  }
  ```
  Response:
  ```json
  {
    "last_content": "Assistant reply text.",
    "tool_results": [
      {"tool": "query_data", "table": {"columns": [...], "rows": [...], "summary": "..."}},
      {"tool": "visualize", "plotly_json": "{...}"}
    ]
  }
  ```

## Components

- **LLM**: OpenAI API (model configurable via request).
- **System prompt**: Instructions and `[TOOLS]` / `[FLOW]` tags; overridable via request.
- **Tools**:
  - **query_data**: Actions `head`, `describe`, `columns`, `value_counts`, `filter`, `summary` on `resources/data/database_24_25.csv`.
  - **visualize**: Plotly charts (`bar`, `scatter`, `line`, `histogram`) from the same data.
