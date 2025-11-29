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
    .withMessage("Name must be at least 2 characters long")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name can only contain letters and spaces"),

  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  // Role should be provided at signup and must be one of the allowed values
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["admin", "buyer", "seller", "user"])
    .withMessage("Role must be one of admin, buyer, seller or user"),
  /* ============================================
     COMMENTED OUT - OLD MFA BIRTH CITY VALIDATION
     ============================================
  // Birth city required for MFA secret question
  ,
  body('birthCity')
    .notEmpty()
    .withMessage('Ville de naissance est requise')
    .isLength({ min: 2 })
    .withMessage('Ville de naissance invalide')
  ============================================ */
];

/**
 * Login Validation Rules
 */
exports.loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  // Role may be provided on login (we'll validate it if present)
  // Accept role as either a string or a small object like { role: 'buyer' } or { value: 'buyer' }
  body("role")
    .optional()
    .custom((val, { req }) => {
      // Prefer the raw value from req.body in case express-validator coerced it
      const raw = req && req.body ? req.body.role : val;
      const allowed = ["admin", "buyer", "seller", "user"];

      if (typeof raw === "string") {
        return allowed.includes(raw);
      }

      if (typeof raw === "object" && raw !== null) {
        const extracted = raw.role || raw.value || raw.name;
        return typeof extracted === "string" && allowed.includes(extracted);
      }

      return false;
    })
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
];
