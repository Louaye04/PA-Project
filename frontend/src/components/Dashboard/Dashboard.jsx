import React, { useEffect, useState } from 'react';
import SellerDashboard from '../SellerDashboard/SellerDashboard';
import BuyerDashboard from '../BuyerDashboard/BuyerDashboard';
import AdminDashboard from '../AdminDashboard/AdminDashboard';

const Dashboard = ({ onLogout }) => {
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get user data from localStorage
    const token = localStorage.getItem('authToken');
    const email = localStorage.getItem('userEmail');
    const name = localStorage.getItem('userName');
    
    if (!token) {
      console.warn('No auth token found, redirecting to login...');
      if (onLogout) onLogout();
      return;
    }

    // Decode JWT to get user role
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const role = payload.role;
      
      setUserRole(role);
      setUserName(name || email || 'User');
      
      console.log('Dashboard mounted with role:', role);
      
      // Set page title based on role
      if (role === 'admin') {
        document.title = 'page dashboard-admin-BKH';
      } else if (role === 'buyer') {
        document.title = 'page dashboard-acheteur-BKH';
      } else if (role === 'seller') {
        document.title = 'page dashboard-vendeur-BKH';
      } else {
        document.title = 'page dashboard-BKH';
      }
      
    } catch (error) {
      console.error('Error decoding token:', error);
      if (onLogout) onLogout();
      return;
    }
    
    setIsLoading(false);
  }, [onLogout]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    
    if (onLogout) {
      onLogout();
    }
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Inter, sans-serif'
      }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!userRole) {
    return null;
  }

  // Render appropriate dashboard based on role
  if (userRole === 'seller') {
    return (
      <div style={{ paddingTop: 20 }}>
        <SellerDashboard userName={userName} onLogout={handleLogout} />
      </div>
    );
  }

  if (userRole === 'buyer') {
    return (
      <div style={{ paddingTop: 20 }}>
        <BuyerDashboard userName={userName} onLogout={handleLogout} />
      </div>
    );
  }

  if (userRole === 'admin') {
    return (
      <div style={{ paddingTop: 20 }}>
        <AdminDashboard userName={userName} onLogout={handleLogout} />
      </div>
    );
  }

  // Fallback for unknown role
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'Inter, sans-serif',
      gap: '20px'
    }}>
      <h2>Welcome, {userName}</h2>
      <p>Role: {userRole}</p>
      <button 
        onClick={handleLogout}
        style={{
          padding: '10px 20px',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
