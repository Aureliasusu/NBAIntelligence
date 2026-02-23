import { useState, useEffect } from "react";
import "./MLPredictorPage.css";

/** Flatten player-series val export to [{ y_pred, y_true }, ...] */
function flattenValExport(obj) {
  if (!obj || typeof obj !== "object") return [];
  const out = [];
  for (const key of Object.keys(obj)) {
    const series = obj[key];
    const games = series?.games || [];
    for (const g of games) {
      if (g.y_pred != null && g.y_true != null) out.push({ y_pred: g.y_pred, y_true: g.y_true });
    }
  }
  return out;
}

/** Generate roughly 5–7 nice tick values between min and max */
function niceTicks(min, max, count = 5) {
  const range = max - min || 1;
  let step = range / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step)));
  const norm = step / mag;
  if (norm <= 1) step = mag;
  else if (norm <= 2) step = 2 * mag;
  else if (norm <= 5) step = 5 * mag;
  else step = 10 * mag;
  const start = Math.floor(min / step) * step;
  const ticks = [];
  for (let t = start; t <= max + step * 0.01; t += step) {
    if (t >= min - 0.01) ticks.push(t);
  }
  return ticks.length ? ticks : [min, max];
}

/** Scatter plot: X = Actual (y_true), Y = Predicted (y_pred); equal x/y scale; champion panel has frame highlight only */
function ScatterPlot({ data, title, champion, size = 280 }) {
  if (!data.length) return null;
  const pad = 44;
  const w = size + pad * 2;
  const h = size + pad * 2;
  const xVals = data.map((d) => d.y_true);
  const yVals = data.map((d) => d.y_pred);
  const xMin = Math.min(...xVals) - 2;
  const xMax = Math.max(...xVals) + 2;
  const yMin = Math.min(...yVals) - 2;
  const yMax = Math.max(...yVals) + 2;
  const dataMin = Math.min(xMin, yMin);
  const dataMax = Math.max(xMax, yMax);
  const range = dataMax - dataMin || 1;
  const scaleX = (v) => pad + ((v - dataMin) / range) * size;
  const scaleY = (v) => h - pad - ((v - dataMin) / range) * size;
  const ticks = niceTicks(dataMin, dataMax);

  return (
    <div className={`ml-scatter-wrap ${champion ? "champion-panel" : ""}`}>
      <svg className="ml-scatter" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
        {/* Title at top center; champion highlighted */}
        <text
          x={w / 2}
          y={18}
          textAnchor="middle"
          className={`ml-scatter-plot-title ${champion ? "champion-title" : ""}`}
        >
          {title}
        </text>
        {/* Diagonal reference line (y_true = y_pred) */}
        <line
          x1={scaleX(dataMin)}
          y1={scaleY(dataMin)}
          x2={scaleX(dataMax)}
          y2={scaleY(dataMax)}
          stroke="rgba(0, 245, 255, 0.2)"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
        {/* X-axis ticks — Actual (y_true) */}
        {ticks.map((t) => (
          <g key={`x-${t}`}>
            <line x1={scaleX(t)} y1={h - pad} x2={scaleX(t)} y2={h - pad + 4} stroke="rgba(0, 245, 255, 0.4)" strokeWidth="1" />
            <text x={scaleX(t)} y={h - pad + 14} textAnchor="middle" className="ml-scatter-tick-label">{Number(t) === t && t % 1 === 0 ? t : t.toFixed(1)}</text>
          </g>
        ))}
        {/* Y-axis ticks — Prediction (y_pred), same scale as x */}
        {ticks.map((t) => (
          <g key={`y-${t}`}>
            <line x1={pad} y1={scaleY(t)} x2={pad - 4} y2={scaleY(t)} stroke="rgba(0, 245, 255, 0.4)" strokeWidth="1" />
            <text x={pad - 6} y={scaleY(t)} textAnchor="end" dominantBaseline="middle" className="ml-scatter-tick-label">{Number(t) === t && t % 1 === 0 ? t : t.toFixed(1)}</text>
          </g>
        ))}
        {/* Points: X = y_true, Y = y_pred */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={scaleX(d.y_true)}
            cy={scaleY(d.y_pred)}
            r={1.5}
            fill="var(--color-neon-cyan)"
            fillOpacity={0.35}
            stroke="rgba(0, 245, 255, 0.5)"
            strokeWidth={0.5}
          />
        ))}
        <text x={w / 2} y={h - pad + 26} textAnchor="middle" className="ml-scatter-axis-label">
          Actual
        </text>
        <text x={14} y={h / 2} textAnchor="middle" transform={`rotate(-90, 14, ${h / 2})`} className="ml-scatter-axis-label">
          Prediction
        </text>
      </svg>
    </div>
  );
}

/** 20 colors: tab20-style palette, chosen for distinguishability (hue + luminance) and colorblind-friendly use */
const PLAYER_COLORS = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
  "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5",
  "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5",
];

function TeamScatterWithLegend({ playerPoints, size = 400 }) {
  const [hovered, setHovered] = useState(null);
  const [hiddenPlayers, setHiddenPlayers] = useState(() => new Set());

  const togglePlayer = (player) => {
    setHiddenPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(player)) next.delete(player);
      else next.add(player);
      return next;
    });
  };

  if (!playerPoints?.length) return null;
  const pad = 48;
  const w = size + pad * 2;
  const h = size + pad * 2;
  const visiblePoints = playerPoints.filter((pp) => !hiddenPlayers.has(pp.player));
  const allPoints = visiblePoints.flatMap((pp) => pp.points);
  const xVals = allPoints.length ? allPoints.map((d) => d.y_true) : [0];
  const yVals = allPoints.length ? allPoints.map((d) => d.y_pred) : [0];
  const xMin = Math.min(...xVals) - 2;
  const xMax = Math.max(...xVals) + 2;
  const yMin = Math.min(...yVals) - 2;
  const yMax = Math.max(...yVals) + 2;
  const dataMin = Math.min(xMin, yMin);
  const dataMax = Math.max(xMax, yMax);
  const range = dataMax - dataMin || 1;
  const scaleX = (v) => pad + ((v - dataMin) / range) * size;
  const scaleY = (v) => h - pad - ((v - dataMin) / range) * size;
  const ticks = niceTicks(dataMin, dataMax);

  return (
    <div className="ml-team-scatter-wrap">
      <div className="ml-team-scatter-plot">
        {hovered && (
          <div
            className="ml-scatter-tooltip"
            style={{ left: hovered.x + 12, top: hovered.y }}
          >
            <div><strong>{hovered.player}</strong></div>
            <div>Date: {hovered.date || "—"}</div>
            <div>Actual: {hovered.y_true != null ? Number(hovered.y_true).toFixed(2) : "—"}</div>
            <div>Prediction: {hovered.y_pred != null ? Number(hovered.y_pred).toFixed(2) : "—"}</div>
          </div>
        )}
        <svg className="ml-scatter" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
          <line
            x1={scaleX(dataMin)}
            y1={scaleY(dataMin)}
            x2={scaleX(dataMax)}
            y2={scaleY(dataMax)}
            stroke="rgba(0, 245, 255, 0.2)"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
          {ticks.map((t) => (
            <g key={`x-${t}`}>
              <line x1={scaleX(t)} y1={h - pad} x2={scaleX(t)} y2={h - pad + 4} stroke="rgba(0, 245, 255, 0.4)" strokeWidth="1" />
              <text x={scaleX(t)} y={h - pad + 14} textAnchor="middle" className="ml-scatter-tick-label">{Number(t) === t && t % 1 === 0 ? t : t.toFixed(1)}</text>
            </g>
          ))}
          {ticks.map((t) => (
            <g key={`y-${t}`}>
              <line x1={pad} y1={scaleY(t)} x2={pad - 4} y2={scaleY(t)} stroke="rgba(0, 245, 255, 0.4)" strokeWidth="1" />
              <text x={pad - 6} y={scaleY(t)} textAnchor="end" dominantBaseline="middle" className="ml-scatter-tick-label">{Number(t) === t && t % 1 === 0 ? t : t.toFixed(1)}</text>
            </g>
          ))}
          {playerPoints.map((pp, idx) => {
            if (hiddenPlayers.has(pp.player)) return null;
            const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
            return pp.points.map((d, i) => (
              <circle
                key={`${pp.player}-${i}`}
                cx={scaleX(d.y_true)}
                cy={scaleY(d.y_pred)}
                r={2.5}
                fill={color}
                fillOpacity={0.7}
                stroke={color}
                strokeWidth={0.5}
                onMouseEnter={(e) => {
                  const el = e.currentTarget.closest(".ml-team-scatter-plot");
                  const rect = el?.getBoundingClientRect();
                  if (rect) {
                    setHovered({
                      player: pp.player,
                      date: d.date,
                      y_true: d.y_true,
                      y_pred: d.y_pred,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }
                }}
                onMouseLeave={() => setHovered(null)}
              />
            ));
          })}
          <text x={w / 2} y={h - pad + 26} textAnchor="middle" className="ml-scatter-axis-label">
            Actual
          </text>
          <text x={14} y={h / 2} textAnchor="middle" transform={`rotate(-90, 14, ${h / 2})`} className="ml-scatter-axis-label">
            Prediction
          </text>
        </svg>
      </div>
      <div className="ml-team-scatter-legend">
        {playerPoints.map((pp, idx) => (
          <span
            key={pp.player}
            role="button"
            tabIndex={0}
            className={`ml-legend-item ${hiddenPlayers.has(pp.player) ? "ml-legend-item-hidden" : ""}`}
            onClick={() => togglePlayer(pp.player)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePlayer(pp.player); } }}
          >
            <span
              className="ml-legend-dot"
              style={{ background: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
            />
            {pp.player}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MLPredictorPage() {
  const [fantasyData, setFantasyData] = useState(null);
  const [valExportByModel, setValExportByModel] = useState({});
  const [predData, setPredData] = useState(null);
  const [championSeriesData, setChampionSeriesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedTeam, setSelectedTeam] = useState("");
  const [gamesToShow, setGamesToShow] = useState(10);
  const [activeTab, setActiveTab] = useState("fantasy");

  // Load fantasy (champion + model names + metrics), then val exports per model
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/data/ml_fantasy_export.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((f) => {
        if (cancelled) return f;
        setFantasyData(f);
        return f;
      })
      .then((f) => {
        if (cancelled || !f?.models?.length) return;
        const modelNames = f.models.map((m) => m.name);
        return Promise.all(
          modelNames.map((name) =>
            fetch(`/data/ml_player_series_val_export_${encodeURIComponent(name)}.json`)
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => ({ name, data }))
          )
        );
      })
      .then((pairs) => {
        if (cancelled || !pairs) return;
        const next = {};
        pairs.forEach(({ name, data }) => {
          next[name] = flattenValExport(data);
        });
        setValExportByModel(next);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Load pred export for "Predict for Team" — do not auto-select a team
  useEffect(() => {
    let cancelled = false;
    fetch("/data/ml_player_series_pred_export.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setPredData(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Load champion VAL export for User Confidence (same file pattern as model performance)
  useEffect(() => {
    if (!fantasyData?.champion) return;
    let cancelled = false;
    const champion = fantasyData.champion;
    fetch(`/data/ml_player_series_val_export_${encodeURIComponent(champion)}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setChampionSeriesData(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [fantasyData?.champion]);

  const teamsFromPred = predData
    ? [...new Set(Object.values(predData).map((v) => v.team).filter(Boolean))].sort()
    : [];

  useEffect(() => {
    if (!predData || selectedTeam === "") return;
    const teams = [...new Set(Object.values(predData).map((v) => v.team).filter(Boolean))].sort();
    if (teams.length && !teams.includes(selectedTeam)) setSelectedTeam("");
  }, [predData, selectedTeam]);

  const predPlayersForTeam = predData && selectedTeam
    ? Object.values(predData)
        .filter((v) => v.team === selectedTeam)
        .map((v) => ({
          player: v.player,
          y_pred: v.games?.[0]?.y_pred,
        }))
        .sort((a, b) => (b.y_pred ?? 0) - (a.y_pred ?? 0))
    : [];

  const championSeriesForTeam = championSeriesData && selectedTeam
    ? Object.keys(championSeriesData)
        .map((k) => ({ key: k, ...championSeriesData[k] }))
        .filter((s) => s.team === selectedTeam)
        .map((s) => {
          const games = (s.games || [])
            .slice(0, gamesToShow)
            .filter((g) => g.y_pred != null && g.y_true != null)
            .map((g) => ({
              y_pred: g.y_pred,
              y_true: g.y_true,
              date: g.date != null ? String(g.date).split(" ")[0] : "",
            }));
          return { player: s.player, points: games };
        })
        .filter((s) => s.points.length > 0)
    : [];

  if (loading) {
    return (
      <>
        <header className="page-header">
          <h1 className="page-title">ML Predictor</h1>
          <p className="page-subtitle">Player fantasy score prediction with machine learning.</p>
        </header>
        <main className="ml-predictor-main">
          <div className="ml-loading">Loading ML data…</div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <header className="page-header">
          <h1 className="page-title">ML Predictor</h1>
          <p className="page-subtitle">Player fantasy score prediction with machine learning.</p>
        </header>
        <main className="ml-predictor-main">
          <div className="ml-error">Failed to load data: {error}</div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">ML Predictor</h1>
        <p className="page-subtitle">Player fantasy score prediction with machine learning.</p>
      </header>
      <main className="ml-predictor-main">
        <div className="ml-page-tabs" role="tablist" aria-label="ML Predictor sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "fantasy"}
            aria-controls="panel-fantasy"
            id="tab-fantasy"
            className={`ml-page-tab ${activeTab === "fantasy" ? "active" : ""}`}
            onClick={() => setActiveTab("fantasy")}
          >
            Player: Fantasy Score
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "game-result"}
            aria-controls="panel-game-result"
            id="tab-game-result"
            className={`ml-page-tab ${activeTab === "game-result" ? "active" : ""}`}
            onClick={() => setActiveTab("game-result")}
          >
            Game: Result
          </button>
        </div>

        {activeTab === "game-result" ? (
          <div id="panel-game-result" role="tabpanel" aria-labelledby="tab-game-result" className="ml-coming-soon-panel">
            <div className="ml-coming-soon-icon" aria-hidden>◇</div>
            <h2 className="ml-coming-soon-title">Coming Soon</h2>
            <p className="ml-coming-soon-text">
              Game result prediction and analysis will be available here. We’re working on models to predict game outcomes and provide useful insights.
            </p>
            <p className="ml-coming-soon-hint">Switch to the <strong>Player: Fantasy Score</strong> tab above to explore current features.</p>
          </div>
        ) : (
          <>
        {/* Fantasy Score explainer — above Model Performance */}
        <div id="panel-fantasy" role="tabpanel" aria-labelledby="tab-fantasy" className="ml-fantasy-explainer">
          <h2 className="ml-section-title">About Fantasy Score</h2>
          <div className="ml-explainer-block">
            <h3 className="ml-explainer-subtitle">(1) What is Fantasy Score?</h3>
            <p className="ml-explainer-text">
              Fantasy score is a single number that summarizes a player’s box-score contribution in a game. It combines points, rebounds, assists, steals, blocks, and turnovers into one value so you can compare players and evaluate performance at a glance.
            </p>
          </div>
          <div className="ml-explainer-block">
            <h3 className="ml-explainer-subtitle">(2) Formula used in our modeling</h3>
            <p className="ml-explainer-text">
              We use a DraftKings-style formula (without double-double bonuses). Each stat is weighted and turnovers are penalized:
            </p>
            <p className="ml-explainer-formula">
              Fantasy Score = 1.0×PTS + 1.25×REB + 1.5×AST + 2.0×STL + 2.0×BLK − 0.5×TOV
            </p>
            <p className="ml-explainer-text">
              Our models predict the <strong>next-game</strong> fantasy score using pre-game features (e.g. rolling stats, recent form, opponent).
            </p>
          </div>
          <div className="ml-explainer-block">
            <h3 className="ml-explainer-subtitle">(3) What it can be used for</h3>
            <p className="ml-explainer-text">
              Predicted fantasy scores can support lineup decisions, player comparison, and spotting over- or under-performers. Use the model performance plots below to see how well predictions match actual outcomes, then try “Predict for Team” for next-game rankings and “User Confidence” to inspect per-player accuracy over recent games.
            </p>
          </div>
        </div>

        {/* Section 1: Model Performance — val export per model */}
        <section className="ml-section" id="model-performance">
          {!fantasyData ? (
            <div className="ml-no-data">Run the notebook export to generate model performance data.</div>
          ) : (
            <>
              <h2 className="ml-section-title">Model Performance</h2>
              <p className="ml-section-desc">Predicted vs actual fantasy scores (validation set). Champion model panel is highlighted by frame.</p>
              <div className="ml-scatter-grid">
                {fantasyData.models?.map((m) => {
                  const data = valExportByModel[m.name] || [];
                  return (
                    <ScatterPlot
                      key={m.name}
                      data={data}
                      title={m.name}
                      champion={m.name === fantasyData.champion}
                    />
                  );
                })}
              </div>
              <div className="ml-champion-badge">
                👑 Champion Model：<strong>{fantasyData.champion || "—"}</strong>
              </div>
              <div className="ml-metrics-table-wrap">
                <table className="ml-metrics-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Description</th>
                      <th>MAE</th>
                      <th>RMSE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fantasyData.models?.map((m) => (
                      <tr key={m.name} className={m.name === fantasyData.champion ? "champion" : ""}>
                        <td>{m.name}</td>
                        <td>{m.description || "—"}</td>
                        <td>{m.mae != null ? m.mae.toFixed(4) : "—"}</td>
                        <td>{m.rmse != null ? m.rmse.toFixed(4) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Section 2: Predict for Team — pred export, Prediction only */}
        <section className="ml-section" id="predict-for-team">
          {!predData || teamsFromPred.length === 0 ? (
            <div className="ml-no-data">Run the notebook export to generate predictions.</div>
          ) : (
            <>
              <h2 className="ml-section-title">Predict for Team</h2>
              <p className="ml-section-desc">Predict fantasy scores for the next game of the selected team by Champion model.</p>
              <div className="ml-team-select-wrap">
                <label htmlFor="team-select">Team</label>
                <select
                  id="team-select"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="ml-team-select"
                >
                  <option value="">-Select Team-</option>
                  {teamsFromPred.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ml-players-table-wrap">
                <table className="ml-players-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player</th>
                      <th>Prediction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predPlayersForTeam.map((p, i) => (
                      <tr key={p.player}>
                        <td>{i + 1}</td>
                        <td>{p.player}</td>
                        <td>{p.y_pred != null ? p.y_pred.toFixed(2) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Section 3: User Confidence — champion val export, X=y_true Y=y_pred, hover tooltip */}
        <section className="ml-section" id="user-confidence">
          <h2 className="ml-section-title">User Confidence</h2>
          {!fantasyData?.champion ? (
            <div className="ml-no-data">Champion model not available.</div>
          ) : (
            <>
              <p className="ml-section-desc">
                Predicted vs actual for the selected team using champion model（{fantasyData.champion}）. Last N games per player; each player is a different color. Click legend to show/hide. Hover a dot for details.
              </p>
              <div className="ml-user-confidence-controls">
                <div className="ml-games-select-wrap">
                  <label htmlFor="games-select">Last N games</label>
                  <select
                    id="games-select"
                    value={gamesToShow}
                    onChange={(e) => setGamesToShow(Number(e.target.value))}
                    className="ml-games-select"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {!selectedTeam ? (
                <div className="ml-no-data">Select your team first (use the team dropdown in Predict for Team above).</div>
              ) : !championSeriesData ? (
                <div className="ml-no-data">Loading champion model series…</div>
              ) : championSeriesForTeam.length === 0 ? (
                <div className="ml-no-data">No player series for this team.</div>
              ) : (
                <TeamScatterWithLegend playerPoints={championSeriesForTeam} />
              )}
            </>
          )}
        </section>
          </>
        )}
      </main>
    </>
  );
}
