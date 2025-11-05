const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Mock user database
 * In production, this would be replaced with actual database queries
 */
let mockUsers = [
  {
    id: 1,
    email: 'admin@ecommerce.com',
    // Password: Admin@123
    password: '$2a$10$8yYzO7K.6EqV5Sy8wK/xCuJGFUxvHXZKGVxfN.qZ5rLQZI8qhzLWe',
    name: 'Admin User',
    role: 'admin',
    mfaEnabled: false
  },
  {
    id: 2,
    email: 'user@example.com',
    // Password: User@123
    password: '$2a$10$7nzHLXQF5EyPxvUQ9cJxCuVIqZFMZHG4Lh8QqYG9Y5k6KxLMN8Wny',
    name: 'John Doe',
    role: 'user',
    mfaEnabled: false
  }
];

/**
 * Find user by email
 */
const findUserByEmail = (email) => {
  return mockUsers.find(user => user.email.toLowerCase() === email.toLowerCase());
};

/**
 * Verify password
 */
const verifyPassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your_default_secret_key',
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

/**
 * Register User
 * Creates a new user account
 */
exports.registerUser = async (name, email, password) => {
  // Check if user already exists
  const existingUser = findUserByEmail(email);
  
  if (existingUser) {
    const error = new Error('An account with this email already exists');
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create new user
  const newUser = {
    id: mockUsers.length + 1,
    email: email.toLowerCase(),
    password: hashedPassword,
    name: name.trim(),
    role: 'user',
    mfaEnabled: false,
    createdAt: new Date().toISOString()
  };

  // Add user to mock database
  mockUsers.push(newUser);

  // Return user data (without password)
  const { password: _, ...userWithoutPassword } = newUser;

  return {
    user: userWithoutPassword
  };
};

/**
 * Authenticate User
 * Main authentication logic
 */
exports.authenticateUser = async (email, password) => {
  // Find user
  const user = findUserByEmail(email);
  
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password);
  
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Check if MFA is enabled (future implementation)
  if (user.mfaEnabled) {
    // Generate and send OTP
    const sessionId = generateMFASession(user);
    // await sendOTPEmail(user.email, otp);
    
    return {
      mfaRequired: true,
      sessionId: sessionId,
      message: 'OTP sent to your email'
    };
  }

  // Generate token
  const token = generateToken(user);

  // Return user data (without password)
  const { password: _, ...userWithoutPassword } = user;

  return {
    token,
    user: userWithoutPassword,
    mfaRequired: false
  };
};

/**
 * Generate MFA Session
 * Creates a temporary session for MFA verification (Future implementation)
 */
const generateMFASession = (user) => {
  // TODO: Implement proper MFA session management
  // This should store session data temporarily (Redis, Memory cache, etc.)
  const sessionId = Buffer.from(`${user.id}-${Date.now()}`).toString('base64');
  return sessionId;
};

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
    return jwt.verify(token, process.env.JWT_SECRET || 'your_default_secret_key');
  } catch (error) {
    const err = new Error('Invalid or expired token');
    err.statusCode = 401;
    throw err;
  }
};
