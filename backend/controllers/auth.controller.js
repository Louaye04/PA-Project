const { validationResult } = require("express-validator");
const authService = require("../services/auth.service");

/**
 * Signup Controller
 * Handles user registration with Email OTP verification
 * Step 1: Register user and send OTP email
 */
exports.signup = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { name, email, password, role, birthCity } = req.body;

    // Log removed

    // Register user (persist role) - user is not fully activated yet
    const result = await authService.registerUser(
      name,
      email,
      password,
      role,
      birthCity
    );

    // Send OTP email for verification
    const ipAddress = req.ip || req.connection.remoteAddress;
    const otpResult = await authService.sendSignupOTP(email, name, ipAddress);

    res.status(201).json({
      success: true,
      message: "Account created! Please verify your email with the code sent.",
      requiresOTP: true,
      sessionId: otpResult.sessionId,
      expiresIn: otpResult.expiresIn,
      canResendAt: otpResult.canResendAt,
      user: {
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login Controller
 * Handles user authentication with Email OTP verification
 * Step 1: Verify credentials and send OTP email
 */
exports.login = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    let { email, password, role: requestedRole } = req.body;

    // Defensive normalization: sometimes the client may send an object instead of a string
    // (e.g. due to incorrect onChange wiring). Try to coerce to a meaningful string.
    if (requestedRole && typeof requestedRole === "object") {
      // common shapes: { role: 'buyer' } or { value: 'buyer' }
      requestedRole =
        requestedRole.role ||
        requestedRole.value ||
        requestedRole.name ||
        JSON.stringify(requestedRole);
    }

    // Log removed

    // Authenticate user credentials (does NOT issue token yet)
    const result = await authService.authenticateUser(
      email,
      password,
      requestedRole
    );

    // Send OTP email for verification
    const ipAddress = req.ip || req.connection.remoteAddress;
    const otpResult = await authService.sendLoginOTP(
      email,
      result.user.name,
      ipAddress
    );

    // Return OTP requirement response
    res.status(200).json({
      success: true,
      requiresOTP: true,
      message:
        "Credentials verified. Please enter the code sent to your email.",
      sessionId: otpResult.sessionId,
      expiresIn: otpResult.expiresIn,
      canResendAt: otpResult.canResendAt,
      user: {
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Email OTP Controller
 * Handles OTP verification for both signup and login
 * Step 2: Verify OTP and issue JWT token
 */
exports.verifyOTP = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { email, otp, sessionId } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        error: "Email and OTP are required",
      });
    }

    // Verify OTP and issue JWT token
    const result = await authService.verifyEmailOTP(email, otp, sessionId);

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

/* ============================================
   COMMENTED OUT - OLD MFA/GOOGLE AUTHENTICATOR DEBUG
   ============================================
/**
 * Debug: Return provisioning secret for an email (DEV ONLY)
 *
exports.debugProvision = async (req, res, next) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ error: 'Email query parameter is required' });

    const user = require('../services/auth.service').getAllUsers().find(u => u.email.toLowerCase() === String(email).toLowerCase());
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // Return provisioning info (DEV ONLY)
    return res.status(200).json({
      email: user.email,
      provisioningSecret: user.totpSecret || null,
      provisioningUri: user.totpProvisioningUri || null,
      birthCity: user.birthCity || null
    });
  } catch (error) {
    next(error);
  }
};
============================================ */

/**
 * Resend Email OTP Controller
 * Handles OTP resend with rate limiting
 */
exports.resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    // Get user name for email
    const user = authService.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // Resend OTP
    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await authService.resendOTP(email, user.name, ipAddress);

    res.status(200).json({
      success: true,
      message: "New verification code sent",
      sessionId: result.sessionId,
      expiresIn: result.expiresIn,
      canResendAt: result.canResendAt,
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
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};
