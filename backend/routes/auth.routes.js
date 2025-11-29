const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const {
  loginValidation,
  signupValidation,
} = require("../middleware/validation");

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post("/signup", signupValidation, authController.signup);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post("/login", loginValidation, authController.login);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP for multi-factor authentication (Future implementation)
 * @access  Public
 */
router.post(
  "/verify-otp",
  require("../middleware/validation").otpValidation,
  authController.verifyOTP
);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP code (Future implementation)
 * @access  Public
 */
router.post("/resend-otp", authController.resendOTP);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate token)
 * @access  Private
 */
router.post("/logout", authController.logout);

/* ============================================
   COMMENTED OUT - OLD MFA/GOOGLE AUTHENTICATOR DEBUG ROUTE
   ============================================
// DEV ONLY: return provisioning secret for a given email to allow reprovisioning in Authenticator
router.get('/debug-provision', authController.debugProvision);
============================================ */

module.exports = router;
