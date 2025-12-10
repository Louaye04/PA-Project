const authService = require("../services/auth.service");

const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  if (req.query && req.query.token) {
    return req.query.token;
  }

  return null;
};

const requireToken = (token, res) => {
  if (!token) {
    res.status(401).json({ error: "No token provided. Authorization denied." });
    return null;
  }
  return token;
};

const buildUserRoles = (decoded) => {
  if (decoded.roles && Array.isArray(decoded.roles)) {
    return decoded.roles;
  }
  if (decoded.role) {
    return [decoded.role];
  }
  return [];
};

/**
 * Authentication Middleware
 * Protects routes by verifying JWT token
 */
exports.authenticate = async (req, res, next) => {
  try {
    const token = requireToken(extractToken(req), res);
    if (!token) return;

    const decoded = authService.verifyToken(token);
    req.user = decoded;
    req.userRoles = buildUserRoles(decoded);

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

    const hasRequiredRole = roles.some((role) => req.userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({
        error: "Access denied. Insufficient permissions.",
      });
    }

    next();
  };
};

/**
 * Verify Token Middleware - extracts user info from JWT
 */
exports.verifyToken = async (req, res, next) => {
  try {
    const token = requireToken(extractToken(req), res);
    if (!token) return;

    const decoded = authService.verifyToken(token);
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    req.userRoles = buildUserRoles(decoded);

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid token",
    });
  }
};

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

  const userRoles = req.userRoles || buildUserRoles(req.user);

  if (!userRoles.includes("admin")) {
    return res.status(403).json({
      error: "Access denied. Admin privileges required.",
    });
  }

  next();
};
