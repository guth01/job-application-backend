const express = require('express');
const { body } = require('express-validator');
const applicationController = require('../controllers/application');
const { authenticateToken } = require('../middlewares/auth');
const { requireApplicant, requireEmployer } = require('../middlewares/role');

const router = express.Router();

// Validation rules for applying to a job
const applyValidationRules = [
  body('coverLetter')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Cover letter cannot exceed 5000 characters')
];

// Validation rules for updating application status
const updateStatusValidationRules = [
  body('status')
    .optional()
    .trim()
    .isIn(['reviewed', 'shortlisted', 'interview', 'rejected', 'hired'])
    .withMessage('Invalid application status'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Notes cannot exceed 5000 characters')
];

// Applicant routes
router.post('/:jobId/apply', authenticateToken, requireApplicant, applyValidationRules, applicationController.applyToJob);
router.get('/', authenticateToken, requireApplicant, applicationController.getAppliedJobs);

// Employer routes
router.get('/job/:jobId', authenticateToken, requireEmployer, applicationController.getApplicationsForJob);
router.patch('/:id', authenticateToken, requireEmployer, updateStatusValidationRules, applicationController.updateApplicationStatus);

// Common routes
router.get('/:id', authenticateToken, applicationController.getApplicationById);


module.exports = router;