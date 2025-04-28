import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('Never');
  const [logs, setLogs] = useState(''); 
  const [showLogs, setShowLogs] = useState(false);
  const navigate = useNavigate();

  const adminUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  const updateModel = async () => {
    setIsUpdating(true);
    setLogs(''); // clear previous logs
    setShowLogs(true); // show logs area

    try {
      const response = await fetch('http://localhost:5000/api/update-model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Update failed');

      setLastUpdate(new Date().toLocaleString());
      setLogs(result.logs || ''); // capture logs
      alert(result.message || 'Model updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Error updating model: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  const toggleLogs = () => {
    setShowLogs(!showLogs);
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="logo">VOLATISENSE Admin</div>
        <div className="user-info">
          <span>Welcome, {adminUser.name || 'Admin'}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="admin-content">
        <div className="sidebar">
          <h3>Admin Controls</h3>
          <ul>
            <li className="active">Model Management</li>
            <li>User Management</li>
            <li>System Settings</li>
          </ul>
        </div>

        <div className="main-content">
          <h1>Model Management</h1>

          <div className="model-card">
            <h2>XGBoost Risk Classifier</h2>
            <div className="model-info">
              <p><strong>Status:</strong> Active</p>
              <p><strong>Last updated:</strong> {lastUpdate}</p>
              <p><strong>Accuracy:</strong> 87.5%</p>
              <p><strong>F1 Score:</strong> 0.83</p>
            </div>

            <div className="model-actions">
              <button
                className={`update-btn ${isUpdating ? 'updating' : ''}`}
                onClick={updateModel}
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating...' : 'Update Model'}
              </button>
              <button className="view-btn">View Performance</button>
              {logs && <button className="toggle-logs-btn" onClick={toggleLogs}>
                {showLogs ? 'Hide Logs' : 'Show Logs'}
              </button>}
            </div>

            {/* Display logs when available */}
            {showLogs && logs && (
              <div className="logs-container">
                <h3>Update Logs</h3>
                <pre className="update-logs">
                  {logs}
                </pre>
              </div>
            )}
          </div>

          <div className="model-history">
            <h3>Update History</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Performance Change</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{new Date().toLocaleDateString()}</td>
                  <td>{new Date().toLocaleTimeString()}</td>
                  <td>Running</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td>2025-04-20</td>
                  <td>10:23 AM</td>
                  <td>Success</td>
                  <td>+1.2% F1 Score</td>
                </tr>
                <tr>
                  <td>2025-04-15</td>
                  <td>09:10 AM</td>
                  <td>Success</td>
                  <td>-0.3% F1 Score</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;