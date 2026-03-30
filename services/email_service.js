const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  /**
   * Send application notification to employer
   * @param {string} employerEmail - Employer's email address
   * @param {string} jobTitle - Job title
   * @param {string} applicantName - Applicant's full name
   */
  async sendApplicationNotification(employerEmail, jobTitle, applicantName) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: employerEmail,
      subject: `New Application for ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">New Job Application Received</h2>
          <p>You have received a new application for the position:</p>
          <p style="font-size: 18px; font-weight: bold; color: #3498db;">${jobTitle}</p>
          <p><strong>Applicant:</strong> ${applicantName}</p>
          <p>Please log in to your dashboard to review the application details and resume.</p>
          <hr style="border: 1px solid #ecf0f1; margin: 20px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">This is an automated notification from your Job Application System.</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Application notification email sent to ${employerEmail}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending application notification email:', error);
      throw error;
    }
  }

  /**
   * Send application confirmation to applicant
   * @param {string} applicantEmail - Applicant's email address
   * @param {string} jobTitle - Job title
   * @param {string} companyName - Company name
   */
  async sendApplicationConfirmation(applicantEmail, jobTitle, companyName) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: applicantEmail,
      subject: `Application Submitted: ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #27ae60;">Application Submitted Successfully! ✓</h2>
          <p>Your application has been submitted successfully.</p>
          <p><strong>Position:</strong> ${jobTitle}</p>
          <p><strong>Company:</strong> ${companyName}</p>
          <p>The employer will review your application and get back to you soon.</p>
          <p style="margin-top: 20px;">Good luck with your application!</p>
          <hr style="border: 1px solid #ecf0f1; margin: 20px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">This is an automated confirmation from your Job Application System.</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Application confirmation email sent to ${applicantEmail}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending application confirmation email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
