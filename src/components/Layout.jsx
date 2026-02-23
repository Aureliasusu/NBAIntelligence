import { Outlet, NavLink, useLocation } from "react-router-dom";
import "./Layout.css";

export default function Layout() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <div className={"layout" + (isHome ? " layout-no-sidebar" : "")}>
      {!isHome && (
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/logo.png" alt="NBA Intelligence" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")} end>
            <span className="nav-icon">◉</span>
            Home
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
            <span className="nav-icon">📊</span>
            Analytics
          </NavLink>
          <NavLink to="/ml-predictor" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
            <span className="nav-icon">🎯</span>
            ML Predictor
          </NavLink>
          <NavLink to="/ai-assistant" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
            <span className="nav-icon">🤖</span>
            AI Assistant
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <span className="tagline">AI for NBA</span>
        </div>
      </aside>
      )}
      <div className="layout-main">
        <Outlet />
      </div>
    </div>
  );
}
