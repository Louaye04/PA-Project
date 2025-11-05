const { validationResult } = require('express-validator');
const authService = require('../services/auth.service');

/**
 * Signup Controller
 * Handles user registration
 */
exports.signup = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { name, email, password } = req.body;

    // Register user
    const result = await authService.registerUser(name, email, password);

    res.status(201).json({
      success: true,
      message: 'Account created successfully! You can now sign in.',
      user: result.user
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Login Controller
 * Handles user authentication
 */
exports.login = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Authenticate user
    const result = await authService.authenticateUser(email, password);

    // If MFA is required (future implementation)
    if (result.mfaRequired) {
      return res.status(200).json({
        success: true,
        mfaRequired: true,
        message: 'OTP sent to your email. Please verify to continue.',
        sessionId: result.sessionId
      });
    }

    // Successful login without MFA
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: result.token,
      user: result.user
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP Controller
 * Handles OTP verification for MFA (Future implementation)
 */
exports.verifyOTP = async (req, res, next) => {
  try {
    const { sessionId, otp } = req.body;

    if (!sessionId || !otp) {
      return res.status(400).json({ 
        error: 'Session ID and OTP are required' 
      });
    }

    // TODO: Implement OTP verification logic
    // This will be implemented when email service is integrated
    
    res.status(501).json({
      message: 'OTP verification will be implemented in the next phase',
      feature: 'Multi-Factor Authentication',
      status: 'Coming soon'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Resend OTP Controller
 * Handles OTP resend request (Future implementation)
 */
exports.resendOTP = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ 
        error: 'Session ID is required' 
      });
    }

    // TODO: Implement OTP resend logic
    
    res.status(501).json({
      message: 'OTP resend will be implemented in the next phase',
      feature: 'Multi-Factor Authentication',
      status: 'Coming soon'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Logout Controller
 * Handles user logout
 */
exports.logout = async (req, res, next) => {
  try {
    // TODO: Implement token blacklist or session invalidation
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    next(error);
  }
};
