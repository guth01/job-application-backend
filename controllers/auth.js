const { validationResult } = require('express-validator');
const User = require('../models/user');
const tokenService = require('../services/token_service');

class AuthController {
  // Register new user
  async register(req, res) {
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

      const { firstName, lastName, email, password, role, phone, companyName } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'User with this email already exists'
        });
      }

      // Create user object
      const userData = {
        firstName,
        lastName,
        email,
        password,
        role: role || 'applicant'
      };

      // Add optional fields
      if (phone) userData.phone = phone;
      if (role === 'employer' && companyName) userData.companyName = companyName;

      // Create new user
      const user = new User(userData);
      await user.save();

      // Generate tokens
      const tokenPayload = {
        userId: user._id,
        email: user.email,
        role: user.role
      };

      const { accessToken, refreshToken } = tokenService.generateTokens(tokenPayload);

      // Save refresh token to user
      await user.addRefreshToken(refreshToken);

      // Return success response
      res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            phone: user.phone,
            companyName: user.companyName,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt
          },
          accessToken,
          refreshToken
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error during registration'
      });
    }
  }

  // Login user
  async login(req, res) {
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

      const { email, password } = req.body;

      // Find user and include password for comparison
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid email or password'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          status: 'error',
          message: 'Account is deactivated. Please contact support.'
        });
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid email or password'
        });
      }

      // Clean expired tokens
      await user.cleanExpiredTokens();

      // Generate tokens
      const tokenPayload = {
        userId: user._id,
        email: user.email,
        role: user.role
      };

      const { accessToken, refreshToken } = tokenService.generateTokens(tokenPayload);

      // Save refresh token to user
      await user.addRefreshToken(refreshToken);

      // Return success response
      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            phone: user.phone,
            companyName: user.companyName,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt
          },
          accessToken,
          refreshToken
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error during login'
      });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          status: 'error',
          message: 'Refresh token is required'
        });
      }

      // Verify refresh token
      let decoded;
      try {
        decoded = tokenService.verifyRefreshToken(refreshToken);
      } catch (error) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid or expired refresh token'
        });
      }

      // Find user and check if refresh token exists
      const user = await User.findById(decoded.userId);
      if (!user || !user.refreshTokens.some(t => t.token === refreshToken)) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid refresh token'
        });
      }

      // Generate new access token
      const tokenPayload = {
        userId: user._id,
        email: user.email,
        role: user.role
      };

      const newAccessToken = tokenService.generateAccessToken(tokenPayload);

      res.status(200).json({
        status: 'success',
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken
        }
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error during token refresh'
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          status: 'error',
          message: 'Refresh token is required'
        });
      }

      // Get user ID from refresh token
      const payload = tokenService.getTokenPayload(refreshToken);
      if (!payload) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid refresh token'
        });
      }

      // Find user and remove refresh token
      const user = await User.findById(payload.userId);
      if (user) {
        await user.removeRefreshToken(refreshToken);
      }

      res.status(200).json({
        status: 'success',
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error during logout'
      });
    }
  }

  // Logout from all devices
  async logoutAll(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (user) {
        user.refreshTokens = [];
        await user.save();
      }

      res.status(200).json({
        status: 'success',
        message: 'Logged out from all devices successfully'
      });

    } catch (error) {
      console.error('Logout all error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error during logout'
      });
    }
  }
}

module.exports = new AuthController();