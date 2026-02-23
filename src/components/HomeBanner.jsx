import "./HomeBanner.css";

const COURT_SVG = (
  <svg className="banner-icon banner-icon-court" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.2" fill="none" />
    <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M4 24h40M24 4v40" stroke="currentColor" strokeWidth="0.8" />
    <path d="M14 14 L34 34 M34 14 L14 34" stroke="currentColor" strokeWidth="0.6" />
  </svg>
);

const DASHBOARD_SVG = (
  <svg className="banner-icon banner-icon-dashboard" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="8" y="28" width="6" height="12" rx="1" fill="currentColor" />
    <rect x="18" y="20" width="6" height="20" rx="1" fill="currentColor" />
    <rect x="28" y="14" width="6" height="26" rx="1" fill="currentColor" />
    <rect x="38" y="24" width="6" height="16" rx="1" fill="currentColor" />
    <path d="M10 26 L20 22 L30 16 L40 20" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </svg>
);

const STATS_SHEET_SVG = (
  <svg className="banner-icon banner-icon-stats" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="6" y="6" width="36" height="36" rx="2" stroke="currentColor" strokeWidth="1" fill="none" />
    <line x1="10" y1="14" x2="38" y2="14" stroke="currentColor" strokeWidth="0.8" />
    <line x1="10" y1="22" x2="32" y2="22" stroke="currentColor" strokeWidth="0.6" />
    <line x1="10" y1="30" x2="28" y2="30" stroke="currentColor" strokeWidth="0.6" />
    <line x1="10" y1="38" x2="35" y2="38" stroke="currentColor" strokeWidth="0.6" />
    <rect x="10" y="16" width="8" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
  </svg>
);

const ROSTER_SVG = (
  <svg className="banner-icon banner-icon-roster" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="12" cy="10" r="4" stroke="currentColor" strokeWidth="1" fill="none" />
    <line x1="22" y1="10" x2="40" y2="10" stroke="currentColor" strokeWidth="0.8" />
    <line x1="22" y1="20" x2="38" y2="20" stroke="currentColor" strokeWidth="0.6" />
    <line x1="22" y1="30" x2="36" y2="30" stroke="currentColor" strokeWidth="0.6" />
    <line x1="22" y1="40" x2="40" y2="40" stroke="currentColor" strokeWidth="0.6" />
    <circle cx="12" cy="30" r="3" stroke="currentColor" strokeWidth="0.8" fill="none" />
  </svg>
);

const TACTICAL_SVG = (
  <svg className="banner-icon banner-icon-tactical" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="4" y="4" width="40" height="40" rx="2" stroke="currentColor" strokeWidth="1" fill="none" />
    <line x1="24" y1="4" x2="24" y2="44" stroke="currentColor" strokeWidth="0.6" />
    <line x1="4" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="0.6" />
    <line x1="4" y1="14" x2="44" y2="14" stroke="currentColor" strokeWidth="0.4" />
    <line x1="4" y1="34" x2="44" y2="34" stroke="currentColor" strokeWidth="0.4" />
    <line x1="14" y1="4" x2="14" y2="44" stroke="currentColor" strokeWidth="0.4" />
    <line x1="34" y1="4" x2="34" y2="44" stroke="currentColor" strokeWidth="0.4" />
    <circle cx="16" cy="16" r="2.5" fill="currentColor" opacity="0.7" />
    <circle cx="32" cy="32" r="2.5" fill="currentColor" opacity="0.7" />
    <circle cx="32" cy="16" r="2" fill="currentColor" opacity="0.5" />
    <circle cx="16" cy="32" r="2" fill="currentColor" opacity="0.5" />
  </svg>
);

const BASKETBALL_SVG = (
  <svg className="banner-icon banner-icon-ball" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.2" fill="none" />
    <path d="M24 4 A20 20 0 0 1 24 44 A20 20 0 0 1 24 4" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M4 24 H44" stroke="currentColor" strokeWidth="1" />
    <path d="M14 10 Q24 24 14 38" stroke="currentColor" strokeWidth="0.8" />
    <path d="M34 10 Q24 24 34 38" stroke="currentColor" strokeWidth="0.8" />
  </svg>
);

const ICONS = [
  { key: "court", el: COURT_SVG },
  { key: "dashboard", el: DASHBOARD_SVG },
  { key: "stats", el: STATS_SHEET_SVG },
  { key: "roster", el: ROSTER_SVG },
  { key: "tactical", el: TACTICAL_SVG },
  { key: "ball", el: BASKETBALL_SVG },
];

const FLOAT_OFFSETS = [-12, 8, -6, 10, -10, 6];
const FLOAT_DELAYS = [0, 0.8, 1.6, 2.2, 0.4, 1.2];
const FLOAT_DURATIONS = [2.8, 3.2, 2.6, 3.4, 3, 2.4];

export default function HomeBanner({ variant = "header" }) {
  const icons =
    variant === "hero"
      ? ICONS
      : [...ICONS, ...ICONS, ...ICONS, ...ICONS];
  return (
    <div className={`home-banner home-banner--${variant}`} aria-hidden="true">
      <div className="home-banner-inner">
        {icons.map((item, i) => {
          const idx = i % 6;
          const style = {
            "--float-offset": `${FLOAT_OFFSETS[idx]}px`,
            "--float-delay": `${FLOAT_DELAYS[idx]}s`,
            "--float-duration": `${FLOAT_DURATIONS[idx]}s`,
            "--float-delta": i % 2 === 0 ? "10px" : "-10px",
          };
          return (
            <span
              key={`${item.key}-${i}`}
              className="home-banner-icon-wrap"
              style={style}
            >
              {item.el}
            </span>
          );
        })}
      </div>
      {variant !== "hero" && (
        <>
          <div className="home-banner-mask home-banner-mask--start" />
          <div className="home-banner-mask home-banner-mask--end" />
        </>
      )}
    </div>
  );
}
