NBA Intelligence 🏀
====================

An end-to-end NBA analytics and AI demo.  
This project combines **classical machine learning** and **LLM-based agents** to explore NBA player performance, predict fantasy scores, and answer natural‑language questions over 2024‑2025 season data.

It was built as a **portfolio project** to demonstrate the skills required for an AI / Data / Engineering internship in a sports context (e.g., the NBA Artificial Intelligence Project Intern role).

---

Overview
--------

The app has two main modules:

1. **ML Predictor**
   - Trains and evaluates multiple regression models to predict **next-game fantasy scores** from recent box‑score stats.
   - Compares a simple **rolling-average baseline** (`Rolling5`) with several ML models (e.g., CatBoost, XGBoost, Random Forest, LightGBM, TabNet).
   - Selects a single **“champion” model** based on validation metrics (MAE, RMSE).
   - Uses the champion model to:
     - Rank players within a team by predicted fantasy score for the next game.
     - Visualize predicted vs actual fantasy scores and help the user build confidence in the model.

2. **AI Assistant**
   - A conversational assistant that answers questions about NBA stats and generates charts.
   - Built on a **React frontend + FastAPI backend + OpenAI API**.
   - Implements an **agent** that:
     - Uses **retrieval‑augmented generation (RAG)** over NBA-related data and documentation.
     - Calls structured **tools** to query and visualize 24–25 season data:
       - `data_query_analysis` – flexible queries and aggregations over player / team stats.
       - `visualize` – Plotly charts (bar, scatter, line, histogram) for top‑N and trend analysis.
     - Returns grounded, explainable answers plus tables and plots.

Together, these modules illustrate:

- End‑to‑end product thinking (data → model → backend → frontend).
- Practical ML for sports analytics.
- Modern LLM engineering: agents, tools, and RAG on top of structured stats.

---

Tech Stack
----------

- **Frontend**
  - React 18, Vite
  - React Router
  - Plotly.js via `react-plotly.js`
  - Custom SVG visualizations for model performance

- **Backend**
  - FastAPI + Uvicorn
  - Python (ML + data tooling)
  - OpenAI API (chat completions)
  - Pydantic models for request / response validation

- **ML / Data**
  - Tabular features engineered from NBA box‑score data
  - Multiple regression models (CatBoost, XGBoost, Random Forest, HistGradientBoosting, LightGBM, TabNet) plus a rolling-average baseline
  - JSON exports for:
    - Validation predictions per model
    - Champion model metrics (MAE, RMSE)
    - Next-game predictions per player / team

---

Key Features
------------

### 1. ML Predictor – Fantasy Score

- **Model comparison dashboard**
  - For each model, plots **Predicted vs Actual** fantasy scores on a validation set.
  - Shows **MAE** and **RMSE** per model in a summary table.
  - Highlights the best-performing **champion model** with a crown icon and frame.

- **Predict for Team**
  - Uses only the **champion model** to score the next game for each player on a selected team.
  - Ranks players by predicted fantasy score and surfaces them in a sortable table.

- **User Confidence View**
  - For a chosen team, shows multiple players’ predicted vs actual fantasy scores over the last N games.
  - Each player is a different color; hover to inspect per‑game details.
  - Helps users see where the model over‑ or under‑predicts.

### 2. AI Assistant – Agent + RAG + Tools

- **Natural-language interface**
  - Ask questions like:
    - “Who are the top 10 players by average points per game?”
    - “Show me a bar chart of the top rebounders.”
    - “Compare scoring and assists for a specific player.”

- **Agent orchestration**
  - A backend `agent` module:
    - Wraps the OpenAI Chat Completions API.
    - Provides a **system prompt** explaining:
      - The schema of the NBA stats table (columns such as `PTS`, `TRB`, `AST`, etc.).
      - How to interpret user references like “those players” or “that chart”.
      - How to choose and parameterize tools for “top N” questions, averages, and totals.

- **Tool calling**
  - `data_query_analysis`:
    - Selects columns, filters by player / team / opponent, groups and aggregates (sum, mean, etc.), sorts, and limits.
    - Used for “top N” queries and descriptive stats.
  - `visualize`:
    - Builds Plotly charts directly from the same data and aggregation parameters.
    - Supports bar / scatter / line / histogram, top‑N bar charts, and optional highlighting of specific players.

- **RAG for grounding**
  - Before answering, the backend retrieves relevant snippets from a small NBA knowledge base:
    - Descriptions of metrics and formulas.
    - Narrative context for teams and players.
  - The retrieved context is passed into the model alongside the user question, so answers are grounded in real information rather than relying purely on pre‑training.

---

How to Run Locally
------------------

Requirements:

- Node.js (>= 18)
- Python 3.9+
- An OpenAI API key

### 1. Clone and install

```bash
git clone https://github.com/Aureliasusu/NBAIntelligence.git
cd NBAIntelligence

# Frontend deps
npm install

# Backend deps
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure OpenAI

Create a `.env` file **either** in `backend/` **or** in the project root:

```bash
OPENAI_API_KEY=sk-...
```

The backend loads `.env` from both locations.

### 3. Run backend (FastAPI)

From `backend/`:

```bash
uvicorn main:app --port 8000
```

This exposes:

- `GET /api/health` – health check
- `POST /api/chat` – AI assistant endpoint

### 4. Run frontend (Vite + React)

In another terminal, from the project root:

```bash
npm run dev
```

By default Vite serves at `http://localhost:5173/` and proxies `/api` to `http://127.0.0.1:8000`.

Open the URL, then:

- Go to the **ML Predictor** tab to explore model performance and team‑level predictions.
- Go to the **AI Assistant** tab to ask questions and generate charts over NBA stats.

---

How This Project Maps to an AI / Data Internship
------------------------------------------------

This project is intentionally scoped to mirror real responsibilities of an AI intern in a sports organization:

- **AI‑enabled prototypes**  
  - ML predictor module: end‑to‑end training, evaluation, and user‑facing predictions.
  - AI assistant module: LLM + tools + RAG with real basketball data.

- **End‑to‑end development**  
  - Data engineering (feature construction from box scores).  
  - Model selection and validation.  
  - Backend APIs with FastAPI.  
  - Frontend UI/UX for non‑technical users.

- **Responsible and explainable AI**  
  - Transparent metrics (MAE / RMSE) for model selection.  
  - Visualizations of prediction vs reality to build user trust.  
  - Grounded LLM answers via RAG and explicit schemas for the tools.

In short, **NBA Intelligence** is a compact, realistic demo of how AI and data products can support basketball operations, fan experiences, and decision‑making.

