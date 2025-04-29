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
