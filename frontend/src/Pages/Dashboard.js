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