const { Worker } = require('bullmq');
const emailService = require('../services/email_service');

// Redis connection configuration
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
};

// Create worker to process email jobs
const emailWorker = new Worker('email-notifications', async (job) => {
  console.log(`Processing job ${job.id} of type ${job.name}`);

  try {
    if (job.name === 'application-notification') {
      // Send notification to employer
      await emailService.sendApplicationNotification(
        job.data.employerEmail,
        job.data.jobTitle,
        job.data.applicantName
      );
      console.log(`✓ Job ${job.id} completed: Employer notification sent`);
    } else if (job.name === 'application-confirmation') {
      // Send confirmation to applicant
      await emailService.sendApplicationConfirmation(
        job.data.applicantEmail,
        job.data.jobTitle,
        job.data.companyName
      );
      console.log(`✓ Job ${job.id} completed: Applicant confirmation sent`);
    } else {
      console.warn(`Unknown job type: ${job.name}`);
    }

    return { success: true, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error(`✗ Job ${job.id} failed:`, error.message);
    throw error; // BullMQ will retry based on job options
  }
}, {
  connection,
  concurrency: 5, // Process up to 5 jobs concurrently
});

// Event listeners
emailWorker.on('completed', (job) => {
  console.log(`[COMPLETED] Job ${job.id} has been completed successfully`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[FAILED] Job ${job.id} has failed with error: ${err.message}`);
  console.error(`Attempts made: ${job.attemptsMade}`);
});

emailWorker.on('error', (err) => {
  console.error('[ERROR] Worker error:', err);
});

emailWorker.on('active', (job) => {
  console.log(`[ACTIVE] Job ${job.id} is now being processed`);
});

console.log('========================================');
console.log('Email Worker Started');
console.log('========================================');
console.log('Connected to Redis:', connection);
console.log('Queue: email-notifications');
console.log('Concurrency: 5 jobs');
console.log('Listening for jobs...');
console.log('========================================');

module.exports = emailWorker;
