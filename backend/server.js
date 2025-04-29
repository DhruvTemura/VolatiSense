// backend/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const path = require('path');
const modelRoutes = require("./routes/modelRoutes");

const app = express();
app.use(cors());
app.use(express.json());

// Route for other model endpoints
app.use("/api/models", modelRoutes);

// MongoDB connection
const dbName = process.env.dbName || 'market_risk_assessment'; 
const DB_URI = `mongodb://mongo:27017/${dbName}`;

mongoose.connect(DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Paths to Python scripts
const fetchScript = path.join(__dirname, 'dataset', 'fetch_latest_data.py');
const trainScript = path.join(__dirname, 'model', 'train_update.py');

// POST /api/update-model with real-time log streaming
app.post('/api/update-model', (req, res) => {
  console.log('Starting data fetch...');
  let logs = [];

  const collectLog = (data) => {
    const log = data.toString();
    console.log(log);
    logs.push(log);
  };

  const fetchProc = spawn('python3', ['-u', fetchScript], { shell: true, cwd: __dirname });
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

    const trainProc = spawn('python3', ['-u', trainScript], { shell: true, cwd: __dirname });
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

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
