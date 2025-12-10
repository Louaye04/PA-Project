const authService = require("../services/auth.service");

/**
 * Authentication Middleware
 * Protects routes by verifying JWT token
 */
exports.authenticate = async (req, res, next) => {
  try {
<<<<<<< HEAD
    let token = null;
    
    // Get token from header (priorité)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    // Si pas de header, essayer query param (pour SSE)
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      return res.status(401).json({ 
        error: 'No token provided. Authorization denied.' 
      });
    }

=======
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No token provided. Authorization denied.",
      });
    }

    const token = authHeader.split(" ")[1];

>>>>>>> 759a47eb324414a1b039db0442e8cb1cc0f42c2e
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
<<<<<<< HEAD
 * Verify Token Middleware - extrait l'userId du token JWT
 */
exports.verifyToken = async (req, res, next) => {
  try {
    let token = null;
    
    // Get token from header ou query param
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      return res.status(401).json({ 
        error: 'No token provided' 
      });
    }

    // Verify token et extraire userId
    const decoded = authService.verifyToken(token);
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Invalid token' 
    });
  }
=======
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
>>>>>>> 759a47eb324414a1b039db0442e8cb1cc0f42c2e
};
