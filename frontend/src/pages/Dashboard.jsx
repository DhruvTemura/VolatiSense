import React, { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";
import "./Dashboard.css";

// Sample data
const stockOptions = [
  { value: "TCS", label: "Tata Consultancy Services" },
  { value: "INFY", label: "Infosys Ltd." },
  { value: "RELIANCE", label: "Reliance Industries Ltd." },
  { value: "HDFCBANK", label: "HDFC Bank Ltd." },
  { value: "WIPRO", label: "Wipro Ltd." }
];

const priceHistory = [
  { date: "Jun", price: 2550 },
  { date: "Jul", price: 2690 },
  { date: "Aug", price: 2810 },
  { date: "Sep", price: 2750 },
  { date: "Oct", price: 2880 }
];

const volatilityData = [
  { date: "Jun", volatility: 12 },
  { date: "Jul", volatility: 18 },
  { date: "Aug", volatility: 15 },
  { date: "Sep", volatility: 22 },
  { date: "Oct", volatility: 19 }
];

const varData = [
  { loss: "-500", probability: 0.1 },
  { loss: "-400", probability: 0.15 },
  { loss: "-300", probability: 0.2 },
  { loss: "-200", probability: 0.25 },
  { loss: "-100", probability: 0.2 },
  { loss: "0", probability: 0.1 }
];

export default function Dashboard() {
  const [selectedStock, setSelectedStock] = useState("");
  const [showResults, setShowResults] = useState(false);
  
  // Simple function to handle stock selection
  const handleSelectChange = (e) => {
    setSelectedStock(e.target.value);
  };
  
  // Function to analyze risk when button is clicked
  const analyzeRisk = () => {
    if (selectedStock) {
      setShowResults(true);
    } else {
      alert("Please select a stock first");
    }
  };

  // Scroll to section function
  const scrollToSection = (id) => {
    document.getElementById(id).scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="dashboard-main">
      {/* Top Navigation Bar - Always visible */}
      <nav className="landing-nav">
        <div className="logo">
          <h1>VolatiSense</h1>
        </div>
        <div className="nav-links">
          {showResults && (
            <>
              <a href="#" onClick={() => scrollToSection("risk-summary")}>Risk Summary</a>
              <a href="#" onClick={() => scrollToSection("price-trend")}>Price Trend</a>
              <a href="#" onClick={() => scrollToSection("var-distribution")}>VaR Distribution</a>
              <a href="#" onClick={() => scrollToSection("risk-logs")}>Risk Logs</a>
            </>
          )}
          <div className="auth-links">
            <Link to="/logout" className="btn-secondary">Logout</Link>
          </div>
        </div>
      </nav>

      <div className="dashboard-container">
        <h1 className="main-title">Risk Analysis Dashboard</h1>
        <p className="subtitle">Analyze market risk metrics for Indian equities</p>
        
        {showResults && (
          <div className="stock-header">
            <h2 className="tcs-analysis">{selectedStock} Analysis</h2>
          </div>
        )}
        
        {/* Stock Selection */}
        <div className="card">
          <h2 className="section-title">Select Stock</h2>
          <div className="flex-container">
            <select 
              className="select-input"
              value={selectedStock}
              onChange={handleSelectChange}
            >
              <option value="">Select a stock...</option>
              {stockOptions.map((stock) => (
                <option key={stock.value} value={stock.value}>
                  {stock.value} - {stock.label}
                </option>
              ))}
            </select>
            <button 
              className="primary-button"
              onClick={analyzeRisk}
            >
              Analyze Risk
            </button>
          </div>
        </div>
        
        {/* Results Section - Only visible after analysis */}
        {showResults && (
          <>
            {/* Risk Summary */}
            <div id="risk-summary" className="card">
              <div className="header-with-badge">
                <h2 className="section-title">
                  {selectedStock} Risk Summary
                </h2>
                <span className="risk-badge">
                  Moderate Risk
                </span>
              </div>
              
              <div className="metrics-grid">
                <div className="metric-card">
                  <p className="metric-label">Value at Risk (95%)</p>
                  <p className="metric-value">₹245.32</p>
                  <p className="metric-description">5% chance of exceeding this loss</p>
                </div>
                <div className="metric-card">
                  <p className="metric-label">Value at Risk (99%)</p>
                  <p className="metric-value">₹387.65</p>
                  <p className="metric-description">1% chance of exceeding this loss</p>
                </div>
                <div className="metric-card">
                  <p className="metric-label">Expected Shortfall (CVaR)</p>
                  <p className="metric-value">₹312.48</p>
                  <p className="metric-description">Average loss beyond VaR</p>
                </div>
              </div>
            </div>
            
            {/* Charts - Using simple components */}
            <div className="charts-grid">
              {/* Price History Chart */}
              <div id="price-trend" className="card">
                <h3 className="chart-title">Historical Price Trend</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={priceHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Volatility Chart */}
              <div className="card">
                <h3 className="chart-title">Rolling Volatility (30 Days)</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={volatilityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="volatility" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* VaR Distribution Chart */}
            <div id="var-distribution" className="card">
              <h3 className="chart-title">Value at Risk Distribution</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={varData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="loss" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="probability" fill="#8884d8" name="Loss Probability" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* VaR Reference Lines - displayed as text for simplicity */}
              <div className="reference-lines">
                <div className="reference-line">
                  <div className="reference-color red-light"></div>
                  <span className="reference-text">VaR 95%: -₹245.32</span>
                </div>
                <div className="reference-line">
                  <div className="reference-color red-dark"></div>
                  <span className="reference-text">VaR 99%: -₹387.65</span>
                </div>
              </div>
            </div>
            
            {/* Risk Logs - Simplified */}
            <div id="risk-logs" className="card">
              <h3 className="chart-title">Risk Assessment Logs</h3>
              <div className="logs-container">
                <p className="log-entry">✓ Calculated VaR at 95% confidence level: ₹245.32</p>
                <p className="log-entry">✓ Calculated VaR at 99% confidence level: ₹387.65</p>
                <p className="log-entry">✓ Conditional VaR (Expected Shortfall): ₹312.48</p>
                <p className="log-entry">i There is a 5% chance the losses will exceed ₹245.32 next week</p>
                <p className="log-entry">i There is a 1% chance the losses will exceed ₹387.65 next week</p>
                <p className="log-entry">i Model passed Binomial Test for backtesting</p>
                <p className="log-entry">! Current volatility is 19%, which is 27% higher than 3-month average</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}