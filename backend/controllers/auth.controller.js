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
      console.log("Signup validation failed:", errors.array());
      console.log("Request body:", req.body);
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { name, email, password, roles, role, birthCity } = req.body;

    console.log("Signup request - roles:", roles, "role:", role);

    // Register user (persist roles array or single role) - user is not fully activated yet
    // Support both new 'roles' array and old 'role' string for backward compatibility
    const userRoles = roles || (role ? [role] : ["buyer"]);
    const result = await authService.registerUser(
      name,
      email,
      password,
      userRoles,
      birthCity
    );

    // Directly issue token after signup (OTP removed)
    const issued = authService.issueTokenForUser(result.user);
    res.status(201).json({
      success: true,
      message: "Account created and logged in.",
      requiresOTP: false,
      token: issued.token,
      user: issued.user,
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
    // Issue token immediately after successful credential verification
    const issued = authService.issueTokenForUser(result.user, requestedRole);
    return res.status(200).json({
      success: true,
      requiresOTP: false,
      message: "Login successful",
      token: issued.token,
      user: issued.user,
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

    const { email, otp, sessionId, selectedRole } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        error: "Email and OTP are required",
      });
    }

    // OTP flow has been removed; respond with informative message
    return res.status(410).json({
      success: false,
      message: "OTP verification is disabled for this site.",
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

    // OTP flow removed — inform client
    return res.status(410).json({
      success: false,
      message: "OTP/resend is disabled on this site.",
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
