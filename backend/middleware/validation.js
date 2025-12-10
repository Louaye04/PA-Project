const { body } = require("express-validator");

/**
 * Signup Validation Rules
 */
exports.signupValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters long"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),

  // Optional roles validation - if provided, must be valid array
  body("roles")
    .optional()
    .custom((roles) => {
      // Allow null/undefined
      if (!roles) return true;

      // Must be an array
      if (!Array.isArray(roles)) {
        throw new Error("Roles must be an array");
      }

      // Allow empty array (controller handles default)
      if (roles.length === 0) return true;

      // Validate each role
      const allowed = ["admin", "buyer", "seller", "user"];
      const allValid = roles.every((r) => allowed.includes(r));

      if (!allValid) {
        throw new Error("Invalid role selected");
      }
      return true;
    }),

  // Optional single role for backward compatibility
  body("role")
    .optional()
    .isIn(["admin", "buyer", "seller", "user"])
    .withMessage("Role must be one of admin, buyer, seller, or user"),
];

/**
 * Login Validation Rules
 */
exports.loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  // Role is optional on login - user can select it later
  body("role")
    .optional()
    .isIn(["admin", "buyer", "seller", "user"])
    .withMessage("Role must be one of admin, buyer, seller or user"),
];

/**
 * Email OTP Validation Rules
 */
exports.otpValidation = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email"),

  body("otp")
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must contain only numbers"),

  body("sessionId")
    .optional()
    .isString()
    .withMessage("Session ID must be a string"),

  // Optional selected role for multi-role users
  body("selectedRole")
    .optional()
    .isIn(["admin", "buyer", "seller", "user"])
    .withMessage("Selected role must be one of admin, buyer, seller or user"),
];
