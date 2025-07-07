const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/user');
const { authenticateToken } = require('../middlewares/auth');
const { requireApplicant } = require('../middlewares/role');
const { resumeUpload, profilePictureUpload } = require('../middlewares/upload');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation rules for profile update
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid phone number'),
  body('experience')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Experience must be a non-negative integer'),
  body('skills')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        return value.every(skill => typeof skill === 'string' && skill.trim().length > 0);
      }
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      return false;
    })
    .withMessage('Skills must be a non-empty array of strings or a comma-separated string'),
  body('companyName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('companyDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Company description cannot exceed 500 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid URL')
];

// Validation rules for password change
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', updateProfileValidation, userController.updateProfile);
router.put('/change-password', changePasswordValidation, userController.changePassword);
router.put('/deactivate', userController.deactivateAccount);

// File upload routes
router.post('/upload-profile-picture', profilePictureUpload, userController.uploadProfilePicture);
router.delete('/profile-picture', userController.deleteProfilePicture);

// Resume routes (applicants only)
router.post('/upload-resume', requireApplicant, resumeUpload, userController.uploadResume);
router.delete('/resume', requireApplicant, userController.deleteResume);

module.exports = router;