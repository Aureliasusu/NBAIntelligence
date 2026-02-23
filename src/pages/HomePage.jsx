import { Link } from "react-router-dom";
import HomeBanner from "../components/HomeBanner";
import "./HomePage.css";

export default function HomePage() {
  return (
    <>
      <header className="home-header">
        <HomeBanner variant="header" />
        <div className="home-header-content">
          <img src="/logo.png" alt="NBA Intelligence" className="home-logo" />
          <p className="home-tagline">AI for NBA · Data meets the court</p>
          <div className="home-header-accent" aria-hidden="true" />
        </div>
      </header>
      <main className="main home-main">
        <section className="hero">
          <HomeBanner variant="hero" />
          <h1 className="hero-title">
            AI-powered insights for the game you love
          </h1>
          <p className="hero-subtitle">
            NBA Intelligence brings advanced analytics and intelligent tools to
            players, coaches, and fans. Data meets the court.
          </p>
        </section>
        <section className="features">
          <Link to="/analytics" className="feature-card">
            <span className="feature-icon">📊</span>
            <h3>Analytics</h3>
            <p>Deep dive into performance metrics and trends.</p>
          </Link>
          <Link to="/ml-predictor" className="feature-card">
            <span className="feature-icon">🎯</span>
            <h3>ML Predictor</h3>
            <p>Player fantasy score prediction and model performance with machine learning.</p>
          </Link>
          <Link to="/ai-assistant" className="feature-card">
            <span className="feature-icon">🤖</span>
            <h3>AI Assistant</h3>
            <p>Ask questions and get instant, data-backed answers.</p>
          </Link>
        </section>
      </main>
      <footer className="footer">
        <p>NBA Intelligence · AI for NBA</p>
      </footer>
    </>
  );
}
