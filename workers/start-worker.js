require('dotenv').config();
const emailWorker = require('./email_worker');

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('\nSIGTERM received, closing worker gracefully...');
  try {
    await emailWorker.close();
    console.log('Worker closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error closing worker:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received (Ctrl+C), closing worker gracefully...');
  try {
    await emailWorker.close();
    console.log('Worker closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error closing worker:', error);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('Worker process started. Press Ctrl+C to stop.');
