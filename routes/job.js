const express = require('express');
const { body } = require('express-validator');
const jobController = require('../controllers/job');
const { authenticateToken } = require('../middlewares/auth');
const { requireEmployer, checkJobOwnership } = require('../middlewares/role');

const router = express.Router();

// Validation rules for creating/updating a job
const jobValidationRules = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Job title must be between 3 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 20 })
    .withMessage('Description must be at least 20 characters long'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required'),
  body('salary')
    .optional()
    .isNumeric()
    .withMessage('Salary must be a number'),
  body('jobType')
    .optional()
    .isIn(['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'])
    .withMessage('Invalid job type'),
  body('experienceLevel')
    .optional()
    .isIn(['Internship', 'Entry-level', 'Associate', 'Mid-senior level', 'Director', 'Executive'])
    .withMessage('Invalid experience level'),
  body('skillsRequired')
    .optional()
    .isArray()
    .withMessage('Skills must be an array of strings'),
  body('applicationDeadline')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid date format for application deadline')
];

router.get('/', jobController.getAllJobs);
router.post('/', authenticateToken, requireEmployer, jobValidationRules, jobController.createJob);
router.get('/my-jobs', authenticateToken, requireEmployer, jobController.getJobsByEmployer);
router.get('/:id', jobController.getJobById);
router.put('/:id', authenticateToken, requireEmployer, checkJobOwnership, jobValidationRules, jobController.updateJob);
router.delete('/:id', authenticateToken, requireEmployer, checkJobOwnership, jobController.deleteJob);

module.exports = router;