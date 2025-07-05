const tokenService = require('../services/token_service');
const User = require('../models/user');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = tokenService.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token is required'
      });
    }

    // Verify token
    const decoded = tokenService.verifyAccessToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated'
      });
    }

    // Add user info to request
    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.message === 'Invalid access token') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired access token'
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during authentication'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = tokenService.extractTokenFromHeader(authHeader);

    if (!token) {
      return next();
    }

    // Verify token
    const decoded = tokenService.verifyAccessToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    if (user && user.isActive) {
      req.user = {
        userId: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      };
    }

    next();
  } catch (error) {
    // If token verification fails, just continue without setting user
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};