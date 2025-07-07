const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directories if they don't exist
const createUploadDirs = () => {
  const dirs = [
    'uploads/resumes',
    'uploads/profile-pictures'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Initialize upload directories
createUploadDirs();

// Storage configuration for resumes
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/resumes/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = file.originalname.replace(ext, '').replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${req.user.userId}_${name}_${uniqueSuffix}${ext}`);
  }
});

// Storage configuration for profile pictures
const profilePictureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profile-pictures/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.userId}_profile_${uniqueSuffix}${ext}`);
  }
});

// File filter for resumes
const resumeFileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed for resumes'), false);
  }
};

// File filter for profile pictures
const profilePictureFileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed for profile pictures'), false);
  }
};

// Resume upload middleware
const uploadResume = multer({
  storage: resumeStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 1
  },
  fileFilter: resumeFileFilter
}).single('resume');

// Profile picture upload middleware
const uploadProfilePicture = multer({
  storage: profilePictureStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for profile pictures
    files: 1
  },
  fileFilter: profilePictureFileFilter
}).single('profilePicture');

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File size too large'
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        status: 'error',
        message: 'Unexpected file field'
      });
    }
    
    return res.status(400).json({
      status: 'error',
      message: 'File upload error: ' + err.message
    });
  }
  
  if (err) {
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
  
  next();
};

// Wrapper functions to handle errors
const resumeUpload = (req, res, next) => {
  uploadResume(req, res, (err) => {
    handleMulterError(err, req, res, next);
  });
};

const profilePictureUpload = (req, res, next) => {
  uploadProfilePicture(req, res, (err) => {
    handleMulterError(err, req, res, next);
  });
};

module.exports = {
  resumeUpload,
  profilePictureUpload,
  handleMulterError
};