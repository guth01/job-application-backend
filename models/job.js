const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    maxlength: [5000, 'Job description cannot exceed 5000 characters']
  },
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  salary: {
    // Consider making this an object with min, max, currency, and period for more detail
    type: Number,
    min: [0, 'Salary must be a positive number']
  },
  jobType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'],
    default: 'Full-time'
  },
  experienceLevel: {
    type: String,
    enum: ['Internship', 'Entry-level', 'Associate', 'Mid-senior level', 'Director', 'Executive']
  },
  skillsRequired: [{
    type: String,
    trim: true
  }],
  applicationDeadline: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
jobSchema.index({ employerId: 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ isActive: 1, applicationDeadline: 1 });
// For text search capabilities
jobSchema.index({ title: 'text', description: 'text', company: 'text' });

module.exports = mongoose.model('Job', jobSchema);