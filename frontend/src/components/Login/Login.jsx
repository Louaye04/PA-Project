import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import { useToast } from '../../contexts/ToastContext';
import './Login.scss';

const Login = ({ onSwitchToSignup, onLoginSuccess }) => {
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // (OTP removed) no OTP state

  // Role selection removed (backend determines role) and hero image preload removed to avoid unused-vars
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

      // Store token and user data when provided
      if (response.data.token) {
        try {
          localStorage.setItem('authToken', response.data.token);
          const emailForStore = response.data?.user?.email || formData.email;
          const name = response.data?.user?.name || response.data?.user?.email || formData.email;
          if (emailForStore) localStorage.setItem('userEmail', emailForStore);
          if (name) localStorage.setItem('userName', name);
        } catch (e) {}
      }

      setMessage({
        type: 'success',
        text: response.data.message || 'Login successful! Redirecting...'
      });

      // Reset form after using formData
      setFormData({ email: '', password: '' });

      console.log('Login successful:', response.data);
      toast.success('✅ Connexion réussie! Bienvenue.');

      // Navigate to dashboard after a short delay
      setTimeout(() => {
        if (onLoginSuccess) {
          console.log('Calling onLoginSuccess callback');
          onLoginSuccess();
        } else {
          console.warn('onLoginSuccess callback not provided - using fallback navigation');
          // Fallback navigation
          window.history.pushState({}, '', '/dashboard');
          window.location.reload();
        }
      }, 1000);

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
        if (error.response.data?.details && Array.isArray(error.response.data.details)) {
          // Show first validation error detail
          errorMessage = error.response.data.details[0]?.msg || error.response.data?.error;
        } else {
          errorMessage = error.response.data?.error ||
            error.response.data?.message ||
            `Server error: ${error.response.status}`;
        }
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

      toast.error(`❌ ${errorMessage}`);
      console.error('Login error:', error);
      if (error.response?.data?.details) {
        console.error('Validation details:', error.response.data.details);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // OTP removed: no handlers or timers required

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

  // (Removed optional hero image preload to satisfy CI linting rules)

  // Set page title
  useEffect(() => {
    document.title = 'page connexion-BKH';
  }, []);

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
          </>
          {/* ============================================ */}
        </form>

        {/* OTP removed */}

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
