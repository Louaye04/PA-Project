import React, { useState, useEffect } from 'react';
import Login from './components/Login/Login';
import Signup from './components/Signup/Signup';
import Dashboard from './components/Dashboard/Dashboard';
import './App.scss';

function App() {
  const [currentView, setCurrentView] = useState(() => {
    // Check if user is already logged in on mount
    const token = localStorage.getItem('authToken');
    const path = window.location.pathname;
    if (token && path === '/dashboard') {
      return 'dashboard';
    }
    return 'login';
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('authToken');
  });

  // Check authentication status on mount and when localStorage changes
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      setIsAuthenticated(!!token);
      
      if (!token && currentView === 'dashboard') {
        setCurrentView('login');
      }
    };

    checkAuth();

    // Listen for storage changes (in case user logs out in another tab)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, [currentView]);

  const switchToSignup = () => setCurrentView('signup');
  const switchToLogin = () => {
    setCurrentView('login');
    setIsAuthenticated(false);
  };
  
  const handleLoginSuccess = () => {
    console.log('Login successful, switching to dashboard');
    setIsAuthenticated(true);
    setCurrentView('dashboard');
    window.history.pushState({}, '', '/dashboard');
  };

  const handleSignupSuccess = () => {
    console.log('Signup successful, switching to login');
    setCurrentView('login');
  };

  return (
    <div className="app">
      {currentView === 'login' && (
        <Login 
          onSwitchToSignup={switchToSignup} 
          onLoginSuccess={handleLoginSuccess}
        />
      )}
      {currentView === 'signup' && (
        <Signup 
          onSwitchToLogin={switchToLogin}
          onSignupSuccess={handleSignupSuccess}
        />
      )}
      {currentView === 'dashboard' && isAuthenticated && (
        <Dashboard onLogout={switchToLogin} />
      )}
    </div>
  );
}

export default App;
