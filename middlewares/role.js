// Middleware to check if user has required role
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Convert single role to array
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Specific role middleware functions
const requireApplicant = requireRole('applicant');
const requireEmployer = requireRole('employer');
const requireAny = requireRole(['applicant', 'employer']);

// Middleware to check if user is accessing their own resources
const requireOwnership = (req, res, next) => {
  const resourceUserId = req.params.userId || req.body.userId;
  
  if (!resourceUserId) {
    return next(); // No specific user resource being accessed
  }

  if (req.user.userId.toString() !== resourceUserId.toString()) {
    return res.status(403).json({
      status: 'error',
      message: 'You can only access your own resources'
    });
  }

  next();
};

// Middleware to check if user can access resource (owner or admin)
const requireOwnershipOrAdmin = (req, res, next) => {
  const resourceUserId = req.params.userId || req.body.userId;
  
  if (!resourceUserId) {
    return next(); // No specific user resource being accessed
  }

  // Allow access if user is accessing their own resources
  if (req.user.userId.toString() === resourceUserId.toString()) {
    return next();
  }

  // For future admin functionality
  if (req.user.role === 'admin') {
    return next();
  }

  return res.status(403).json({
    status: 'error',
    message: 'You can only access your own resources'
  });
};

module.exports = {
  requireRole,
  requireApplicant,
  requireEmployer,
  requireAny,
  requireOwnership,
  requireOwnershipOrAdmin
};