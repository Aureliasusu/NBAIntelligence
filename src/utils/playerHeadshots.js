/**
 * Map player names to NBA CDN person IDs for headshots.
 * Legacy overrides (IDs that worked before) take precedence; then 2024-25 roster with name normalization.
 * Headshot URL: https://cdn.nba.com/headshots/nba/latest/260x190/{id}.png
 */
import nbaPlayerIds from "./nbaPlayerIds.json";

const CDN_PRIMARY = "https://cdn.nba.com/headshots/nba/latest/260x190";
const CDN_FALLBACK = "https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190";

/**
 * Override roster ID when cdn.nba.com uses a different ID (restores previously working photos).
 */
const LEGACY_OVERRIDES = {
  "Chet Holmgren": 1631094,
  "Jalen Williams": 1631109,
  "Cason Wallace": 1641705,
  "Victor Wembanyama": 1627789,
  "Jaren Jackson Jr.": 1628991,
  "Devin Booker": 1626162,
  "De'Aaron Fox": 1628367,
  "Scoot Henderson": 1631093,
  "Paolo Banchero": 1631092,
  "Wendell Carter Jr.": 1628976,
  "Scottie Barnes": 1630565,
  "OG Anunoby": 203506,
  "Jose Alvarado": 1630583,
};

/** Normalize name for fuzzy match: strip diacritics, collapse spaces, lowercase for comparison. */
function normalizeName(s) {
  if (!s || typeof s !== "string") return "";
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

/** Find NBA ID: legacy override first (exact), then roster exact, then roster normalized. */
function findNbaId(playerName) {
  const trimmed = playerName?.trim();
  if (!trimmed) return null;
  if (LEGACY_OVERRIDES[trimmed]) return LEGACY_OVERRIDES[trimmed];
  if (nbaPlayerIds[trimmed]) return nbaPlayerIds[trimmed];
  const norm = normalizeName(trimmed);
  if (!norm) return null;
  for (const [name, id] of Object.entries(nbaPlayerIds)) {
    if (normalizeName(name) === norm) return id;
  }
  const legacyNorm = Object.keys(LEGACY_OVERRIDES).find((k) => normalizeName(k) === norm);
  if (legacyNorm) return LEGACY_OVERRIDES[legacyNorm];
  return null;
}

/**
 * Primary headshot URL (cdn.nba.com). Use this as img src first.
 */
export function getNbaHeadshotUrl(playerName) {
  const id = findNbaId(playerName);
  if (!id) return null;
  return `${CDN_PRIMARY}/${id}.png`;
}

/**
 * Fallback headshot URL (ak-static). Use when primary fails (onError) so roster IDs that only work here still show.
 */
export function getNbaHeadshotFallbackUrl(playerName) {
  const id = findNbaId(playerName);
  if (!id) return null;
  return `${CDN_FALLBACK}/${id}.png`;
}

/**
 * Returns URL for initials fallback (ui-avatars).
 */
export function getInitialsAvatarUrl(playerName) {
  if (!playerName) return "https://ui-avatars.com/api/?name=Player&size=64&background=1a2029&color=8b949e";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(playerName)}&size=64&background=1a2029&color=8b949e`;
}
