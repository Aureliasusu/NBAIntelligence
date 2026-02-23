import { useState, useEffect } from "react";
import {
  fetchGameLogCsv,
  aggregateByPlayer,
  filterRowsByDateRange,
  getPlayerStatsWithPercentiles,
  STAT_LABELS,
  STAT_KEYS,
  LOWER_IS_BETTER_KEYS,
} from "../utils/csvStats";
import { getNbaHeadshotUrl, getNbaHeadshotFallbackUrl, getInitialsAvatarUrl } from "../utils/playerHeadshots";
import "./AnalyticsPage.css";

const TABS = [
  { id: "leaders", label: "Stats Leaders" },
  { id: "lookup", label: "Player Lookup" },
  { id: "compare", label: "Head to Head" },
];

/** Stats shown on the percentile radar chart. */
const RADAR_STATS = ["PTS", "TRB", "AST", "STL", "BLK"];
const RADAR_PAD = 52;

function PercentileRadarChart({ statsWithPct, size = 280 }) {
  const total = size + RADAR_PAD * 2;
  const cx = size / 2 + RADAR_PAD;
  const cy = size / 2 + RADAR_PAD;
  const R = (size / 2) - 44;
  const axes = RADAR_STATS.map((key, i) => {
    const angleDeg = 90 - (i * 360 / RADAR_STATS.length);
    const angleRad = (angleDeg * Math.PI) / 180;
    const label = key === "TRB" ? "Rebounds" : STAT_LABELS[key].label;
    return { key, label, angleRad };
  });
  const getPoint = (angleRad, radius) => [
    cx + radius * Math.cos(angleRad),
    cy - radius * Math.sin(angleRad),
  ];
  const gridLevels = [25, 50, 75, 100];
  const polygonPoints = axes
    .map(({ key, angleRad }) => {
      const pctVal = statsWithPct?.[key]?.percentile != null ? statsWithPct[key].percentile : 0;
      const r = (pctVal / 100) * R;
      return getPoint(angleRad, r);
    })
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
  const axisEndPoints = axes.map(({ angleRad }) => getPoint(angleRad, R));

  return (
    <div className="lookup-radar-wrap">
      <svg className="lookup-radar" viewBox={`0 0 ${total} ${total}`} width={total} height={total} aria-hidden>
        <g className="lookup-radar-grid">
          {gridLevels.map((level) => {
            const pts = axes.map(({ angleRad }) => getPoint(angleRad, (level / 100) * R));
            return (
              <polygon
                key={level}
                points={pts.map(([x, y]) => `${x},${y}`).join(" ")}
                fill="none"
                stroke="rgba(0, 245, 255, 0.15)"
                strokeWidth="1"
              />
            );
          })}
        </g>
        {axes.map(({ angleRad }, i) => (
          <line
            key={axes[i].key}
            x1={cx}
            y1={cy}
            x2={axisEndPoints[i][0]}
            y2={axisEndPoints[i][1]}
            stroke="rgba(0, 245, 255, 0.25)"
            strokeWidth="1"
          />
        ))}
        <polygon
          points={polygonPoints}
          fill="rgba(0, 245, 255, 0.2)"
          stroke="var(--color-neon-cyan)"
          strokeWidth="2"
        />
        {axes.map(({ key, label, angleRad }, i) => {
          const [x, y] = getPoint(angleRad, R + 20);
          return (
            <text
              key={key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="lookup-radar-label"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function CompareRadarChart({ statsWithPct1, statsWithPct2, name1, name2, size = 280 }) {
  const total = size + RADAR_PAD * 2;
  const cx = size / 2 + RADAR_PAD;
  const cy = size / 2 + RADAR_PAD;
  const R = (size / 2) - 44;
  const axes = RADAR_STATS.map((key, i) => {
    const angleDeg = 90 - (i * 360 / RADAR_STATS.length);
    const angleRad = (angleDeg * Math.PI) / 180;
    const label = key === "TRB" ? "Rebounds" : STAT_LABELS[key].label;
    return { key, label, angleRad };
  });
  const getPoint = (angleRad, radius) => [
    cx + radius * Math.cos(angleRad),
    cy - radius * Math.sin(angleRad),
  ];
  const toPolygonPoints = (statsWithPct) =>
    axes
      .map(({ key, angleRad }) => {
        const pctVal = statsWithPct?.[key]?.percentile != null ? statsWithPct[key].percentile : 0;
        const r = (pctVal / 100) * R;
        return getPoint(angleRad, r);
      })
      .map(([x, y]) => `${x},${y}`)
      .join(" ");
  const gridLevels = [25, 50, 75, 100];
  const axisEndPoints = axes.map(({ angleRad }) => getPoint(angleRad, R));
  const points1 = toPolygonPoints(statsWithPct1);
  const points2 = toPolygonPoints(statsWithPct2);

  return (
    <div className="lookup-radar-wrap compare-radar-wrap">
      <svg className="lookup-radar compare-radar" viewBox={`0 0 ${total} ${total}`} width={total} height={total} aria-hidden>
        <g className="lookup-radar-grid">
          {gridLevels.map((level) => {
            const pts = axes.map(({ angleRad }) => getPoint(angleRad, (level / 100) * R));
            return (
              <polygon
                key={level}
                points={pts.map(([x, y]) => `${x},${y}`).join(" ")}
                fill="none"
                stroke="rgba(0, 245, 255, 0.15)"
                strokeWidth="1"
              />
            );
          })}
        </g>
        {axes.map(({ angleRad }, i) => (
          <line
            key={axes[i].key}
            x1={cx}
            y1={cy}
            x2={axisEndPoints[i][0]}
            y2={axisEndPoints[i][1]}
            stroke="rgba(0, 245, 255, 0.25)"
            strokeWidth="1"
          />
        ))}
        <polygon
          points={points1}
          fill="rgba(0, 245, 255, 0.15)"
          stroke="var(--color-neon-cyan)"
          strokeWidth="2"
        />
        <polygon
          points={points2}
          fill="var(--color-accent-soft)"
          stroke="var(--color-accent)"
          strokeWidth="2"
        />
        {axes.map(({ key, label, angleRad }, i) => {
          const [x, y] = getPoint(angleRad, R + 20);
          return (
            <text
              key={key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="lookup-radar-label"
            >
              {label}
            </text>
          );
        })}
      </svg>
      <div className="compare-radar-legend">
        <span className="compare-radar-legend-item compare-legend-1"><span className="compare-legend-dot" />{name1}</span>
        <span className="compare-radar-legend-item compare-legend-2"><span className="compare-legend-dot compare-legend-dot-accent" />{name2}</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("leaders");
  const [selectedStat, setSelectedStat] = useState("PTS");
  const [rawRows, setRawRows] = useState(null);
  const [leaderData, setLeaderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [lookupSearch, setLookupSearch] = useState("");
  const [lookupTeam, setLookupTeam] = useState("");
  const [lookupPlayer, setLookupPlayer] = useState("");
  const [lookupDateStart, setLookupDateStart] = useState("");
  const [lookupDateEnd, setLookupDateEnd] = useState("");

  const [compareSearch1, setCompareSearch1] = useState("");
  const [compareTeam1, setCompareTeam1] = useState("");
  const [comparePlayer1, setComparePlayer1] = useState("");
  const [compareSearch2, setCompareSearch2] = useState("");
  const [compareTeam2, setCompareTeam2] = useState("");
  const [comparePlayer2, setComparePlayer2] = useState("");
  const [compareDateStart, setCompareDateStart] = useState("");
  const [compareDateEnd, setCompareDateEnd] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGameLogCsv()
      .then((rows) => {
        if (cancelled) return;
        setRawRows(rows);
        setLeaderData(aggregateByPlayer(rows));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const isPct = STAT_LABELS[selectedStat]?.pct ?? false;
  const getSortValue = (row) => {
    const raw = row[selectedStat] ?? 0;
    return isPct ? raw : (row.G > 0 ? (raw / row.G) : 0);
  };
  const top10 = (() => {
    if (!leaderData || !selectedStat) return [];
    const sorted = [...leaderData].sort((a, b) => getSortValue(b) - getSortValue(a));
    return sorted.slice(0, 10);
  })();

  const formatVal = (row) => {
    const raw = row[selectedStat];
    if (raw == null || Number.isNaN(raw)) return "—";
    const val = isPct ? raw : (row.G > 0 ? raw / row.G : 0);
    if (isPct) return (val * 100).toFixed(1) + "%";
    if (selectedStat === "MP") return Number(val).toFixed(1);
    return Number(val).toFixed(1);
  };

  const teamLogoCode = (tm) => {
    if (!tm) return "nba";
    const map = {
      CHO: "cha", BKN: "bkn", BRK: "bkn", GSW: "gs", NOP: "no", NYK: "ny",
      PHX: "phx", SAS: "sa", UTA: "utah",
    };
    return (map[tm] || tm).toLowerCase();
  };

  const renderRank = (i) => {
    const rank = i + 1;
    if (rank === 1) return <span className="medal medal-gold" title="1st">1</span>;
    if (rank === 2) return <span className="medal medal-silver" title="2nd">2</span>;
    if (rank === 3) return <span className="medal medal-bronze" title="3rd">3</span>;
    return <span className="player-rank-num">{rank}</span>;
  };

  const lookupFilteredRows = rawRows && (lookupDateStart || lookupDateEnd)
    ? filterRowsByDateRange(rawRows, lookupDateStart || null, lookupDateEnd || null)
    : rawRows;
  const lookupAggregated = lookupFilteredRows ? aggregateByPlayer(lookupFilteredRows) : [];
  const lookupTeams = [...new Set(lookupAggregated.map((p) => p.Tm).filter(Boolean))].sort();
  const lookupPlayersByTeam = lookupTeam
    ? lookupAggregated.filter((p) => p.Tm === lookupTeam)
    : lookupAggregated;
  const lookupPlayersFiltered = lookupSearch.trim()
    ? lookupPlayersByTeam.filter((p) =>
        p.Player.toLowerCase().includes(lookupSearch.trim().toLowerCase())
      )
    : lookupPlayersByTeam;
  const lookupSingleMatchName =
    lookupSearch.trim() && lookupPlayersFiltered.length === 1 ? lookupPlayersFiltered[0].Player : null;
  useEffect(() => {
    if (lookupSingleMatchName) setLookupPlayer(lookupSingleMatchName);
  }, [lookupSingleMatchName]);
  const lookupSelectedRow = lookupAggregated.find((p) => p.Player === lookupPlayer) || null;
  const lookupStatsWithPct =
    lookupSelectedRow && lookupAggregated.length > 0
      ? getPlayerStatsWithPercentiles(lookupSelectedRow, lookupAggregated)
      : null;

  const dateMin = rawRows?.length > 0 ? rawRows.reduce((a, r) => (r.Data < a ? r.Data : a), rawRows[0].Data) : "";
  const dateMax = rawRows?.length > 0 ? rawRows.reduce((a, r) => (r.Data > a ? r.Data : a), rawRows[0].Data) : "";

  const formatLookupVal = (key, val) => {
    if (val == null || Number.isNaN(val)) return "—";
    const isPct = STAT_LABELS[key]?.pct ?? false;
    if (isPct) return (val * 100).toFixed(1) + "%";
    if (key === "MP") return Number(val).toFixed(1);
    return Number(val).toFixed(1);
  };

  const compareFilteredRows = rawRows && (compareDateStart || compareDateEnd)
    ? filterRowsByDateRange(rawRows, compareDateStart || null, compareDateEnd || null)
    : rawRows;
  const compareAggregated = compareFilteredRows ? aggregateByPlayer(compareFilteredRows) : [];
  const compareTeams = [...new Set(compareAggregated.map((p) => p.Tm).filter(Boolean))].sort();
  const comparePlayersByTeam1 = compareTeam1 ? compareAggregated.filter((p) => p.Tm === compareTeam1) : compareAggregated;
  const comparePlayersFiltered1 = compareSearch1.trim()
    ? comparePlayersByTeam1.filter((p) => p.Player.toLowerCase().includes(compareSearch1.trim().toLowerCase()))
    : comparePlayersByTeam1;
  const comparePlayersByTeam2 = compareTeam2 ? compareAggregated.filter((p) => p.Tm === compareTeam2) : compareAggregated;
  const comparePlayersFiltered2 = compareSearch2.trim()
    ? comparePlayersByTeam2.filter((p) => p.Player.toLowerCase().includes(compareSearch2.trim().toLowerCase()))
    : comparePlayersByTeam2;
  const compareSelectedRow1 = compareAggregated.find((p) => p.Player === comparePlayer1) || null;
  const compareSelectedRow2 = compareAggregated.find((p) => p.Player === comparePlayer2) || null;
  const compareStatsWithPct1 = compareSelectedRow1 && compareAggregated.length > 0
    ? getPlayerStatsWithPercentiles(compareSelectedRow1, compareAggregated)
    : null;
  const compareStatsWithPct2 = compareSelectedRow2 && compareAggregated.length > 0
    ? getPlayerStatsWithPercentiles(compareSelectedRow2, compareAggregated)
    : null;
  const compareHasBoth = comparePlayer1 && comparePlayer2 && compareStatsWithPct1 && compareStatsWithPct2;
  const compareBetterSide = (key, val1, val2) => {
    const p1 = compareStatsWithPct1?.[key]?.percentile;
    const p2 = compareStatsWithPct2?.[key]?.percentile;
    if (p1 == null && p2 == null) return null;
    if (p1 == null) return "right";
    if (p2 == null) return "left";
    if (p1 > p2) return "left";
    if (p2 > p1) return "right";
    // Percentiles tied: break tie by actual stat value (higher better for most, lower better for TOV/PF).
    const lowerBetter = LOWER_IS_BETTER_KEYS.has(key);
    const v1 = val1 != null && !Number.isNaN(val1) ? Number(val1) : null;
    const v2 = val2 != null && !Number.isNaN(val2) ? Number(val2) : null;
    if (v1 == null && v2 == null) return "tie";
    if (v1 == null) return "right";
    if (v2 == null) return "left";
    if (lowerBetter) {
      if (v1 < v2) return "left";
      if (v2 < v1) return "right";
    } else {
      if (v1 > v2) return "left";
      if (v2 > v1) return "right";
    }
    return "tie";
  };

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Performance metrics, trends, and data-driven insights</p>
      </header>
      <main className="analytics-main">
        <div className="analytics-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={"tab-btn" + (activeTab === tab.id ? " active" : "")}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "leaders" && (
          <div className="tab-panel leaders-panel">
            <div className="leaders-controls">
              <label htmlFor="stat-select" className="stat-select-label">Category</label>
              <select
                id="stat-select"
                className="stat-select"
                value={selectedStat}
                onChange={(e) => setSelectedStat(e.target.value)}
              >
                {STAT_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {STAT_LABELS[key].label}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="analytics-error">{error}</p>}
            {loading && <p className="analytics-loading">Loading stats…</p>}
            {!loading && !error && leaderData && (
              <div className="leaders-table-wrap">
                <div className="leaders-table" role="table" aria-label="Stats leaders">
                  <div className="leaders-table-header" role="row">
                    <div className="leaders-col leaders-col-player" role="columnheader">Player</div>
                    <div className="leaders-col leaders-col-team" role="columnheader">Team</div>
                    <div className="leaders-col leaders-col-stat" role="columnheader">{STAT_LABELS[selectedStat].label}</div>
                  </div>
                  {top10.map((row, i) => (
                    <div key={`${row.Player}-${i}`} className="leaders-table-row" role="row">
                      <div className="leaders-col leaders-col-player" role="cell">
                        <span className="player-rank">{renderRank(i)}</span>
                        <img
                          src={getNbaHeadshotUrl(row.Player) || getInitialsAvatarUrl(row.Player)}
                          alt=""
                          className="player-headshot"
                          onError={(e) => {
                            const fallback = getNbaHeadshotFallbackUrl(row.Player);
                            if (fallback && e.target.src !== fallback) {
                              e.target.onerror = () => {
                                e.target.onerror = null;
                                e.target.src = getInitialsAvatarUrl(row.Player);
                              };
                              e.target.src = fallback;
                            } else {
                              e.target.onerror = null;
                              e.target.src = getInitialsAvatarUrl(row.Player);
                            }
                          }}
                        />
                        <span className="player-name">{row.Player}</span>
                      </div>
                      <div className="leaders-col leaders-col-team" role="cell">
                        <img
                          src={`https://a.espncdn.com/i/teamlogos/nba/500/${teamLogoCode(row.Tm)}.png`}
                          alt=""
                          className="team-logo"
                        />
                        <span className="team-code">{row.Tm || "—"}</span>
                      </div>
                      <div className="leaders-col leaders-col-stat" role="cell">
                        <span className="stat-value">{formatVal(row)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "lookup" && (
          <div className="tab-panel lookup-panel">
            <div className="lookup-controls">
              <div className="lookup-search-wrap">
                <label htmlFor="lookup-search" className="stat-select-label">Search by name</label>
                <input
                  id="lookup-search"
                  type="text"
                  className="lookup-search"
                  placeholder="Type player name…"
                  value={lookupSearch}
                  onChange={(e) => setLookupSearch(e.target.value)}
                />
              </div>
              <div className="lookup-select-wrap">
                <label htmlFor="lookup-team" className="stat-select-label">Team</label>
                <select
                  id="lookup-team"
                  className="stat-select lookup-select"
                  value={lookupTeam}
                  onChange={(e) => {
                    setLookupTeam(e.target.value);
                    setLookupPlayer("");
                  }}
                >
                  <option value="">All teams</option>
                  {lookupTeams.map((tm) => (
                    <option key={tm} value={tm}>{tm}</option>
                  ))}
                </select>
              </div>
              <div className="lookup-select-wrap">
                <label htmlFor="lookup-player" className="stat-select-label">Player</label>
                <select
                  id="lookup-player"
                  className="stat-select lookup-select"
                  value={lookupPlayer}
                  onChange={(e) => setLookupPlayer(e.target.value)}
                >
                  <option value="">Select player</option>
                  {lookupPlayersFiltered.map((p) => (
                    <option key={p.Player} value={p.Player}>{p.Player} ({p.Tm})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="lookup-date-range">
              <span className="stat-select-label">Time range</span>
              <input
                type="date"
                className="lookup-date"
                value={lookupDateStart}
                min={dateMin}
                max={dateMax}
                onChange={(e) => setLookupDateStart(e.target.value)}
                aria-label="Start date"
              />
              <span className="lookup-date-sep">to</span>
              <input
                type="date"
                className="lookup-date"
                value={lookupDateEnd}
                min={dateMin}
                max={dateMax}
                onChange={(e) => setLookupDateEnd(e.target.value)}
                aria-label="End date"
              />
            </div>
            {error && <p className="analytics-error">{error}</p>}
            {loading && <p className="analytics-loading">Loading stats…</p>}
            {!loading && !error && rawRows && !lookupPlayer && (
              <p className="lookup-hint">Select or search for a player to view their stats and league percentiles.</p>
            )}
            {!loading && !error && lookupPlayer && lookupStatsWithPct && (
              <>
                <PercentileRadarChart statsWithPct={lookupStatsWithPct} size={280} />
                <div className="lookup-stats-wrap">
                <table className="lookup-stats-table">
                  <thead>
                    <tr>
                      <th>Stat</th>
                      <th>Value</th>
                      <th>League percentile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STAT_KEYS.map((key) => (
                      <tr key={key}>
                        <td>{STAT_LABELS[key].label}</td>
                        <td className="lookup-stat-value">
                          {formatLookupVal(key, lookupStatsWithPct[key].value)}
                        </td>
                        <td className="lookup-percentile">
                          {lookupStatsWithPct[key].percentile != null
                            ? `${lookupStatsWithPct[key].percentile}%`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}

        {activeTab === "compare" && (
          <div className="tab-panel lookup-panel compare-panel">
            <div className="compare-controls-row">
              <div className="compare-player-block">
                <span className="compare-block-label">Player 1</span>
                <div className="lookup-controls">
                  <div className="lookup-search-wrap">
                    <label htmlFor="compare-search1" className="stat-select-label">Search</label>
                    <input
                      id="compare-search1"
                      type="text"
                      className="lookup-search"
                      placeholder="Name…"
                      value={compareSearch1}
                      onChange={(e) => setCompareSearch1(e.target.value)}
                    />
                  </div>
                  <div className="lookup-select-wrap">
                    <label htmlFor="compare-team1" className="stat-select-label">Team</label>
                    <select
                      id="compare-team1"
                      className="stat-select lookup-select"
                      value={compareTeam1}
                      onChange={(e) => { setCompareTeam1(e.target.value); setComparePlayer1(""); }}
                    >
                      <option value="">All teams</option>
                      {compareTeams.map((tm) => (
                        <option key={tm} value={tm}>{tm}</option>
                      ))}
                    </select>
                  </div>
                  <div className="lookup-select-wrap">
                    <label htmlFor="compare-player1" className="stat-select-label">Player</label>
                    <select
                      id="compare-player1"
                      className="stat-select lookup-select"
                      value={comparePlayer1}
                      onChange={(e) => setComparePlayer1(e.target.value)}
                    >
                      <option value="">Select player</option>
                      {comparePlayersFiltered1.map((p) => (
                        <option key={p.Player} value={p.Player}>{p.Player} ({p.Tm})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="compare-vs">VS</div>
              <div className="compare-player-block">
                <span className="compare-block-label">Player 2</span>
                <div className="lookup-controls">
                  <div className="lookup-search-wrap">
                    <label htmlFor="compare-search2" className="stat-select-label">Search</label>
                    <input
                      id="compare-search2"
                      type="text"
                      className="lookup-search"
                      placeholder="Name…"
                      value={compareSearch2}
                      onChange={(e) => setCompareSearch2(e.target.value)}
                    />
                  </div>
                  <div className="lookup-select-wrap">
                    <label htmlFor="compare-team2" className="stat-select-label">Team</label>
                    <select
                      id="compare-team2"
                      className="stat-select lookup-select"
                      value={compareTeam2}
                      onChange={(e) => { setCompareTeam2(e.target.value); setComparePlayer2(""); }}
                    >
                      <option value="">All teams</option>
                      {compareTeams.map((tm) => (
                        <option key={tm} value={tm}>{tm}</option>
                      ))}
                    </select>
                  </div>
                  <div className="lookup-select-wrap">
                    <label htmlFor="compare-player2" className="stat-select-label">Player</label>
                    <select
                      id="compare-player2"
                      className="stat-select lookup-select"
                      value={comparePlayer2}
                      onChange={(e) => setComparePlayer2(e.target.value)}
                    >
                      <option value="">Select player</option>
                      {comparePlayersFiltered2.map((p) => (
                        <option key={p.Player} value={p.Player}>{p.Player} ({p.Tm})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="lookup-date-range">
              <span className="stat-select-label">Time range</span>
              <input
                type="date"
                className="lookup-date"
                value={compareDateStart}
                min={dateMin}
                max={dateMax}
                onChange={(e) => setCompareDateStart(e.target.value)}
                aria-label="Start date"
              />
              <span className="lookup-date-sep">to</span>
              <input
                type="date"
                className="lookup-date"
                value={compareDateEnd}
                min={dateMin}
                max={dateMax}
                onChange={(e) => setCompareDateEnd(e.target.value)}
                aria-label="End date"
              />
            </div>
            {error && <p className="analytics-error">{error}</p>}
            {loading && <p className="analytics-loading">Loading stats…</p>}
            {!loading && !error && rawRows && !compareHasBoth && (
              <p className="lookup-hint">Select two players to compare stats and percentiles head to head.</p>
            )}
            {!loading && !error && compareHasBoth && (
              <>
                <CompareRadarChart
                  statsWithPct1={compareStatsWithPct1}
                  statsWithPct2={compareStatsWithPct2}
                  name1={comparePlayer1}
                  name2={comparePlayer2}
                  size={280}
                />
                <div className="lookup-stats-wrap compare-table-wrap">
                  <table className="lookup-stats-table compare-table">
                    <thead>
                      <tr>
                        <th className="compare-col-left">{comparePlayer1}</th>
                        <th className="compare-col-center">Stat</th>
                        <th className="compare-col-right">{comparePlayer2}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {STAT_KEYS.map((key) => {
                        const val1 = compareStatsWithPct1[key]?.value;
                        const val2 = compareStatsWithPct2[key]?.value;
                        const better = compareBetterSide(key, val1, val2);
                        const pct1 = compareStatsWithPct1[key]?.percentile;
                        const pct2 = compareStatsWithPct2[key]?.percentile;
                        const leftClass = "compare-col-left compare-value " + (better === "left" ? "compare-better" : better === "tie" ? "compare-tie" : "");
                        const rightClass = "compare-col-right compare-value " + (better === "right" ? "compare-better" : better === "tie" ? "compare-tie" : "");
                        return (
                          <tr key={key}>
                            <td className={leftClass}>
                              {formatLookupVal(key, val1)}
                              {pct1 != null ? ` (${pct1}%)` : ""}
                            </td>
                            <td className="compare-col-center compare-stat-name">{STAT_LABELS[key].label}</td>
                            <td className={rightClass}>
                              {formatLookupVal(key, val2)}
                              {pct2 != null ? ` (${pct2}%)` : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </>
  );
}
