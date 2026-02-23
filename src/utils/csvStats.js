/**
 * Fetch CSV from public/data and return parsed rows (array of objects).
 */
export async function fetchGameLogCsv() {
  const res = await fetch("/data/database_24_25.csv");
  if (!res.ok) throw new Error("Failed to load stats data");
  const text = await res.text();
  return parseCsv(text);
}

function parseCsvLine(line) {
  const row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === "," && !inQuotes) {
      row.push(field.trim());
      field = "";
    } else field += c;
  }
  row.push(field.trim());
  return row;
}

function parseCsv(text) {
  const lines = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') inQuotes = !inQuotes;
    else if ((c === "\n" || c === "\r") && !inQuotes) {
      if (current.trim()) lines.push(parseCsvLine(current));
      current = "";
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else current += c;
  }
  if (current.trim()) lines.push(parseCsvLine(current));
  if (lines.length < 2) return [];
  const headers = lines[0];
  return lines.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] !== undefined ? String(row[i]).trim() : "";
    });
    return obj;
  });
}

function toNum(val) {
  if (val === "" || val == null) return NaN;
  const n = Number(String(val).replace(/^0+/, "") || 0);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Aggregate game logs by player: sums for counting stats, games played (G),
 * primary team (Tm = most games), and computed FG%/3P%/FT%.
 */
export function aggregateByPlayer(rows) {
  const byPlayer = new Map();
  for (const row of rows) {
    const player = row.Player;
    if (!player) continue;
    if (!byPlayer.has(player)) {
      byPlayer.set(player, {
        Player: player,
        G: 0,
        Tm: "",
        _tmCount: {},
        MP: 0, FG: 0, FGA: 0, FT: 0, FTA: 0, "3P": 0, "3PA": 0,
        ORB: 0, DRB: 0, TRB: 0, AST: 0, STL: 0, BLK: 0, TOV: 0, PF: 0, PTS: 0, GmSc: 0,
      });
    }
    const p = byPlayer.get(player);
    p.G += 1;
    const tm = (row.Tm || "").trim();
    if (tm) {
      p._tmCount[tm] = (p._tmCount[tm] || 0) + 1;
    }
    p.MP += toNum(row.MP) || 0;
    p.FG += toNum(row.FG) || 0;
    p.FGA += toNum(row.FGA) || 0;
    p.FT += toNum(row.FT) || 0;
    p.FTA += toNum(row.FTA) || 0;
    p["3P"] += toNum(row["3P"]) || 0;
    p["3PA"] += toNum(row["3PA"]) || 0;
    p.ORB += toNum(row.ORB) || 0;
    p.DRB += toNum(row.DRB) || 0;
    p.TRB += toNum(row.TRB) || 0;
    p.AST += toNum(row.AST) || 0;
    p.STL += toNum(row.STL) || 0;
    p.BLK += toNum(row.BLK) || 0;
    p.TOV += toNum(row.TOV) || 0;
    p.PF += toNum(row.PF) || 0;
    p.PTS += toNum(row.PTS) || 0;
    p.GmSc += toNum(row.GmSc) || 0;
  }
  const list = Array.from(byPlayer.values());
  list.forEach((p) => {
    p["FG%"] = p.FGA > 0 ? p.FG / p.FGA : 0;
    p["3P%"] = p["3PA"] > 0 ? p["3P"] / p["3PA"] : 0;
    p["FT%"] = p.FTA > 0 ? p.FT / p.FTA : 0;
    let maxGames = 0;
    for (const [team, count] of Object.entries(p._tmCount)) {
      if (count > maxGames) {
        maxGames = count;
        p.Tm = team;
      }
    }
    delete p._tmCount;
  });
  return list;
}

/** Stat key -> display label and format (for percentages). */
export const STAT_LABELS = {
  MP: { label: "Minutes played", pct: false },
  FG: { label: "Field goals made", pct: false },
  FGA: { label: "Field goal attempts", pct: false },
  "FG%": { label: "Field goal %", pct: true },
  "3P": { label: "3-pointers made", pct: false },
  "3PA": { label: "3-point attempts", pct: false },
  "3P%": { label: "3-point %", pct: true },
  FT: { label: "Free throws made", pct: false },
  FTA: { label: "Free throw attempts", pct: false },
  "FT%": { label: "Free throw %", pct: true },
  ORB: { label: "Offensive rebounds", pct: false },
  DRB: { label: "Defensive rebounds", pct: false },
  TRB: { label: "Total rebounds", pct: false },
  AST: { label: "Assists", pct: false },
  STL: { label: "Steals", pct: false },
  BLK: { label: "Blocks", pct: false },
  TOV: { label: "Turnovers", pct: false },
  PF: { label: "Personal fouls", pct: false },
  PTS: { label: "Points", pct: false },
  GmSc: { label: "Game Score", pct: false },
};

export const STAT_KEYS = Object.keys(STAT_LABELS);

/** Filter rows by date range (inclusive). Row date field is "Data" (YYYY-MM-DD). */
export function filterRowsByDateRange(rows, startDate, endDate) {
  if (!startDate && !endDate) return rows;
  return rows.filter((row) => {
    const d = row.Data || "";
    if (!d) return false;
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });
}

/** Stats where lower raw value is better (for percentile: higher percentile = better). */
export const LOWER_IS_BETTER_KEYS = new Set(["TOV", "PF"]);

/**
 * For each stat key, compute per-game (or rate for %) and percentile rank vs all players.
 * Returns { stats: { [statKey]: { value, percentile } }, playerRow }.
 */
export function getPlayerStatsWithPercentiles(playerRow, allPlayers, statKeys = STAT_KEYS) {
  const isPct = (k) => STAT_LABELS[k]?.pct ?? false;
  const getValue = (row, k) => {
    const raw = row[k];
    if (raw == null || Number.isNaN(raw)) return isPct(k) ? 0 : 0;
    return isPct(k) ? raw : (row.G > 0 ? raw / row.G : 0);
  };
  const result = {};
  for (const key of statKeys) {
    const val = getValue(playerRow, key);
    const sorted = [...allPlayers]
      .map((r) => ({ row: r, v: getValue(r, key) }))
      .filter((x) => x.row.G > 0)
      .sort((a, b) => (LOWER_IS_BETTER_KEYS.has(key) ? a.v - b.v : b.v - a.v));
    const idx = sorted.findIndex((x) => x.row.Player === playerRow.Player);
    const N = sorted.length;
    const percentile = N === 0 ? null : idx < 0 ? null : Math.round(((N - idx) / N) * 100);
    result[key] = { value: val, percentile: percentile === null ? null : Math.min(100, Math.max(0, percentile)) };
  }
  return result;
}
