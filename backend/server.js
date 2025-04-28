// backend/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const modelRoutes = require("./routes/modelRoutes");
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/models", modelRoutes);
 

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

// POST /api/update-model with real-time streaming and log collection
app.post('/api/update-model', (req, res) => {
  console.log('Starting data fetch...');
  let logs = [];
  
  // Function to collect logs
  const collectLog = (data) => {
    const log = data.toString();
    console.log(log);
    logs.push(log);
  };

  // Spawn Python process with unbuffered output (-u) for fetch
  const fetchProc = spawn('python', ['-u', fetchScript], { shell: true, cwd: __dirname });
  fetchProc.stdout.on('data', collectLog);
  fetchProc.stderr.on('data', collectLog);

  fetchProc.on('close', code => {
    if (code !== 0) {
      console.error(`Fetch script exited with code ${code}`);
      return res.status(500).json({ 
        error: 'Failed to fetch data',
        logs: logs.join('')
      });
    }

    console.log('Data fetch complete, starting model training...');
    logs.push('Data fetch complete, starting model training...\n');

    // Spawn Python process with unbuffered output (-u) for train
    const trainProc = spawn('python', ['-u', trainScript], { shell: true, cwd: __dirname });
    trainProc.stdout.on('data', collectLog);
    trainProc.stderr.on('data', collectLog);

    trainProc.on('close', code2 => {
      if (code2 !== 0) {
        console.error(`Train script exited with code ${code2}`);
        return res.status(500).json({ 
          error: 'Model training failed',
          logs: logs.join('')
        });
      }

      console.log('Model training complete.');
      logs.push('Model training complete.\n');
      res.json({ 
        message: 'Model updated successfully!',
        logs: logs.join('')
      });
    });
  });
});

// 5) Other routes (stock-data, analyze-risk) remain unchanged
// ... your existing GET /api/stock-data and POST /api/analyze-risk handlers ...

// 6) Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
