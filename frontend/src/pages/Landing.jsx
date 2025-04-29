// Landing.js
import React from "react";
import { Link } from "react-router-dom";
import "./Landing.css";
import MarketVisualization from "./MarketVisualization";

export default function Landing() {
  return (
    <div className="landing-container">
      {/* Navigation Bar */}
      <nav className="landing-nav">
        <div className="logo">
          <h1>VolatiSense</h1>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#benefits">Benefits</a>
          <a href="#testimonials">Testimonials</a>
          <div className="auth-links">
            <Link to="/login" className="btn-secondary">Login</Link>
            <Link to="/signup" className="btn-primary">Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Smart Market Risk Analysis Powered by AI</h1>
          <p>VolatiSense leverages machine learning to help investors analyze, predict, and navigate market volatility with confidence.</p>
          <div className="hero-cta">
            <Link to="/signup" className="btn-primary btn-large">Get Started</Link>
            <a href="#features" className="btn-secondary btn-large">Learn More</a>
          </div>
        </div>
        <div className="hero-image">
          <MarketVisualization />
        </div>
      </section>
            {/* Features Section */}
            <section className="features-section" id="features">
        <h2 className="section-title">Key Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon risk-icon"></div>
            <h3>Value at Risk Analysis</h3>
            <p>Calculate VaR with 95% and 99% confidence levels to understand potential downside risk exposure.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon volatility-icon"></div>
            <h3>Volatility Tracking</h3>
            <p>Monitor rolling volatility metrics to identify market trend shifts and risk pattern changes.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon ai-icon"></div>
            <h3>AI-Powered Predictions</h3>
            <p>Machine learning algorithms that analyze market data to forecast potential risk scenarios.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon dashboard-icon"></div>
            <h3>Interactive Dashboard</h3>
            <p>Visualize complex risk metrics through intuitive charts and actionable insights.</p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section" id="benefits">
        <div className="benefits-content">
          <h2 className="section-title">Why VolatiSense?</h2>
          <ul className="benefits-list">
            <li><span className="check-icon">✓</span> Make data-driven investment decisions based on accurate risk metrics</li>
            <li><span className="check-icon">✓</span> Reduce portfolio volatility through proactive risk management</li>
            <li><span className="check-icon">✓</span> Save time with automated risk assessment and monitoring</li>
            <li><span className="check-icon">✓</span> Track Indian equities with specialized market insights</li>
            <li><span className="check-icon">✓</span> Stay ahead of market trends with predictive analytics</li>
          </ul>
          <Link to="/signup" className="btn-primary">Start Free Trial</Link>
        </div>
        <div className="benefits-image">
          <div className="dashboard-preview"></div>
        </div>
      </section>

