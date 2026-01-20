import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import { useToast } from '../../contexts/ToastContext';
import './Signup.scss';

const Signup = ({ onSwitchToLogin }) => {
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  // default roles array - buyer is selected by default
  const [selectedRoles, setSelectedRoles] = useState(['buyer']);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // (OTP removed) No OTP state required

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
    if (selectedRoles.length === 0) {
      setErrors(prev => ({ ...prev, role: 'Please select at least one role' }));
      setShowRoleModal(true);
      return false;
    }
    setErrors(prev => ({ ...prev, role: '' }));
    return true;
  };

  // Handle role checkbox change
  const handleRoleChange = (roleValue) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleValue)) {
        // Remove role if already selected (but keep at least one)
        const newRoles = prev.filter(r => r !== roleValue);
        return newRoles.length > 0 ? newRoles : prev;
      } else {
        // Add role if not selected
        return [...prev, roleValue];
      }
    });
    // Clear role error when user makes selection
    if (errors.role) {
      setErrors(prev => ({ ...prev, role: '' }));
    }
  };

  // Confirm role selection from modal
  const confirmRoleSelection = () => {
    if (selectedRoles.length > 0) {
      setShowRoleModal(false);
      setErrors(prev => ({ ...prev, role: '' }));
    }
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
      // attach roles array to signup data
      signupData.roles = selectedRoles;

      console.log('Sending signup data:', signupData);
      console.log('Selected roles:', selectedRoles);

      const response = await axios.post(`${API_BASE_URL}/api/auth/signup`, signupData);

      // If backend returned a token, store it and redirect (auto-login)
      if (response.data.token) {
        try {
          localStorage.setItem('authToken', response.data.token);
          if (response.data.user?.email) localStorage.setItem('userEmail', response.data.user.email);
          if (response.data.user?.name) localStorage.setItem('userName', response.data.user.name);
        } catch (e) {}

        setMessage({ type: 'success', text: response.data.message || 'Account created and logged in.' });

        // Optionally switch to dashboard / login
        setTimeout(() => {
          if (onSwitchToLogin) onSwitchToLogin();
          else window.location.href = '/dashboard';
        }, 800);
      } else {
        setMessage({ type: 'success', text: response.data.message || 'Account created successfully!' });
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        setSelectedRoles(['buyer']);
      }

      console.log('Signup successful:', response.data);
      toast.success('✅ Inscription réussie! Vous pouvez vous connecter.');

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
      console.error('Signup error:', error);
      if (error.response?.data?.details) {
        console.error('Validation details:', error.response.data.details);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // OTP removed: no handlers required

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

          {/* Role selection - now as a button to open modal */}
          <div className="form-group">
            <label className="form-label">Votre rôle</label>
            <button
              type="button"
              className="role-selector-button"
              onClick={() => setShowRoleModal(true)}
            >
              <span className="role-display">
                {selectedRoles.length > 0
                  ? selectedRoles.map(r => r === 'buyer' ? 'Acheteur' : 'Vendeur').join(' + ')
                  : 'Sélectionner un rôle'}
              </span>
              <svg viewBox="0 0 20 20" fill="currentColor" className="role-chevron">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
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
        </form>

        {/* Role Selection Modal */}
        {showRoleModal && (
          <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="modal-close"
                onClick={() => setShowRoleModal(false)}
                aria-label="Close modal"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="modal-header">
                <div className="modal-icon">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="modal-title">Sélectionnez votre rôle</h2>
                <p className="modal-subtitle">Vous pouvez choisir les deux rôles si nécessaire</p>
              </div>

              <div className="modal-body">
                <div className="modal-role-options">
                  <label className="modal-role-option">
                    <input
                      type="checkbox"
                      value="buyer"
                      checked={selectedRoles.includes('buyer')}
                      onChange={() => handleRoleChange('buyer')}
                    />
                    <div className="role-card">
                      <div className="role-icon">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="role-info">
                        <h3>Acheteur</h3>
                        <p>Parcourir et acheter des produits</p>
                      </div>
                      <div className="role-checkmark">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </label>

                  <label className="modal-role-option">
                    <input
                      type="checkbox"
                      value="seller"
                      checked={selectedRoles.includes('seller')}
                      onChange={() => handleRoleChange('seller')}
                    />
                    <div className="role-card">
                      <div className="role-icon">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="role-info">
                        <h3>Vendeur</h3>
                        <p>Vendre et gérer vos produits</p>
                      </div>
                      <div className="role-checkmark">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="modal-btn-primary"
                  onClick={confirmRoleSelection}
                  disabled={selectedRoles.length === 0}
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* OTP removed: email verification modal disabled */}

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
