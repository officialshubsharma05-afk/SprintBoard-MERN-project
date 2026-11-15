const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication Middleware:
 * Verifies JWT token from Authorization header (Bearer <token>)
 * Attaches authenticated user object (without password) to req.user
 */
const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // Extract token from Bearer string
      token = authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized: Bearer token is missing',
        });
      }

      // Verify token
      const secret = process.env.JWT_SECRET || 'sprintboard_jwt_secret_key_change_in_production';
      const decoded = jwt.verify(token, secret);

      // Fetch user from DB excluding password
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized: User belonging to this token no longer exists',
        });
      }

      req.user = user;
      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expired: Please log in again',
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Not authorized: Invalid token provided',
      });
    }
  }

  // No Bearer token provided in headers
  return res.status(401).json({
    success: false,
    message: 'Not authorized: No token provided in Authorization header',
  });
};

module.exports = { protect };
