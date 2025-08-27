const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job is required']
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Applicant is required']
  },
  coverLetter: {
    type: String,
    maxlength: [5000, 'Cover letter cannot exceed 5000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'interview', 'rejected', 'hired'],
    default: 'pending'
  },
  // This can be used by employers to leave notes about the application
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for performance
applicationSchema.index({ job: 1 });
applicationSchema.index({ applicant: 1 });
applicationSchema.index({ status: 1 });
// Compound index to prevent duplicate applications
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });


module.exports = mongoose.model('Application', applicationSchema);