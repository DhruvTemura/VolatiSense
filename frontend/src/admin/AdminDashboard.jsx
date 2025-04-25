import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('Never');
  const navigate = useNavigate();

  const adminUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  const updateModel = () => {
    setIsUpdating(true);
    
    // Simulate an API call to update the model
    setTimeout(() => {
      setIsUpdating(false);
      setLastUpdate(new Date().toLocaleString());
      alert('Model updated successfully with latest stock data!');
    }, 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/login');
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
            </div>
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
                <tr>
                  <td>2025-04-10</td>
                  <td>11:45 AM</td>
                  <td>Success</td>
                  <td>+0.8% F1 Score</td>
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