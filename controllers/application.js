const Application = require('../models/application');
const Job = require('../models/job');
const User = require('../models/user');

class ApplicationController {

  // @desc    Apply for a job
  // @route   POST /api/jobs/:jobId/apply
  // @access  Private (Applicant)
  async applyToJob(req, res) {
    try {
      const { coverLetter } = req.body;
      const applicantId = req.user.userId;
      const { jobId } = req.params;

      // Check if job exists and is active
      const job = await Job.findById(jobId);
      if (!job || !job.isActive) {
        return res.status(404).json({ status: 'error', message: 'Job not found or is no longer active' });
      }

      // Check if user is an applicant
      const applicant = await User.findById(applicantId);
      if (!applicant || applicant.role !== 'applicant') {
        return res.status(403).json({ status: 'error', message: 'Only applicants can apply for jobs' });
      }

      // Check if applicant has a resume
      if (!applicant.resume) {
        return res.status(400).json({ status: 'error', message: 'Please upload a resume before applying' });
      }

      // Check if user has already applied for this job
      const existingApplication = await Application.findOne({ job: jobId, applicant: applicantId });
      if (existingApplication) {
        return res.status(400).json({ status: 'error', message: 'You have already applied for this job' });
      }

      const application = new Application({
        job: jobId,
        applicant: applicantId,
        coverLetter
      });

      await application.save();

      res.status(201).json({
        status: 'success',
        message: 'Application submitted successfully',
        data: application
      });

    } catch (error) {
      console.error('Apply to job error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }

  // @desc    Get all applications for a specific job
  // @route   GET /api/applications/job/:jobId
  // @access  Private (Employer who posted the job)
  async getApplicationsForJob(req, res) {
    try {
      const { jobId } = req.params;
      const employerId = req.user.userId;

      // Check if the user is the owner of the job
      const job = await Job.findById(jobId);
      if (!job || job.employerId.toString() !== employerId.toString()) {
        return res.status(403).json({ status: 'error', message: 'You are not authorized to view applications for this job' });
      }

      const applications = await Application.find({ job: jobId })
        .populate('applicant', 'firstName lastName email skills experience resume');

      res.status(200).json({
        status: 'success',
        results: applications.length,
        data: applications
      });

    } catch (error) {
      console.error('Get applications for job error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }

  // @desc    Get a single application by ID
  // @route   GET /api/applications/:id
  // @access  Private (Applicant who applied or Employer who posted the job)
  async getApplicationById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      const application = await Application.findById(id)
        .populate('job', 'title company employerId') // Ensure employerId is populated
        .populate('applicant', 'firstName lastName email');

      if (!application) {
        return res.status(404).json({ status: 'error', message: 'Application not found' });
      }

      // Check for data integrity issues after populate
      if (!application.job || !application.applicant) {
        return res.status(404).json({
          status: 'error',
          message: 'Application data is incomplete. The associated job or applicant may have been deleted.'
        });
      }

      // Check if the user is authorized to view the application
      const isApplicant = userRole === 'applicant' && application.applicant._id.toString() === userId.toString();
      const isEmployer = userRole === 'employer' && application.job.employerId.toString() === userId.toString();

      if (!isApplicant && !isEmployer) {
        return res.status(403).json({ status: 'error', message: 'You are not authorized to view this application' });
      }

      res.status(200).json({
        status: 'success',
        data: application
      });

    } catch (error) {
      console.error('Get application by ID error:', error);
      if (error.kind === 'ObjectId') {
        return res.status(404).json({ status: 'error', message: 'Application not found' });
      }
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }

  // @desc    Update the status and/or add notes to an application
  // @route   PATCH /api/applications/:id
  // @access  Private (Employer who posted the job)
  async updateApplicationStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const employerId = req.user.userId;

      const application = await Application.findById(id).populate('job');

      if (!application) {
        return res.status(404).json({ status: 'error', message: 'Application not found' });
      }

      // Check for data integrity issues after populate
      if (!application.job) {
        return res.status(404).json({ 
          status: 'error', 
          message: 'Application data is incomplete. The associated job may have been deleted.' 
        });
      }

      // Check if the user is the owner of the job
      if (application.job.employerId.toString() !== employerId.toString()) {
        return res.status(403).json({ status: 'error', message: 'You are not authorized to update this application' });
      }

      // Update status if provided
      if (status) {
        const allowedStatusUpdates = ['reviewed', 'shortlisted', 'interview', 'rejected', 'hired'];
        if (!allowedStatusUpdates.includes(status)) {
          return res.status(400).json({ status: 'error', message: 'Invalid status update' });
        }
        application.status = status;
      }

      // Update notes if provided
      if (notes) {
        application.notes = notes;
      }

      await application.save();

      res.status(200).json({
        status: 'success',
        message: 'Application updated successfully',
        data: application
      });

    } catch (error) {
      console.error('Update application status error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }

  // @desc    Get all jobs a user has applied to
  // @route   GET /api/applications
  // @access  Private (Applicant)
  async getAppliedJobs(req, res) {
    try {
      const applicantId = req.user.userId;

      const applications = await Application.find({ applicant: applicantId })
        .populate('job', 'title company location jobType')
        .sort({ createdAt: -1 });

      res.status(200).json({
        status: 'success',
        results: applications.length,
        data: applications
      });

    } catch (error) {
      console.error('Get applied jobs error:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }
}

module.exports = new ApplicationController();