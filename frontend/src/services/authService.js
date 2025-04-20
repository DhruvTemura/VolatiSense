// src/services/authService.js
// This is a mock service for authentication
// In a production app, you would connect this to your backend API

export const authService = {
    login: async (email, password) => {
      // Simulate API call
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          // In a real application, validate credentials with backend
          if (email && password) {
            const user = { email };
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('isAuthenticated', 'true');
            resolve(user);
          } else {
            reject(new Error('Invalid credentials'));
          }
        }, 1000);
      });
    },
  
    signup: async (userData) => {
      // Simulate API call
      return new Promise((resolve) => {
        setTimeout(() => {
          // In a real application, send user data to backend
          resolve({ success: true });
        }, 1000);
      });
    },
  
    logout: () => {
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
    },
  
    getCurrentUser: () => {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    },
  
    isAuthenticated: () => {
      return localStorage.getItem('isAuthenticated') === 'true';
    }
  };
  
  export default authService;