import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import './Login.scss';
import SellerDashboard from '../SellerDashboard/SellerDashboard';
import BuyerDashboard from '../BuyerDashboard/BuyerDashboard';
import AdminDashboard from '../AdminDashboard/AdminDashboard';

const Login = ({ onSwitchToSignup }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [userRole, setUserRole] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');

  // NEW: Email OTP state
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [canResendAt, setCanResendAt] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [hasHeroImage, setHasHeroImage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear message when user starts typing
    if (message.text) {
      setMessage({ type: '', text: '' });
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Send only email and password, let backend determine user role
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, formData);

      // NEW: Check if OTP verification is required
      if (response.data.requiresOTP) {
        setRequiresOTP(true);
        setSessionId(response.data.sessionId);
        setCanResendAt(response.data.canResendAt);
        setMessage({
          type: 'info',
          text: response.data.message || 'Verification code sent to your email'
        });
        setIsLoading(false);
        return;
      }

      // Fallback for backward compatibility (if OTP not yet implemented)
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }

      // Determine user display name (prefer provided name, then email)
      const name = response.data?.user?.name || response.data?.user?.email || formData.email;
      setUserName(name);
      // persist email/name for other components (used by admin fallback greeting)
      try {
        const emailForStore = response.data?.user?.email || formData.email;
        if (emailForStore) localStorage.setItem('userEmail', emailForStore);
        if (name) localStorage.setItem('userName', name);
      } catch (e) {
        // ignore storage errors
      }
      // determine role from server response
      const resolvedRole = response.data?.user?.role;
      setUserRole(resolvedRole);
      setIsLoggedIn(true);

      setMessage({
        type: 'success',
        text: response.data.message || 'Login successful!'
      });

      // Reset form after using formData
      setFormData({ email: '', password: '' });

      console.log('Login successful:', response.data);

    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response,
        code: error.code,
        config: error.config?.url
      });

      let errorMessage = 'An error occurred during login. Please try again.';

      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.error ||
          error.response.data?.message ||
          `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Cannot connect to server. Please check if the server is running.';
      } else {
        // Something else happened
        errorMessage = error.message || 'Unknown error occurred';
      }

      setMessage({
        type: 'error',
        text: errorMessage
      });

      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Handle OTP verification
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!otpCode || otpCode.length !== 6) {
      setMessage({
        type: 'error',
        text: 'Please enter a valid 6-digit code'
      });
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/verify-otp`, {
        email: formData.email,
        otp: otpCode,
        sessionId: sessionId
      });

      // Store token
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }

      // Set user data
      const name = response.data?.user?.name || response.data?.user?.email || formData.email;
      setUserName(name);

      try {
        const emailForStore = response.data?.user?.email || formData.email;
        if (emailForStore) localStorage.setItem('userEmail', emailForStore);
        if (name) localStorage.setItem('userName', name);
      } catch (e) {
        // ignore storage errors
      }

      const resolvedRole = response.data?.user?.role;
      setUserRole(resolvedRole);
      setIsLoggedIn(true);

      setMessage({
        type: 'success',
        text: 'Login successful!'
      });

      // Reset form and OTP state
      setFormData({ email: '', password: '' });
      setOtpCode('');
      setRequiresOTP(false);
      setSessionId('');

    } catch (error) {
      let errorMessage = 'Invalid verification code. Please try again.';

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setMessage({
        type: 'error',
        text: errorMessage
      });

      console.error('OTP verification error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Handle OTP resend
  const handleResendOTP = async () => {
    if (resendCooldown > 0) {
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/resend-otp`, {
        email: formData.email
      });

      setSessionId(response.data.sessionId);
      setCanResendAt(response.data.canResendAt);
      setOtpCode('');

      setMessage({
        type: 'success',
        text: 'New verification code sent!'
      });

    } catch (error) {
      let errorMessage = 'Failed to resend code. Please try again.';

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setMessage({
        type: 'error',
        text: errorMessage
      });

      console.error('OTP resend error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Resend cooldown timer
  useEffect(() => {
    if (!canResendAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((canResendAt - Date.now()) / 1000));
      setResendCooldown(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [canResendAt]);

  /* ============================================
     COMMENTED OUT - OLD MFA/GOOGLE AUTHENTICATOR HANDLER
     ============================================
  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const body = { otp: mfaOtp, birthCity: mfaBirthCity };
      if (mfaEmail) body.email = mfaEmail;
      if (mfaSessionId) body.sessionId = mfaSessionId;
      const resp = await axios.post(`${API_BASE_URL}/api/auth/verify-otp`, body);
      if (resp.data.token) {
        localStorage.setItem('authToken', resp.data.token);
      }
      const name = resp.data?.user?.name || mfaEmail;
      setUserName(name);
      try { if (resp.data?.user?.email) localStorage.setItem('userEmail', resp.data.user.email); if (name) localStorage.setItem('userName', name); } catch (e) { }
      setUserRole(resp.data?.user?.role);
      setIsLoggedIn(true);
      setMfaRequired(false);
      setMessage({ type: 'success', text: 'Authentication complete' });
    } catch (err) {
      let msg = 'MFA verification failed';
      if (err.response) msg = err.response.data?.error || err.response.data?.message || msg;
      setMessage({ type: 'error', text: msg });
    } finally {
      setIsLoading(false);
    }
  };
  ============================================ */

  // Try to preload a hero image placed in public folder (optional)
  useEffect(() => {
    const img = new Image();
    img.onload = () => setHasHeroImage(true);
    img.onerror = () => setHasHeroImage(false);
    img.src = '/interface-ecommerce.png';
  }, []);

  // Set page title depending on current view and user role
  useEffect(() => {
    if (isLoggedIn) {
      // choose role-specific dashboard title
      if (userRole === 'admin') {
        document.title = 'page dashboard-admin-BKH';
      } else if (userRole === 'buyer') {
        document.title = 'page dashboard-acheteur-BKH';
      } else if (userRole === 'seller') {
        document.title = 'page dashboard-vendeur-BKH';
      } else {
        document.title = 'page dashboard-BKH';
      }
    } else {
      document.title = 'page connexion-BKH';
    }
  }, [isLoggedIn, userRole]);

  if (isLoggedIn) {
    const resolvedRole = userRole;
    if (resolvedRole === 'seller') {
      return (
        <div style={{ paddingTop: 20 }}>
          <SellerDashboard userName={userName || 'Vendeur'} />
        </div>
      );
    }

    if (resolvedRole === 'buyer') {
      return (
        <div style={{ paddingTop: 20 }}>
          <BuyerDashboard userName={userName || 'Acheteur'} />
        </div>
      );
    }

    if (resolvedRole === 'admin') {
      return (
        <div style={{ paddingTop: 20 }}>
          <AdminDashboard userName={userName || 'Administrateur'} />
        </div>
      );
    }

    const welcomeClass = hasHeroImage ? 'welcome-screen has-image' : 'welcome-screen';
    const heroStyle = hasHeroImage ? { backgroundImage: "url('/interface-ecommerce.png')" } : undefined;
    const containerStyle = hasHeroImage ? { backgroundImage: "url('/interface-ecommerce.png')", backgroundSize: 'cover', backgroundPosition: 'center' } : undefined;

    return (
      <div className="login-container" style={containerStyle}>
        <div className={welcomeClass} style={heroStyle}>
          {/* professional logout placed top-right */}
          <button
            className="logout-top"
            onClick={() => { localStorage.removeItem('authToken'); localStorage.removeItem('userEmail'); localStorage.removeItem('userName'); setIsLoggedIn(false); setUserName(''); }}
            aria-label="Se déconnecter"
          >
            Se déconnecter
          </button>

          <div className="welcome-hero-inner">
            <div className="welcome-card">
              <h1 className="welcome-title">Bonjour {userName}</h1>
              <p className="welcome-sub">Découvrons nos sélections et promotions quotidiennes!</p>
            </div>
          </div>

          <div className="hero-overlays" aria-hidden="true">
            <svg className="icon shop" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 2L3 6v13a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6z" stroke="#fff" strokeWidth="1.2" /></svg>
            <svg className="icon cart" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6h15l-1.5 9h-12L6 6z" stroke="#fff" strokeWidth="1.2" /></svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          {/* logo removed from header; brand badge used in hero for professional placement */}
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to your account to continue</p>
        </div>

        {message.text && (
          <div
            className={`message-banner ${message.type}`}
            role="alert"
            aria-live="polite"
          >
            <svg
              className="message-icon"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              {message.type === 'success' ? (
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              )}
            </svg>
            <span>{message.text}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {/* ============================================
              COMMENTED OUT - OLD MFA/GOOGLE AUTHENTICATOR FORM
              ============================================
          {mfaRequired ? (
            <div className="mfa-form">
              <p>Deuxième étape : Entrez le code OTP (Google Authenticator) et votre ville de naissance.</p>
              <div className="form-group">
                <label className="form-label">OTP</label>
                <input type="text" name="mfaOtp" value={mfaOtp} onChange={(e) => setMfaOtp(e.target.value)} className="form-input" placeholder="123456" />
              </div>
              <div className="form-group">
                <label className="form-label">Ville de naissance</label>
                <input type="text" name="mfaBirthCity" value={mfaBirthCity} onChange={(e) => setMfaBirthCity(e.target.value)} className="form-input" placeholder="Ex: Alger" />
              </div>
              <div className="form-actions">
                <button type="button" className="btn" onClick={handleMfaSubmit} disabled={isLoading}>Vérifier</button>
                <button type="button" className="btn ghost" onClick={() => { setMfaRequired(false); setMfaOtp(''); setMfaBirthCity(''); }}>Annuler</button>
              </div>
            </div>
          ) : (
          ============================================ */}
          <>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <div className="input-wrapper">
                <svg
                  className="input-icon"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"
                  />
                  <path
                    d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"
                  />
                </svg>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && (
                <p className="error-message" id="email-error" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="input-wrapper">
                {/* Eye toggle to show/hide password (keeps visibility control, removes lock icon) */}
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10.58 10.58a3 3 0 004.24 4.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </button>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
              </div>
              {errors.password && (
                <p className="error-message" id="password-error" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Removed role selection - user role determined by backend */}

            {!requiresOTP && (
              <button
                type="submit"
                className="submit-button"
                disabled={isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="spinner"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="spinner-circle"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="spinner-path"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            )}
          </>
          {/* ============================================ */}
        </form>

        {/* NEW: Email OTP Verification Section */}
        {requiresOTP && (
          <div className="otp-section">
            <div className="otp-header">
              <div className="otp-icon">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2>Verify Your Email</h2>
              <p>We've sent a 6-digit code to <strong>{formData.email}</strong></p>
            </div>

            <form onSubmit={handleVerifyOTP} className="otp-form">
              <div className="form-group">
                <label htmlFor="otpCode" className="form-label">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="otpCode"
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpCode(value);
                  }}
                  className="form-input otp-input"
                  placeholder="000000"
                  maxLength="6"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={isLoading || otpCode.length !== 6}
                aria-busy={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify & Login'}
              </button>

              <div className="otp-actions">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  className="resend-button"
                  disabled={isLoading || resendCooldown > 0}
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend Code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRequiresOTP(false);
                    setOtpCode('');
                    setMessage({ type: '', text: '' });
                  }}
                  className="back-button"
                  disabled={isLoading}
                >
                  ← Back to Login
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="login-footer">
          <p className="signup-text">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToSignup}
              className="signup-link"
              type="button"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

// Ajout : fonction demo exécutable depuis la console du navigateur.
// Usage (dans la console du navigateur) : window.executeLoginDemo().then(console.log).catch(console.error);
if (typeof window !== 'undefined') {
  window.executeLoginDemo = async (overrideData) => {
    try {
      console.info('executeLoginDemo: démarrage de la démo de login...');
      const demoData = overrideData || {
        email: 'demo@example.com',
        password: 'password123'
      };

      // Envoi de la requête de login (utilise axios et API_BASE_URL importés dans ce module)
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, demoData);

      console.info('executeLoginDemo: réponse reçue', response.data);

      // Stocke le token si présent
      if (response.data?.token) {
        localStorage.setItem('authToken', response.data.token);
        console.info('executeLoginDemo: token stocké dans localStorage sous "authToken"');
      } else {
        console.info('executeLoginDemo: aucun token retourné par le serveur');
      }

      return response.data;
    } catch (err) {
      console.error('executeLoginDemo: erreur', err.response?.data || err.message || err);
      throw err;
    }
  };
}
