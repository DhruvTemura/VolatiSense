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

 {/* Testimonials */}
 <section className="testimonials-section" id="testimonials">
        <h2 className="section-title">What Our Users Say</h2>
        <div className="testimonials-container">
          <div className="testimonial-card">
            <div className="quote-icon">"</div>
            <p className="testimonial-text">VolatiSense has transformed how I approach risk management. The AI predictions have been remarkably accurate during recent market fluctuations.</p>
            <div className="testimonial-author">
              <p className="author-name">Kartikeya Attrey</p>
              <p className="author-title">Portfolio Manager, Mumbai</p>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="quote-icon">"</div>
            <p className="testimonial-text">The Value at Risk calculations and visual representations make it easy to explain complex risk metrics to my clients. An essential tool for any financial advisor.</p>
            <div className="testimonial-author">
              <p className="author-name">Hardik Batra</p>
              <p className="author-title">Financial Advisor, Bangalore</p>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="quote-icon">"</div>
            <p className="testimonial-text">As a retail investor, I finally feel equipped with professional-grade risk analysis tools. The interface is intuitive and the insights are invaluable.</p>
            <div className="testimonial-author">
              <p className="author-name">Krishan Rathi</p>
              <p className="author-title">Retail Investor, Delhi</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Manage Market Risk Intelligently?</h2>
          <p>Join thousands of investors using VolatiSense to navigate market volatility</p>
          <div className="cta-buttons">
            <Link to="/signup" className="btn-primary btn-large">Create Free Account</Link>
            <Link to="/login" className="btn-secondary">Already a User? Log In</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <h3>VolatiSense</h3>
            <p>AI-Powered Market Risk Assessment</p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#benefits">Benefits</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="footer-column">
              <h4>Resources</h4>
              <a href="#blog">Blog</a>
              <a href="#documentation">Documentation</a>
              <a href="#api">API</a>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <a href="#about">About Us</a>
              <a href="#careers">Careers</a>
              <a href="#contact">Contact</a>
            </div>
            <div className="footer-column">
              <h4>Legal</h4>
              <a href="#terms">Terms of Service</a>
              <a href="#privacy">Privacy Policy</a>
              <a href="#cookies">Cookie Policy</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>©️ 2025 VolatiSense. All rights reserved.</p>
          <div className="social-links">
            <a href="#twitter" className="social-icon twitter-icon"></a>
            <a href="#linkedin" className="social-icon linkedin-icon"></a>
            <a href="#github" className="social-icon github-icon"></a>
          </div>
        </div>
      </footer>
    </div>
  );
}