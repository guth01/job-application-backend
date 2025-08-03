const { validationResult } = require('express-validator');
const Job = require('../models/job');
const User = require('../models/user');

class JobController {

  // @desc    Create a new job
  // @route   POST /api/jobs
  // @access  Private (Employer)
  async createJob(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { title, description, company, location, salary, jobType, experienceLevel, skillsRequired, applicationDeadline } = req.body;

      // The employer's user ID is attached by the auth middleware
      const employerId = req.user.userId;

      // Get employer's company name from their profile if not provided in the request
      let companyName = company;
      if (!companyName) {
        const employer = await User.findById(employerId).select('companyName');
        if (employer && employer.companyName) {
          companyName = employer.companyName;
        } else {
          return res.status(400).json({
            status: 'error',
            message: 'Company name is required. Please provide it in the request or update your profile.'
          });
        }
      }

      const job = new Job({
        title,
        description,
        company: companyName,
        location,
        salary,
        jobType,
        experienceLevel,
        skillsRequired,
        applicationDeadline,
        employerId
      });

      await job.save();

      res.status(201).json({
        status: 'success',
        message: 'Job created successfully',
        data: job
      });

    } catch (error) {
      console.error('Create job error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // @desc    Get all active jobs with filtering and pagination
  // @route   GET /api/jobs
  // @access  Public
  async getAllJobs(req, res) {
    try {
      const { search, location, jobType, experienceLevel, minSalary, maxSalary } = req.query;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const skip = (page - 1) * limit;

      let query = {
        isActive: true,
        applicationDeadline: { $gte: new Date() } // Only show jobs that are not past their deadline
      };

      if (search) query.$text = { $search: search };
      if (location) query.location = { $regex: new RegExp(location, 'i') };
      if (jobType) query.jobType = jobType;
      if (experienceLevel) query.experienceLevel = experienceLevel;
      
      if (minSalary || maxSalary) {
        query.salary = {};
        if (minSalary) query.salary.$gte = Number(minSalary);
        if (maxSalary) query.salary.$lte = Number(maxSalary);
      }

      const jobs = await Job.find(query)
        .populate('employerId', 'companyName profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalJobs = await Job.countDocuments(query);

      res.status(200).json({
        status: 'success',
        results: jobs.length,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalJobs / limit),
          totalJobs
        },
        data: jobs
      });

    } catch (error) {
      console.error('Get all jobs error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // @desc    Get a single job by ID
  // @route   GET /api/jobs/:id
  // @access  Public
  async getJobById(req, res) {
    try {
      const job = await Job.findById(req.params.id)
        .populate('employerId', 'companyName profilePicture website');

      if (!job || !job.isActive) {
        return res.status(404).json({
          status: 'error',
          message: 'Job not found or is no longer active'
        });
      }

      res.status(200).json({
        status: 'success',
        data: job
      });

    } catch (error) {
      console.error('Get job by ID error:', error);
      if (error.kind === 'ObjectId') {
        return res.status(404).json({ status: 'error', message: 'Job not found' });
      }
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // @desc    Update a job
  // @route   PUT /api/jobs/:id
  // @access  Private (Employer)
  async updateJob(req, res) {
    try {
      // The ownership check and job retrieval are handled by the `checkJobOwnership` middleware.
      // The job document is attached to req.job, preventing a redundant database call.
      const job = req.job;
      Object.assign(job, req.body);
      const updatedJob = await job.save();

      res.status(200).json({
        status: 'success',
        message: 'Job updated successfully',
        data: updatedJob
      });

    } catch (error) {
      console.error('Update job error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }

  // @desc    Delete a job
  // @route   DELETE /api/jobs/:id
  // @access  Private (Employer)
  async deleteJob(req, res) {
    try {
      // The ownership check and job retrieval are handled by the `checkJobOwnership` middleware.
      // We use the attached req.job to perform the deletion, preventing a redundant database call.

      await req.job.deleteOne();

      res.status(200).json({ status: 'success', message: 'Job deleted successfully' });

    } catch (error) {
      console.error('Delete job error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }

  // @desc    Get all jobs posted by the logged-in employer
  // @route   GET /api/jobs/my-jobs
  // @access  Private (Employer)
  async getJobsByEmployer(req, res) {
    try {
      const jobs = await Job.find({ employerId: req.user.userId }).sort({ createdAt: -1 });

      res.status(200).json({
        status: 'success',
        results: jobs.length,
        data: jobs
      });

    } catch (error) {
      console.error('Get jobs by employer error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new JobController();