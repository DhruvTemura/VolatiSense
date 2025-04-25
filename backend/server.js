// backend/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
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

// 2) Define schema for sensex_data (omitted for brevity, keep your existing schema)
// ... your StockSchema and model setup here ...

// 3) Paths to Python scripts
const fetchScript = path.join(__dirname, 'dataset', 'fetch_latest_data.py');
const trainScript = path.join(__dirname, 'model', 'train_update.py');

// 4) POST /api/update-model with real-time streaming
app.post('/api/update-model', (req, res) => {
  console.log('Starting data fetch...');

  // Spawn Python process with unbuffered output (-u) for fetch
  const fetchProc = spawn('python', ['-u', fetchScript], { shell: true });
  fetchProc.stdout.pipe(process.stdout);
  fetchProc.stderr.pipe(process.stderr);

  fetchProc.on('close', code => {
    if (code !== 0) {
      console.error(`Fetch script exited with code ${code}`);
      return res.status(500).json({ error: 'Failed to fetch data' });
    }

    console.log('Data fetch complete, starting model training...');
    // Spawn Python process with unbuffered output (-u) for train
    const trainProc = spawn('python', ['-u', trainScript], { shell: true });
    trainProc.stdout.pipe(process.stdout);
    trainProc.stderr.pipe(process.stderr);

    trainProc.on('close', code2 => {
      if (code2 !== 0) {
        console.error(`Train script exited with code ${code2}`);
        return res.status(500).json({ error: 'Model training failed' });
      }

      console.log('Model training complete.');
      res.json({ message: 'Model updated successfully!' });
    });
  });
});

// 5) Other routes (stock-data, analyze-risk) remain unchanged
// ... your existing GET /api/stock-data and POST /api/analyze-risk handlers ...

// 6) Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
