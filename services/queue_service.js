const { Queue } = require('bullmq');

class QueueService {
  constructor() {
    // Redis connection configuration
    this.connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
    };

    // Create email queue
    this.emailQueue = new Queue('email-notifications', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000 // Start with 2 second delay, then 4s, 8s
        },
        removeOnComplete: true, // Remove successful jobs to save memory
        removeOnFail: false // Keep failed jobs for debugging
      }
    });

    console.log('Queue service initialized with Redis connection:', this.connection);
  }

  /**
   * Add job to send application notification to employer
   * @param {Object} data - Email data
   * @param {string} data.employerEmail - Employer's email
   * @param {string} data.jobTitle - Job title
   * @param {string} data.applicantName - Applicant's name
   */
  async sendApplicationNotification(data) {
    try {
      const job = await this.emailQueue.add('application-notification', {
        type: 'employer-notification',
        employerEmail: data.employerEmail,
        jobTitle: data.jobTitle,
        applicantName: data.applicantName,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Email job added to queue: ${job.id} (employer notification)`);
      return job;
    } catch (error) {
      console.error('Error adding employer notification job to queue:', error);
      throw error;
    }
  }

  /**
   * Add job to send confirmation to applicant
   * @param {Object} data - Email data
   * @param {string} data.applicantEmail - Applicant's email
   * @param {string} data.jobTitle - Job title
   * @param {string} data.companyName - Company name
   */
  async sendApplicationConfirmation(data) {
    try {
      const job = await this.emailQueue.add('application-confirmation', {
        type: 'applicant-confirmation',
        applicantEmail: data.applicantEmail,
        jobTitle: data.jobTitle,
        companyName: data.companyName,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Email job added to queue: ${job.id} (applicant confirmation)`);
      return job;
    } catch (error) {
      console.error('Error adding applicant confirmation job to queue:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   * @returns {Object} Queue stats (waiting, active, completed, failed)
   */
  async getQueueStats() {
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.emailQueue.getWaitingCount(),
        this.emailQueue.getActiveCount(),
        this.emailQueue.getCompletedCount(),
        this.emailQueue.getFailedCount()
      ]);

      return { waiting, active, completed, failed };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * Close queue connection
   */
  async close() {
    await this.emailQueue.close();
    console.log('Queue service closed');
  }
}

module.exports = new QueueService();
