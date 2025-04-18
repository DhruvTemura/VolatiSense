import React, { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

    return (
        <div className="min-h-screen bg-gray-50 p-6">
          <h1 className="text-3xl font-bold mb-4">Risk Analysis Dashboard</h1>
          <p className="mb-6 text-gray-600">Analyze market risk metrics for Indian equities</p>
          
          {/* Stock Selection */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-medium mb-3">Select Stock</h2>
            <div className="flex gap-4">
              <select 
                className="border rounded p-2 w-64"
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
                className="bg-blue-600 text-white px-4 py-2 rounded"
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
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    {selectedStock} Risk Summary
                  </h2>
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                    Moderate Risk
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-gray-500 text-sm">Value at Risk (95%)</p>
                    <p className="text-2xl font-bold">₹245.32</p>
                    <p className="text-sm">5% chance of exceeding this loss</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-gray-500 text-sm">Value at Risk (99%)</p>
                    <p className="text-2xl font-bold">₹387.65</p>
                    <p className="text-sm">1% chance of exceeding this loss</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-gray-500 text-sm">Expected Shortfall (CVaR)</p>
                    <p className="text-2xl font-bold">₹312.48</p>
                    <p className="text-sm">Average loss beyond VaR</p>
                  </div>
                </div>
              </div>
              
              {/* Charts - Using simple components */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Price History Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium mb-4">Historical Price Trend</h3>
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
                
                {/* Volatility Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium mb-4">Rolling Volatility (30 Days)</h3>
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
              
              {/* VaR Distribution Chart */}
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h3 className="text-lg font-medium mb-4">Value at Risk Distribution</h3>
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
                {/* VaR Reference Lines - displayed as text for simplicity */}
                <div className="mt-2 flex gap-4">
                  <div className="flex items-center">
                    <div className="w-4 h-1 bg-red-500 mr-2"></div>
                    <span className="text-sm">VaR 95%: -₹245.32</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-1 bg-red-800 mr-2"></div>
                    <span className="text-sm">VaR 99%: -₹387.65</span>
                  </div>
                </div>
              </div>
              
              {/* Risk Logs - Simplified */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Risk Assessment Logs</h3>
                <div className="bg-gray-50 p-4 rounded-lg border text-sm font-mono">
                  <p className="mb-2">✓ Calculated VaR at 95% confidence level: ₹245.32</p>
                  <p className="mb-2">✓ Calculated VaR at 99% confidence level: ₹387.65</p>
                  <p className="mb-2">✓ Conditional VaR (Expected Shortfall): ₹312.48</p>
                  <p className="mb-2">i There is a 5% chance the losses will exceed ₹245.32 next week</p>
                  <p className="mb-2">i There is a 1% chance the losses will exceed ₹387.65 next week</p>
                  <p className="mb-2">i Model passed Binomial Test for backtesting</p>
                  <p className="mb-2">! Current volatility is 19%, which is 27% higher than 3-month average</p>
                </div>
              </div>
            </>
          )}
        </div>
      );
    }