import React, { useState, useEffect } from "react";
import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from "recharts";
import { Link } from "react-router-dom";
import "./Dashboard.css";

export default function Dashboard() {
  const [selectedStock, setSelectedStock] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dynamic data states
  const [priceHistory, setPriceHistory] = useState([]);
  const [volatilityData, setVolatilityData] = useState([]);
  const [varData, setVarData] = useState([]);
  const [modelStats, setModelStats] = useState({});

  // Destructure stats with defaults
  const {
    var95 = '—',
    var99 = '—',
    cvar = '—',
    riskLevel = '—',
    accuracy = null
  } = modelStats;

  const stockOptions = [
    { value: "RELIANCE.NS",    label: "Reliance Industries Ltd." },
    { value: "TCS.NS",         label: "Tata Consultancy Services Ltd." },
    { value: "HDFCBANK.NS",    label: "HDFC Bank Ltd." },
    { value: "INFY.NS",        label: "Infosys Ltd." },
    { value: "HINDUNILVR.NS",  label: "Hindustan Unilever Ltd." },
    { value: "BHARTIARTL.NS",  label: "Bharti Airtel Ltd." },
    { value: "KOTAKBANK.NS",   label: "Kotak Mahindra Bank Ltd." },
    { value: "ITC.NS",         label: "ITC Ltd." },
    { value: "AXISBANK.NS",    label: "Axis Bank Ltd." },
    { value: "MARUTI.NS",      label: "Maruti Suzuki India Ltd." },
    { value: "BAJFINANCE.NS",  label: "Bajaj Finance Ltd." },
    { value: "BAJAJFINSV.NS",  label: "Bajaj Finserv Ltd." },
    { value: "HCLTECH.NS",     label: "HCL Technologies Ltd." },
    { value: "LUPIN.NS",       label: "Lupin Ltd." },
    { value: "ULTRACEMCO.NS",  label: "UltraTech Cement Ltd." },
    { value: "NTPC.NS",        label: "NTPC Ltd." },
    { value: "WIPRO.NS",       label: "Wipro Ltd." },
    { value: "M&M.NS",         label: "Mahindra & Mahindra Ltd." },
    { value: "POWERGRID.NS",   label: "Power Grid Corp. of India Ltd." },
    { value: "SBIN.NS",        label: "State Bank of India" },
    { value: "ASIANPAINT.NS",  label: "Asian Paints Ltd." },
    { value: "DRREDDY.NS",     label: "Dr. Reddy's Laboratories Ltd." },
    { value: "BAJAJ-AUTO.NS",  label: "Bajaj Auto Ltd." },
    { value: "SUNPHARMA.NS",   label: "Sun Pharmaceutical Industries Ltd." },
    { value: "JSWSTEEL.NS",    label: "JSW Steel Ltd." },
    { value: "TATAMOTORS.NS",  label: "Tata Motors Ltd." },
    { value: "TITAN.NS",       label: "Titan Company Ltd." },
    { value: "HDFCLIFE.NS",    label: "HDFC Life Insurance Co. Ltd." },
    { value: "INDUSINDBK.NS",  label: "IndusInd Bank Ltd." },
    { value: "DIVISLAB.NS",    label: "Divi's Laboratories Ltd." }
  ];

  // Function to generate model stats for all tickers
  const generateAllStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/models/generate-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate model stats');
      }
      
      const result = await response.json();
      console.log('Stats generation result:', result);
      alert("Stats generated successfully! Click Analyze Risk again.");
      
      // After generating stats, try analyzing again if we have a selected stock
      if (selectedStock) {
        setShowResults(true);
      }
    } catch (err) {
      console.error('Error generating stats:', err);
      setError('Could not generate model stats. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch model data when user triggers analysis
  useEffect(() => {
    if (!showResults || !selectedStock) return;
    setLoading(true);
    setError(null);
    
    console.log(`Fetching data for ${selectedStock}...`);
    
    fetch(`http://localhost:5000/api/models/${selectedStock}`)
      .then(res => {
        console.log(`Response status for ${selectedStock}:`, res.status);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(`No data available for ${selectedStock}. Try generating stats first.`);
          }
          return res.json().then(data => {
            throw new Error(data.error || data.message || "Failed to load model data");
          }).catch(() => {
            throw new Error("Failed to load model data");
          });
        }
        return res.json();
      })
      .then(data => {
        console.log("Model data received:", data);
        // Check if we got valid data
        if (!data) {
          throw new Error("Empty response received");
        }
        
        // Use data if available, or empty arrays as fallbacks
        setPriceHistory(data.priceHistory || []);
        setVolatilityData(data.volatilityData || []);
        setVarData(data.varData || []);
        
        // Set model statistics with proper type conversion
        setModelStats({
          var95: typeof data.var95 === 'number' ? data.var95.toFixed(2) : data.var95,
          var99: typeof data.var99 === 'number' ? data.var99.toFixed(2) : data.var99,
          cvar: typeof data.cvar === 'number' ? data.cvar.toFixed(2) : data.cvar,
          riskLevel: data.riskLevel || 'Unknown',
          accuracy: typeof data.accuracy === 'number' ? data.accuracy : null
        });
        
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading model data:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [showResults, selectedStock]);

  const handleSelectChange = e => {
    setSelectedStock(e.target.value);
    setShowResults(false);
    setError(null);
  };

  const analyzeRisk = () => {
    if (!selectedStock) return alert("Please select a stock first");
    setShowResults(true);
  };

  // Function to check if charts have data
  const hasChartData = (data) => {
    return Array.isArray(data) && data.length > 0;
  };

  return (
    <div className="dashboard-main">
      <nav className="landing-nav">
        <div className="logo"><h1>VolatiSense</h1></div>
        <div className="nav-links">
          {showResults && (
            <> {/* internal anchors preserved */}
              <a href="#risk-summary" onClick={e => e.preventDefault()}>Risk Summary</a>
              <a href="#price-trend" onClick={e => e.preventDefault()}>Price Trend</a>
              <a href="#var-distribution" onClick={e => e.preventDefault()}>VaR Distribution</a>
              <a href="#risk-logs" onClick={e => e.preventDefault()}>Risk Logs</a>
            </>
          )}
          <Link to="/logout" className="btn-secondary">Logout</Link>
        </div>
      </nav>

      <div className="dashboard-container">
        <h1 className="main-title">Risk Analysis Dashboard</h1>
        <p className="subtitle">Analyze market risk metrics for Indian equities</p>

        <div className="card">
          <h2 className="section-title">Select Stock</h2>
          <div className="flex-container">
            <select
              className="select-input"
              value={selectedStock}
              onChange={handleSelectChange}
            >
              <option value="">Select a stock...</option>
              {stockOptions.map(stock => (
                <option key={stock.value} value={stock.value}>
                  {stock.value} - {stock.label}
                </option>
              ))}
            </select>
            <button className="primary-button" onClick={analyzeRisk} disabled={loading || !selectedStock}>
              {loading ? 'Loading...' : 'Analyze Risk'}
            </button>
          </div>
        </div>

        {loading && <p className="loading-message">Loading data...</p>}
        
        {error && (
          <div className="error-card">
            <p className="error">Error: {error}</p>
            <button className="primary-button" onClick={generateAllStats} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Missing Data'}
            </button>
          </div>
        )}

        {showResults && !loading && !error && (
          <>
            <div id="risk-summary" className="card">
              <div className="header-with-badge">
                <h2 className="section-title">{selectedStock} Risk Summary</h2>
                <span className={`risk-badge ${riskLevel.toLowerCase()}`}>{riskLevel}</span>
              </div>
              <div className="metrics-grid">
                <div className="metric-card">
                  <p className="metric-label">Value at Risk (95%)</p>
                  <p className="metric-value">₹{var95}</p>
                </div>
                <div className="metric-card">
                  <p className="metric-label">Value at Risk (99%)</p>
                  <p className="metric-value">₹{var99}</p>
                </div>
                <div className="metric-card">
                  <p className="metric-label">Expected Shortfall (CVaR)</p>
                  <p className="metric-value">₹{cvar}</p>
                </div>
                <div className="metric-card">
                  <p className="metric-label">Model Accuracy</p>
                  <p className="metric-value">
                    {accuracy != null ? `${accuracy.toFixed(2)}%` : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="charts-grid">
              <div id="price-trend" className="card">
                <h3 className="chart-title">Historical Price Trend</h3>
                <div className="chart-container">
                  {hasChartData(priceHistory) ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={priceHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="no-data-message">No price history data available</p>
                  )}
                </div>
              </div>

              <div className="card">
                <h3 className="chart-title">Rolling Volatility (30 Days)</h3>
                <div className="chart-container">
                  {hasChartData(volatilityData) ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={volatilityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="volatility" stroke="#ef4444" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="no-data-message">No volatility data available</p>
                  )}
                </div>
              </div>
            </div>

            <div id="var-distribution" className="card">
              <h3 className="chart-title">Value at Risk Distribution</h3>
              <div className="chart-container">
                {hasChartData(varData) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={varData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="loss" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="probability" name="Loss Probability" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="no-data-message">No VaR distribution data available</p>
                )}
              </div>
            </div>

            <div id="risk-logs" className="card">
              <h3 className="chart-title">Risk Assessment Logs</h3>
              <div className="logs-container">
                <p className="log-entry">
                  Model Accuracy: {accuracy != null ? `${accuracy.toFixed(2)}%` : '—'}
                </p>
                <p className="log-entry">VaR95: ₹{var95}</p>
                <p className="log-entry">VaR99: ₹{var99}</p>
                <p className="log-entry">CVaR: ₹{cvar}</p>
                <p className="log-entry">Risk Level: {riskLevel}</p>
                <p className="log-entry">Last Updated: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}