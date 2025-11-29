import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import './Signup.scss';

const Signup = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  // default role is empty — user must choose
  const [role, setRole] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // NEW: Email OTP state
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [canResendAt, setCanResendAt] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Set page title while on the signup page and restore previous title on unmount
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'page inscription-BKH';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  // Password strength checker
  const checkPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    return { strength, label: labels[strength] };
  };

  const passwordStrength = checkPasswordStrength(formData.password);

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

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
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and numbers';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    /* ============================================
       COMMENTED OUT - OLD MFA BIRTH CITY VALIDATION
       ============================================
    // Birth city validation
    if (!formData.birthCity || !formData.birthCity.trim()) {
      newErrors.birthCity = 'Ville de naissance est requise';
    } else if (formData.birthCity.trim().length < 2) {
      newErrors.birthCity = 'Ville de naissance invalide';
    }
    ============================================ */

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ============================================
     COMMENTED OUT - OLD MFA BIRTH CITY VALIDATION
     ============================================
  // Validate birth city presence
  useEffect(() => {
    if (formData.birthCity && errors.birthCity) {
      setErrors(prev => ({ ...prev, birthCity: '' }));
    }
  }, [formData.birthCity]);
  ============================================ */

  // Validate role selection for signup
  const validateRole = () => {
    if (!role) {
      setErrors(prev => ({ ...prev, role: 'Please select a role' }));
      return false;
    }
    setErrors(prev => ({ ...prev, role: '' }));
    return true;
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

    if (!validateForm() || !validateRole()) {
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { confirmPassword, ...signupData } = formData;
      // attach role to signup data
      signupData.role = role;

      const response = await axios.post(`${API_BASE_URL}/api/auth/signup`, signupData);

      // NEW: Check if OTP verification is required
      if (response.data.requiresOTP) {
        setRequiresOTP(true);
        setSessionId(response.data.sessionId);
        setCanResendAt(response.data.canResendAt);
        setMessage({
          type: 'info',
          text: response.data.message || 'Verification code sent to your email'
        });
      } else {
        // Fallback for backward compatibility
        setMessage({
          type: 'success',
          text: response.data.message || 'Account created successfully!'
        });

        // Reset form
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        setRole('');
      }

      console.log('Signup successful:', response.data);

    } catch (error) {
      console.error('Signup error details:', {
        message: error.message,
        response: error.response,
        code: error.code,
        config: error.config?.url
      });

      let errorMessage = 'An error occurred during signup. Please try again.';

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

      console.error('Signup error:', error);
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

      setMessage({
        type: 'success',
        text: 'Email verified successfully! You can now log in.'
      });

      // Reset all form data
      setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      setRole('');
      setOtpCode('');
      setRequiresOTP(false);
      setSessionId('');

      // Auto-switch to login after 2 seconds
      setTimeout(() => {
        if (onSwitchToLogin) onSwitchToLogin();
      }, 2000);

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

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-header">
          <h1 className="signup-title">Create Account</h1>
          <p className="signup-subtitle">Join us and start your journey today</p>
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

        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Full Name
            </label>
            <div className="input-wrapper">
              <svg
                className="input-icon"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="John Doe"
                autoComplete="name"
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
            </div>
            {errors.name && (
              <p className="error-message" id="name-error" role="alert">
                {errors.name}
              </p>
            )}
          </div>

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
              {/* password eye toggle (remove lock icon) */}
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(p => !p)}
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
                placeholder="Create a strong password"
                autoComplete="new-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error password-strength' : 'password-strength'}
              />
            </div>
            {formData.password && passwordStrength.strength > 0 && (
              <div className="password-strength" id="password-strength">
                <div className="strength-bars">
                  {[1, 2, 3, 4, 5].map((bar) => (
                    <div
                      key={bar}
                      className={`strength-bar ${bar <= passwordStrength.strength ? `active level-${passwordStrength.strength}` : ''
                        }`}
                    />
                  ))}
                </div>
                <span className={`strength-label level-${passwordStrength.strength}`}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
            {errors.password && (
              <p className="error-message" id="password-error" role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <div className="input-wrapper">
              {/* confirm password eye toggle */}
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirm(p => !p)}
                aria-label={showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showConfirm ? (
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
                type={showConfirm ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm your password"
                autoComplete="new-password"
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
            </div>
            {errors.confirmPassword && (
              <p className="error-message" id="confirmPassword-error" role="alert">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <div className="form-group role-group">
            <label className="form-label">Rôle</label>
            <div className="role-options">
              <label className="role-option">
                <input type="radio" name="role" value="buyer" checked={role === 'buyer'} onChange={() => setRole('buyer')} /> Acheteur
              </label>
              <label className="role-option">
                <input type="radio" name="role" value="seller" checked={role === 'seller'} onChange={() => setRole('seller')} /> Vendeur
              </label>
            </div>
            {errors.role && (
              <p className="error-message" role="alert">{errors.role}</p>
            )}
          </div>

          {/* ============================================
              COMMENTED OUT - OLD MFA BIRTH CITY FIELD
              ============================================
          <div className="form-group">
            <label htmlFor="birthCity" className="form-label">Ville de naissance</label>
            <div className="input-wrapper">
              <input
                type="text"
                id="birthCity"
                name="birthCity"
                value={formData.birthCity}
                onChange={handleChange}
                className={`form-input ${errors.birthCity ? 'error' : ''}`}
                placeholder="Ex: Alger"
                autoComplete="address-level2"
                aria-invalid={errors.birthCity ? 'true' : 'false'}
              />
            </div>
            {errors.birthCity && (
              <p className="error-message" role="alert">{errors.birthCity}</p>
            )}
          </div>
          ============================================ */}

          {/* Terms checkbox removed per request */}

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
                  <span>Creating account...</span>
                </>
              ) : (
                'Create Account'
              )}
            </button>
          )}
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
                {isLoading ? 'Verifying...' : 'Verify Email'}
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
                  ← Back to Signup
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="signup-footer">
          <p className="login-text">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="login-link"
              type="button"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>

      {/* security badge removed per request (no cadenas) */}

      {/* ============================================
          COMMENTED OUT - OLD MFA/GOOGLE AUTHENTICATOR MODAL
          ============================================
      {showProvisioning && (
        <div className="modal-overlay" onClick={() => setShowProvisioning(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowProvisioning(false)}
              aria-label="Close modal"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="modal-header">
              <div className="modal-icon">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="modal-title">Sécurisez votre compte</h2>
              <p className="modal-subtitle">Configurez l'authentification à deux facteurs</p>
            </div>

            <div className="modal-body">
              <div className="setup-steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h3>Téléchargez Google Authenticator</h3>
                    <p>Installez l'application depuis votre store</p>
                  </div>
                </div>

                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h3>Scannez le QR code</h3>
                    <p>Ou entrez la clé manuellement</p>
                  </div>
                </div>

                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h3>Utilisez les codes générés</h3>
                    <p>Lors de vos prochaines connexions</p>
                  </div>
                </div>
              </div>

              <div className="qr-section">
                {provisioningUri && (
                  <div className="qr-code-wrapper">
                    <img
                      alt="QR code pour authentification à deux facteurs"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(provisioningUri)}`}
                      className="qr-code-image"
                    />
                  </div>
                )}

                <div className="secret-section">
                  <label className="secret-label">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Clé secrète (saisie manuelle)
                  </label>
                  <div className="secret-code">
                    <code>{provisioningSecret || '—'}</code>
                    <button
                      className="copy-button"
                      onClick={() => {
                        navigator.clipboard.writeText(provisioningSecret);
                        setMessage({ type: 'success', text: 'Clé copiée!' });
                      }}
                      aria-label="Copier la clé"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <p className="secret-hint">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Conservez cette clé en lieu sûr pour récupération
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowProvisioning(false)}
              >
                Je configurerai plus tard
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowProvisioning(false);
                  if (onSwitchToLogin) onSwitchToLogin();
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Terminé, aller à la connexion
              </button>
            </div>
          </div>
        </div>
      )}
      ============================================ */}
    </div>
  );
};

export default Signup;
