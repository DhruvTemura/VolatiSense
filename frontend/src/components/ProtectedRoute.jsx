import React from 'react';
import { Navigate } from 'react-router-dom';

// This component protects routes from unauthenticated users
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = () => {
    // Check if user is logged in by looking for currentUser in localStorage
    const user = localStorage.getItem('currentUser');
    return !!user;
  };

  if (!isAuthenticated()) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" />;
  }

  // Render the protected component if authenticated
  return children;
};

export default ProtectedRoute;