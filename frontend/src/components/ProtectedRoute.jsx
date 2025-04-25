import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const isAuthenticated = () => {
    const userString = localStorage.getItem('currentUser');
    return !!userString;
  };
  
  const isAdmin = () => {
    try {
      const userString = localStorage.getItem('currentUser');
      if (!userString) return false;
      
      const user = JSON.parse(userString);
      return user.role === 'admin';
    } catch (error) {
      return false;
    }
  };

  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default ProtectedRoute;