const authService = require("../services/auth.service");

/**
 * Authentication Middleware
 * Protects routes by verifying JWT token
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No token provided. Authorization denied.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = authService.verifyToken(token);

    // Attach user info to request
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid token. Authorization denied.",
    });
  }
};

/**
 * Role-based Authorization Middleware
 * Restricts access based on user role
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Access denied. Insufficient permissions.",
      });
    }

    next();
  };
};

/**
 * Verify JWT Token Middleware
 * Alternative name for authenticate
 */
exports.verifyToken = exports.authenticate;

/**
 * Admin-only Middleware
 * Restricts access to admin users only
 */
exports.requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
    });
  }

  const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);

  if (!userRoles.includes("admin")) {
    return res.status(403).json({
      error: "Access denied. Admin privileges required.",
    });
  }

  next();
};
