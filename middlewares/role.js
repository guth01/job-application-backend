const Job = require('../models/job');

// Generic middleware factory to check for required roles
const requireRole = (allowedRoles) => {
  // Convert single role to an array if needed
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      return next();
    }
    res.status(403).json({
      status: 'error',
      message: `Forbidden: This action requires one of the following roles: ${roles.join(', ')}.`
    });
  };
};

// Middleware to check if the logged-in user is the owner of a specific job
const checkJobOwnership = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ status: 'error', message: 'Job not found' });
    }

    // Using .equals() is the robust Mongoose way to compare an ObjectId with a string.
    if (!job.employerId.equals(req.user.userId)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: You are not authorized to modify this job.' });
    }

    // Attach the found job to the request to prevent another DB call in the controller
    req.job = job;
    next();
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = {
  requireApplicant: requireRole('applicant'),
  requireEmployer: requireRole('employer'),
  checkJobOwnership
};