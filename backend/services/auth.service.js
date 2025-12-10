const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const speakeasy = require("speakeasy");
const emailService = require("./email.service"); // NEW: Email OTP service

/**
 * Path to users database file
 */
const USERS_DB_PATH = path.join(__dirname, "../data/users.json");

/**
 * Default users (always available)
 */
const defaultUsers = [
  {
    id: 1,
    email: "admin@ecommerce.com",
    // Password: Admin@123
    password: "$2a$10$HJu1RP8eWoMbTRn0U.1lrOLgPkOIIBMkGIVAIb3oHe8A53OvSC9R2",
    name: "Admin User",
    role: "admin",
    mfaEnabled: false,
  },
  {
    id: 2,
    email: "user@example.com",
    // Password: User@123
    password: "$2a$10$aBR0ixMM/LGfa101nLVfzuK5fgDMltCTsHFpQ6ILOszmq6WxOgIVS",
    name: "John Doe",
    role: "buyer",
    mfaEnabled: false,
  },
];

/**
 * Load users from file or create with defaults
 */
const loadUsers = () => {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.dirname(USERS_DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Try to load existing users
    if (fs.existsSync(USERS_DB_PATH)) {
      const data = fs.readFileSync(USERS_DB_PATH, "utf8");
      const users = JSON.parse(data);
      // Log removed
      return users;
    }
  } catch (error) {
    // Log removed
  }

  // If file doesn't exist or there's an error, use defaults
  // Log removed
  saveUsers(defaultUsers);
  return [...defaultUsers];
};

/**
 * Save users to file
 */
const saveUsers = (users) => {
  try {
    const dataDir = path.dirname(USERS_DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(users, null, 2));
    // Log removed
  } catch (error) {
    // Log removed
  }
};

/**
 * Mock user database - now persisted!
 */
let mockUsers = loadUsers();

/**
 * Ensure the three required admin accounts exist and are the only admins.
 * This is a dev-only helper to enforce the application's requirement.
 */
const ensureRequiredAdmins = () => {
  const required = [
    { email: "hindkahla413@gmail.com", codename: "admin_413" },
    { email: "hindkahla663@gmail.com", codename: "admin_663" },
    { email: "hindkahla29@gmail.com", codename: "admin_29" },
  ];

  const adminPasswordPlain = "Hind@1977";
  const adminBirthCity = "Alger";

  // Demote any existing admin not in the required list
  mockUsers = mockUsers.map((u) => {
    if (String(u.role || "").toLowerCase() === "admin") {
      const emailLower = String(u.email || "").toLowerCase();
      const inRequired = required.some((r) => r.email === emailLower);
      if (!inRequired) {
        // demote to 'user' to ensure only required admins remain
        return { ...u, role: "user" };
      }
    }
    return u;
  });

  const adminSecrets = [];

  for (const r of required) {
    const emailLower = r.email.toLowerCase();
    let user = mockUsers.find(
      (u) => String(u.email || "").toLowerCase() === emailLower
    );
    if (!user) {
      // create new admin user with hashed password and generated TOTP secret
      const hashed = bcrypt.hashSync(adminPasswordPlain, 10);
      const secret = speakeasy.generateSecret({
        name: `BKH Shop (${r.email})`,
        length: 20,
      });
      user = {
        id: mockUsers.length + 1,
        email: emailLower,
        password: hashed,
        name: r.codename,
        role: "admin",
        mfaEnabled: true,
        totpSecret: secret.base32,
        totpProvisioningUri: secret.otpauth_url,
        birthCity: adminBirthCity,
        createdAt: new Date().toISOString(),
      };
      mockUsers.push(user);
    } else {
      // ensure properties are set/updated
      user.role = "admin";
      user.mfaEnabled = true;
      user.birthCity = adminBirthCity;
      if (!user.totpSecret) {
        const secret = speakeasy.generateSecret({
          name: `BKH Shop (${r.email})`,
          length: 20,
        });
        user.totpSecret = secret.base32;
        user.totpProvisioningUri = secret.otpauth_url;
      }
      if (!user.name) user.name = r.codename;
    }

    adminSecrets.push({
      email: user.email,
      codename: user.name,
      totpSecret: user.totpSecret,
      provisioningUri: user.totpProvisioningUri,
    });
  }

  // Persist changes to users file
  saveUsers(mockUsers);

  // Write a developer-only file with admin secrets for reprovisioning purposes
  try {
    const outPath = path.join(__dirname, "..", "data", "admin-secrets.json");
    fs.writeFileSync(outPath, JSON.stringify(adminSecrets, null, 2));
    // Log removed
  } catch (e) {
    // Log removed
  }
};

// Ensure required admins exist on startup
ensureRequiredAdmins();

// In-memory MFA session store: sessionId -> { email, created }
const mfaSessions = {};

// Cleanup helper (not automatic) — sessions older than 10 minutes considered expired
const MFA_SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

const getMfaSession = (sessionId) => {
  const s = mfaSessions[sessionId];
  if (!s) return null;
  if (Date.now() - s.created > MFA_SESSION_TTL_MS) {
    delete mfaSessions[sessionId];
    return null;
  }
  return s;
};

const clearMfaSession = (sessionId) => {
  delete mfaSessions[sessionId];
};

/**
 * Find user by email
 */
const findUserByEmail = (email) => {
  return mockUsers.find(
    (user) => user.email.toLowerCase() === email.toLowerCase()
  );
};

/**
 * Verify password
 */
const verifyPassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Generate JWT token
 * @param {Object} user - User object
 * @param {string} selectedRole - The role the user selected to use (optional, defaults to first role or 'buyer')
 */
const generateToken = (user, selectedRole = null) => {
  const userRoles = user.roles || (user.role ? [user.role] : ["buyer"]);

  // Determine active role: use selectedRole if valid, otherwise default to buyer or first role
  let activeRole = selectedRole;
  if (!activeRole || !userRoles.includes(activeRole)) {
    activeRole = userRoles.includes("buyer") ? "buyer" : userRoles[0];
  }

  const payload = {
    id: user.id,
    email: user.email,
    roles: userRoles, // All available roles
    role: activeRole, // Currently active role
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || "your_default_secret_key",
    { expiresIn: process.env.JWT_EXPIRE || "24h" }
  );
};

/**
 * Issue JWT token for a given user object and optional selectedRole
 */
exports.issueTokenForUser = (user, selectedRole = null) => {
  const token = generateToken(user, selectedRole);
  const { password: _, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
};

/**
 * Register User
 * Creates a new user account
 */
exports.registerUser = async (name, email, password, roles, birthCity) => {
  // Check if user already exists
  const existingUser = findUserByEmail(email);

  if (existingUser) {
    const error = new Error("An account with this email already exists");
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Validate provided roles array or default to ['buyer']
  const allowedRoles = ["admin", "buyer", "seller", "user"];
  let finalRoles = [];

  if (Array.isArray(roles) && roles.length > 0) {
    // Normalize and filter valid roles
    finalRoles = roles
      .map((r) => String(r).toLowerCase())
      .filter((r) => allowedRoles.includes(r));
  }

  // If no valid roles provided, default to ['buyer']
  if (finalRoles.length === 0) {
    finalRoles = ["buyer"];
  }

  // Store primary role (first in array) for backward compatibility
  const primaryRole = finalRoles[0];

  /* ============================================
     COMMENTED OUT - OLD MFA/GOOGLE AUTHENTICATOR
     ============================================
  // Generate TOTP secret for Google Authenticator (will be stored per-user)
  const secret = speakeasy.generateSecret({ name: `BKH Shop (${email})`, length: 20 });
  ============================================ */

  // Create new user
  const newUser = {
    id: mockUsers.length + 1,
    email: email.toLowerCase(),
    password: hashedPassword,
    name: name.trim(),
    roles: finalRoles, // NEW: Array of roles
    role: primaryRole, // Keep for backward compatibility
    /* ============================================
       COMMENTED OUT - OLD MFA/GOOGLE AUTHENTICATOR
       ============================================
    mfaEnabled: true,
    totpSecret: secret.base32,
    totpProvisioningUri: secret.otpauth_url,
    birthCity: String(birthCity || '').trim(),
    ============================================ */
    createdAt: new Date().toISOString(),
  };

  // Add user to mock database
  mockUsers.push(newUser);

  // Save to persistent storage
  saveUsers(mockUsers);

  // Return user data (without password)
  const { password: _, ...userWithoutPassword } = newUser;

  return {
    user: userWithoutPassword,
    /* ============================================
       COMMENTED OUT - OLD MFA/GOOGLE AUTHENTICATOR
       ============================================
    provisioningUri: newUser.totpProvisioningUri,
    provisioningSecret: newUser.totpSecret
    ============================================ */
  };
};

/* ============================================
   COMMENTED OUT - OLD MFA/GOOGLE AUTHENTICATOR VERIFICATION
   ============================================
/**
 * Verify MFA (TOTP + secret question)
 *
exports.verifyMFA = async (email, otp, birthCity) => {
  const user = findUserByEmail(email);
  if (!user) {
    const error = new Error('Utilisateur introuvable');
    error.statusCode = 404;
    throw error;
  }

  if (!user.mfaEnabled || !user.totpSecret) {
    const error = new Error('MFA non activé pour cet utilisateur');
    error.statusCode = 400;
    throw error;
  }

  // Verify birthCity (case-insensitive)
  if (!birthCity || String(birthCity).trim().toLowerCase() !== String(user.birthCity || '').trim().toLowerCase()) {
    const error = new Error('Réponse à la question secrète invalide');
    error.statusCode = 401;
    throw error;
  }

  // Verify TOTP
  // For development/debugging: allow a slightly larger window to tolerate device time drift
  // and log a minimal debug line to help troubleshoot invalid OTPs locally.
  const tokenToCheck = String(otp).trim();
  const valid = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: 'base32',
    token: tokenToCheck,
    window: 2
  });

  // Debug info (development only) — do not enable in production as it may leak sensitive info.
  try {
    const expected = speakeasy.totp({ secret: user.totpSecret, encoding: 'base32' });
    // Log removed
  } catch (e) {
    // Log removed
  }

  if (!valid) {
    const error = new Error('OTP invalide');
    error.statusCode = 401;
    throw error;
  }

  // Generate token
  const token = generateToken(user);
  const { password: _, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
};
============================================ */

/**
 * Authenticate User
 * Main authentication logic
 */
// Note: use a regular function (not arrow) so we have a proper arguments/parameters handling
exports.authenticateUser = async function (email, password, requestedRole) {
  // Find user
  const user = findUserByEmail(email);

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password);

  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // If a requested role is provided as a third parameter, verify user has this role
  // Accept either a string or a small object like { role: 'buyer' }
  if (requestedRole) {
    if (typeof requestedRole === "object" && requestedRole !== null) {
      requestedRole =
        requestedRole.role ||
        requestedRole.value ||
        requestedRole.name ||
        String(requestedRole);
    }
    const normalizedRequested = String(requestedRole).toLowerCase();

    // Get user's roles (support both old single role and new roles array)
    const userRoles = user.roles || (user.role ? [user.role] : []);

    // Check if user has the requested role
    if (!userRoles.includes(normalizedRequested)) {
      // Special handling for admin role
      if (normalizedRequested === "admin") {
        const error = new Error("E-mail ou mot de passe invalide");
        error.statusCode = 401; // Unauthorized (generic)
        throw error;
      }
      const error = new Error(`Cet utilisateur n'a pas accès à ce rôle`);
      error.statusCode = 403; // Forbidden
      throw error;
    }

    // If user is requesting admin access and the account is an admin, ensure it's one of the
    // first three admin accounts created (based on order in the users DB). Otherwise, deny
    // with a generic invalid credentials error to avoid info leaks.
    if (normalizedRequested === "admin" && user.role === "admin") {
      const adminEmails = mockUsers
        .filter((u) => String(u.role || "").toLowerCase() === "admin")
        .slice(0, 3)
        .map((u) => String(u.email || "").toLowerCase());

      if (!adminEmails.includes(String(user.email).toLowerCase())) {
        const error = new Error("E-mail ou mot de passe invalide");
        error.statusCode = 401;
        throw error;
      }
    }
  }

  /* ============================================
     COMMENTED OUT - OLD MFA/GOOGLE AUTHENTICATOR
     ============================================
  // Check if MFA is enabled (future implementation)
  if (user.mfaEnabled) {
    // Generate and send OTP
    const sessionId = generateMFASession(user);
    return {
      mfaRequired: true,
      sessionId: sessionId,
      message: 'MFA required: provide TOTP (Google Authenticator) and your birth city'
    };
  }
  ============================================ */

  // Generate token with selected role (if any)
  const token = generateToken(user, requestedRole);

  // Return user data (without password)
  const { password: _, ...userWithoutPassword } = user;

  return {
    token,
    user: userWithoutPassword,
    mfaRequired: false,
  };
};

/**
 * Generate MFA Session
 * Creates a temporary session for MFA verification (Future implementation)
 */
const generateMFASession = (user) => {
  // TODO: Implement proper MFA session management
  // This should store session data temporarily (Redis, Memory cache, etc.)
  const sessionId = Buffer.from(`${user.id}-${Date.now()}`).toString("base64");
  mfaSessions[sessionId] = { email: user.email, created: Date.now() };
  return sessionId;
};

// Export helper accessors for controllers
exports.getMfaSession = getMfaSession;
exports.clearMfaSession = clearMfaSession;

/**
 * Hash Password (utility function for creating test users)
 */
exports.hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Verify Token
 * Validates JWT token (for protected routes)
 */
exports.verifyToken = (token) => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || "your_default_secret_key"
    );
  } catch (error) {
    const err = new Error("Invalid or expired token");
    err.statusCode = 401;
    throw err;
  }
};

/**
 * Reset Database to defaults (utility function)
 */
exports.resetDatabase = () => {
  mockUsers = [...defaultUsers];
  saveUsers(mockUsers);
  // Log removed
  return mockUsers.length;
};

/**
 * Get all users (for debugging - remove in production)
 */
exports.getAllUsers = () => {
  return mockUsers.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  }));
};

/**
 * Verify Email OTP
 * Verifies the OTP sent to the user's email
 */
exports.verifyEmailOTP = async (email, otp) => {
  // For development, allow a fixed OTP for any request (remove in production!)
  if (process.env.NODE_ENV === "development") {
    // Log removed
    return true;
  }

  // In production, implement proper OTP verification logic
  const user = findUserByEmail(email);
  if (!user) {
    const error = new Error("Invalid email or OTP");
    error.statusCode = 401;
    throw error;
  }

  // TODO: Retrieve the actual OTP sent to the user (e.g., from a database or cache)
  const expectedOtp = "123456"; // Placeholder - replace with real implementation

  if (otp !== expectedOtp) {
    const error = new Error("Invalid email or OTP");
    error.statusCode = 401;
    throw error;
  }

  return true;
};

// ============================================
// NEW EMAIL OTP INTEGRATION METHODS
// ============================================

/**
 * Send OTP for Signup
 * Sends verification code to user's email during signup
 */
exports.sendSignupOTP = async (email, userName, ipAddress) => {
  try {
    const result = await emailService.sendOTPEmail(email, userName, ipAddress);
    return result;
  } catch (error) {
    // Log removed
    const err = new Error(error.message || "Failed to send verification code");
    err.statusCode = 500;
    throw err;
  }
};

/**
 * Send OTP for Login
 * Sends verification code to user's email during login
 */
exports.sendLoginOTP = async (email, userName, ipAddress) => {
  try {
    const result = await emailService.sendOTPEmail(email, userName, ipAddress);
    return result;
  } catch (error) {
    // Log removed
    const err = new Error(error.message || "Failed to send verification code");
    err.statusCode = 500;
    throw err;
  }
};

/**
 * Resend OTP
 * Resends verification code with rate limiting
 */
exports.resendOTP = async (email, userName, ipAddress) => {
  try {
    const result = await emailService.sendOTPEmail(email, userName, ipAddress);
    return result;
  } catch (error) {
    // Log removed
    const err = new Error(
      error.message || "Failed to resend verification code"
    );
    err.statusCode = 429; // Too Many Requests
    throw err;
  }
};

/**
 * Verify Email OTP and Issue Token
 * Verifies OTP and issues JWT token upon successful verification
 * @param {string} selectedRole - The role the user selected to use during login (optional)
 */
exports.verifyEmailOTP = async (email, otp, sessionId, selectedRole = null) => {
  try {
    // Verify OTP using email service
    const verificationResult = await emailService.verifyOTP(
      email,
      otp,
      sessionId
    );

    if (!verificationResult.success) {
      const error = new Error("OTP verification failed");
      error.statusCode = 401;
      throw error;
    }

    // Find user
    const user = findUserByEmail(email);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    // Generate JWT token with selected role
    const token = generateToken(user, selectedRole);

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
      verifiedAt: verificationResult.verifiedAt,
    };
  } catch (error) {
    // Log removed
    const err = new Error(error.message || "OTP verification failed");
    err.statusCode = error.statusCode || 401;
    throw err;
  }
};

/**
 * Get User by Email
 * Helper method to retrieve user data
 */
exports.getUserByEmail = (email) => {
  return findUserByEmail(email);
};
