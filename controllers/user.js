const { validationResult } = require('express-validator');
const User = require('../models/user');
const fs = require('fs').promises;
const path = require('path');

class UserController {
  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId).select('-refreshTokens');
      
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            phone: user.phone,
            profilePicture: user.profilePicture,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            // Applicant specific fields
            ...(user.role === 'applicant' && {
              resume: user.resume,
              skills: user.skills,
              experience: user.experience
            }),
            // Employer specific fields
            ...(user.role === 'employer' && {
              companyName: user.companyName,
              companyDescription: user.companyDescription,
              website: user.website
            })
          }
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // Common fields that can be updated
      const allowedUpdates = ['firstName', 'lastName', 'phone'];
      
      // Role-specific fields
      if (user.role === 'applicant') {
        allowedUpdates.push('skills', 'experience');
      } else if (user.role === 'employer') {
        allowedUpdates.push('companyName', 'companyDescription', 'website');
      }

      // Update only allowed fields
      const updates = {};
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      // Special handling for skills array
      if (user.role === 'applicant' && req.body.skills) {
        updates.skills = Array.isArray(req.body.skills) 
          ? req.body.skills.filter(skill => skill.trim() !== '')
          : req.body.skills.split(',').map(skill => skill.trim()).filter(skill => skill !== '');
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        req.user.userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-refreshTokens');

      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: {
          user: {
            id: updatedUser._id,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            role: updatedUser.role,
            phone: updatedUser.phone,
            profilePicture: updatedUser.profilePicture,
            isEmailVerified: updatedUser.isEmailVerified,
            createdAt: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt,
            // Applicant specific fields
            ...(updatedUser.role === 'applicant' && {
              resume: updatedUser.resume,
              skills: updatedUser.skills,
              experience: updatedUser.experience
            }),
            // Employer specific fields
            ...(updatedUser.role === 'employer' && {
              companyName: updatedUser.companyName,
              companyDescription: updatedUser.companyDescription,
              website: updatedUser.website
            })
          }
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Upload profile picture
  async uploadProfilePicture(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No file uploaded'
        });
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // Delete old profile picture if exists
      if (user.profilePicture) {
        try {
          await fs.unlink(path.join(__dirname, '..', user.profilePicture));
        } catch (error) {
          console.log('Old profile picture not found or already deleted');
        }
      }

      // Update user with new profile picture path
      const profilePicturePath = `uploads/profile-pictures/${req.file.filename}`;
      user.profilePicture = profilePicturePath;
      await user.save();

      res.status(200).json({
        status: 'success',
        message: 'Profile picture uploaded successfully',
        data: {
          profilePicture: profilePicturePath
        }
      });
    } catch (error) {
      console.error('Upload profile picture error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Upload resume (applicants only)
  async uploadResume(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No file uploaded'
        });
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      if (user.role !== 'applicant') {
        return res.status(403).json({
          status: 'error',
          message: 'Only applicants can upload resumes'
        });
      }

      // Delete old resume if exists
      if (user.resume) {
        try {
          await fs.unlink(path.join(__dirname, '..', user.resume));
        } catch (error) {
          console.log('Old resume not found or already deleted');
        }
      }

      // Update user with new resume path
      const resumePath = `uploads/resumes/${req.file.filename}`;
      user.resume = resumePath;
      await user.save();

      res.status(200).json({
        status: 'success',
        message: 'Resume uploaded successfully',
        data: {
          resume: resumePath
        }
      });
    } catch (error) {
      console.error('Upload resume error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Delete profile picture
  async deleteProfilePicture(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      if (!user.profilePicture) {
        return res.status(400).json({
          status: 'error',
          message: 'No profile picture to delete'
        });
      }

      // Delete file from filesystem
      try {
        await fs.unlink(path.join(__dirname, '..', user.profilePicture));
      } catch (error) {
        console.log('Profile picture file not found or already deleted');
      }

      // Remove from database
      user.profilePicture = null;
      await user.save();

      res.status(200).json({
        status: 'success',
        message: 'Profile picture deleted successfully'
      });
    } catch (error) {
      console.error('Delete profile picture error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Delete resume (applicants only)
  async deleteResume(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      if (user.role !== 'applicant') {
        return res.status(403).json({
          status: 'error',
          message: 'Only applicants can delete resumes'
        });
      }

      if (!user.resume) {
        return res.status(400).json({
          status: 'error',
          message: 'No resume to delete'
        });
      }

      // Delete file from filesystem
      try {
        await fs.unlink(path.join(__dirname, '..', user.resume));
      } catch (error) {
        console.log('Resume file not found or already deleted');
      }

      // Remove from database
      user.resume = null;
      await user.save();

      res.status(200).json({
        status: 'success',
        message: 'Resume deleted successfully'
      });
    } catch (error) {
      console.error('Delete resume error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(req.user.userId).select('+password');
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          status: 'error',
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.status(200).json({
        status: 'success',
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Deactivate account
  async deactivateAccount(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // Deactivate user
      user.isActive = false;
      user.refreshTokens = []; // Clear all refresh tokens
      await user.save();

      res.status(200).json({
        status: 'success',
        message: 'Account deactivated successfully'
      });
    } catch (error) {
      console.error('Deactivate account error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new UserController();