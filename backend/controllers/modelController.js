// backend/controllers/modelController.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Use a loose schema to read from 'model_stats' collection
const ModelStat = mongoose.model(
  'ModelStat',
  new mongoose.Schema({}, { strict: false }),
  'model_stats'
);

// Helper to get dummy data when real data isn't available
const generateDefaultModelStats = (ticker) => {
  const today = new Date();
  const priceHistory = Array(30).fill().map((_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (30 - i));
    return {
      date: date.toISOString().split('T')[0],
      price: 1000 + Math.random() * 200
    };
  });

  const volatilityData = priceHistory.map(item => ({
    date: item.date,
    volatility: Math.random() * 0.05
  }));

  const varData = Array(20).fill().map((_, i) => ({
    loss: (i * 0.5).toFixed(1) + '%',
    probability: Math.random() * 0.1
  }));

  return {
    ticker,
    var95: (Math.random() * 50 + 10).toFixed(2),
    var99: (Math.random() * 80 + 30).toFixed(2),
    cvar: (Math.random() * 100 + 50).toFixed(2),
    riskLevel: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
    accuracy: Math.random() * 15 + 80,
    priceHistory,
    volatilityData,
    varData,
    createdAt: new Date()
  };
};

// Function to check if model exists
const checkModelExists = async (ticker) => {
  const modelsDir = path.join(__dirname, '..', 'model', 'models', ticker);
  return fs.existsSync(modelsDir);
};

exports.getModelStats = async (req, res) => {
  try {
    const { ticker } = req.params;
    
    // Try to get data from MongoDB with more detailed logging
    let doc = await ModelStat.findOne({ ticker });
    console.log(`Looking for ticker: ${ticker}, found: ${doc ? 'yes' : 'no'}`);
    
    // If no document exists but model exists, create dummy stats
    if (!doc) {
      const modelExists = await checkModelExists(ticker);
      console.log(`Model files exist for ${ticker}: ${modelExists}`);
      
      if (modelExists) {
        // Create default stats
        const defaultStats = generateDefaultModelStats(ticker);
        doc = await ModelStat.create(defaultStats);
        console.log(`Created new stats for ${ticker}`);
      } else {
        // No model and no stats
        return res.status(404).json({ 
          message: `No stats found for ${ticker}. Please run model training first.` 
        });
      }
    }
    
    // Add a timestamp to help debug if data is stale
    doc = doc.toJSON ? doc.toJSON() : doc;
    doc._fetchTime = new Date().toISOString();
    
    res.json(doc);
  } catch (err) {
    console.error('Error fetching model stats:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Add a route to generate stats for all tickers if needed
exports.generateAllModelStats = async (req, res) => {
  try {
    const tickers = [
      "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "HINDUNILVR.NS", "BHARTIARTL.NS",
      "KOTAKBANK.NS", "ITC.NS", "AXISBANK.NS", "MARUTI.NS", "BAJFINANCE.NS", "BAJAJFINSV.NS",
      "HCLTECH.NS", "LUPIN.NS", "ULTRACEMCO.NS", "NTPC.NS", "WIPRO.NS", "M&M.NS", "POWERGRID.NS",
      "SBIN.NS", "ASIANPAINT.NS", "DRREDDY.NS", "BAJAJ-AUTO.NS", "SUNPHARMA.NS", "JSWSTEEL.NS",
      "TATAMOTORS.NS", "TITAN.NS", "HDFCLIFE.NS", "INDUSINDBK.NS", "DIVISLAB.NS","AAPL","SMSN.IL"
    ];

    const results = [];
    for (const ticker of tickers) {
      const exists = await ModelStat.findOne({ ticker });
      if (!exists) {
        const stats = generateDefaultModelStats(ticker);
        await ModelStat.create(stats);
        results.push({ ticker, status: 'created' });
      } else {
        results.push({ ticker, status: 'exists' });
      }
    }

    res.json({ message: 'Stats generated', results });
  } catch (err) {
    console.error('Error generating stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
};