// MarketVisualization.js
import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, AlertCircle, Activity } from "lucide-react";

export default function MarketVisualization() {
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Sample data representing market volatility
  const data = [
    { name: "Jan", value: 1500, volatility: 15 },
    { name: "Feb", value: 1700, volatility: 12 },
    { name: "Mar", value: 1600, volatility: 18 },
    { name: "Apr", value: 1900, volatility: 22 },
    { name: "May", value: 1700, volatility: 28 },
    { name: "Jun", value: 2100, volatility: 16 },
    { name: "Jul", value: 2400, volatility: 10 },
    { name: "Aug", value: 2300, volatility: 25 }
  ];

  // Risk prediction indicators
  const riskIndicators = [
    { level: "Medium", color: "#FFB74D" },
    { level: "High", color: "#F44336" },
    { level: "Low", color: "#4CAF50" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % riskIndicators.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="market-visualization">
      <div className="chart-header">
        <div className="chart-title">
          <h3>Market Volatility Index</h3>
          <div className="live-indicator">
            <Activity className="activity-icon" />
            <span>Live Analysis</span>
          </div>
        </div>
      </div>
      
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorVolatility" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis hide={true} />
            <Tooltip />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorValue)" 
            />
            <Area 
              type="monotone" 
              dataKey="volatility" 
              stroke="#ef4444" 
              fillOpacity={0.3}
              fill="url(#colorVolatility)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="chart-footer">
        <div className="risk-prediction">
          <div className="prediction-label">
            <AlertCircle className="alert-icon" />
            <span>Risk Prediction:</span>
          </div>
          <div 
            className="risk-indicator"
            style={{ 
              backgroundColor: `${riskIndicators[activeIndex].color}20`,
              color: riskIndicators[activeIndex].color 
            }}
          >
            <TrendingUp className="trend-icon" />
            <span>{riskIndicators[activeIndex].level} Risk</span>
          </div>
        </div>
        
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">VaR (95%)</div>
            <div className="metric-value">4.7%</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Volatility</div>
            <div className="metric-value">18.3%</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Sharpe</div>
            <div className="metric-value">1.2</div>
          </div>
        </div>
      </div>
    </div>
  );
}