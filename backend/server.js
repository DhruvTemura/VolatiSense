// backend/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { spawn, exec } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 1) Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/market_risk_assessment', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// 2) Define Mongoose schema/model for sensex_data
const StockSchema = new mongoose.Schema({
  Ticker: String,
  Date: Date,
  Close: Number,
  High: Number,
  Low: Number,
  Volume: Number,
  Return: Number,
  MA_5: Number,
  MA_10: Number,
  MA_50: Number,
  MA_200: Number,
  STD_5: Number,
  Range: Number,
  Range_Ratio: Number,
  Price_to_MA5: Number,
  Price_to_MA10: Number,
  Momentum: Number,
  Volume_Change: Number,
  VaR_95: Number,
  Volatility: Number,
  RSI: Number,
  MACD: Number,
  MACD_Signal: Number,
  BB_Upper: Number,
  BB_Lower: Number,
  ATR: Number,
  Risk_Code: Number,
  Risk_Label: String,
  High_Risk: Number,
}, { collection: 'sensex_data' });

const Stock = mongoose.model('Stock', StockSchema);

// 3) Paths to your Python scripts
const fetchScript = path.join(__dirname, 'dataset', 'fetch_latest_data.py');
const trainScript = path.join(__dirname, 'model', 'train_update.py');
const riskScript  = path.join(__dirname, 'model', 'risk_analysis.py'); // you’ll need to create this

// 4) POST /api/update-model
app.post('/api/update-model', (req, res) => {
  exec(`python "${fetchScript}"`, (err1, out1, errOut1) => {
    if (err1) {
      return res.status(500).json({ error: `Error fetching data:\n${errOut1}` });
    }
    exec(`python "${trainScript}"`, (err2, out2, errOut2) => {
      if (err2) {
        return res.status(500).json({ error: `Error training model:\n${errOut2}` });
      }
      res.json({
        message: 'Model updated successfully!',
        logs: out1 + errOut1 + out2 + errOut2
      });
    });
  });
});

// 5) GET /api/stock-data/:symbol
app.get('/api/stock-data/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol + '.NS';    // match your stored tickers
    const data = await Stock.find({ Ticker: symbol })
                            .sort({ Date: 1 })
                            .lean();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6) POST /api/analyze-risk
//    Expects a Python script that takes [symbol] and prints JSON
app.post('/api/analyze-risk', (req, res) => {
  const { symbol } = req.body;
  const symbolArg = symbol + '.NS';

  const py = spawn('python', [riskScript, symbolArg]);
  let output = '';

  py.stdout.on('data', chunk => {
    output += chunk.toString();
  });
  py.stderr.on('data', chunk => {
    console.error('Risk script stderr:', chunk.toString());
  });
  py.on('close', code => {
    if (code !== 0) {
      return res.status(500).json({ error: `Risk analysis exited with code ${code}` });
    }
    try {
      const json = JSON.parse(output);
      res.json(json);
    } catch (e) {
      res.status(500).json({ error: 'Invalid JSON from risk analysis script' });
    }
  });
});

// 7) Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
