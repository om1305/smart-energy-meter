const nodemailer = require('nodemailer');

// Create transporter using SMTP credentials from environment variables
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false // For development/testing only
    }
  });
};

/**
 * Send email notification
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} message - Email message content (HTML supported)
 * @param {string} from - Sender email (optional, defaults to SMTP_USER)
 * @returns {Promise<Object>} - Result object with success status and message
 */
const sendEmail = async (to, subject, message, from = null) => {
  try {
    // Validate required parameters
    if (!to || !subject || !message) {
      throw new Error('Missing required parameters: to, subject, and message are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error('Invalid email address format');
    }

    // Check if SMTP credentials are configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP credentials not configured. Please check your environment variables.');
    }

    const transporter = createTransporter();

    // Email options
    const mailOptions = {
      from: from || process.env.SMTP_USER,
      to: to,
      subject: subject,
      html: message, // Support HTML content
      text: message.replace(/<[^>]*>/g, '') // Fallback plain text version
    };

    // Send email
    const result = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully'
    };

  } catch (error) {
    console.error('Error sending email:', error.message);
    
    return {
      success: false,
      error: error.message,
      message: 'Failed to send email'
    };
  }
};

/**
 * Send email with template (for common notification types)
 * @param {string} to - Recipient email address
 * @param {string} type - Email type (alert, welcome, reset, etc.)
 * @param {Object} data - Data to populate template
 * @returns {Promise<Object>} - Result object with success status and message
 */
const sendTemplateEmail = async (to, type, data = {}) => {
  const templates = {
    alert: {
      subject: `Energy Alert - ${data.deviceName || 'Device'}`,
      message: `
        <h2>Energy Alert</h2>
        <p>An alert has been triggered for your energy meter:</p>
        <ul>
          <li><strong>Device:</strong> ${data.deviceName || 'Unknown'}</li>
          <li><strong>Alert Type:</strong> ${data.alertType || 'Unknown'}</li>
          <li><strong>Message:</strong> ${data.message || 'No additional details'}</li>
          <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p>Please check your energy meter dashboard for more details.</p>
      `
    },
    welcome: {
      subject: 'Welcome to Smart Energy Meter',
      message: `
        <h2>Welcome to Smart Energy Meter!</h2>
        <p>Your account has been successfully created.</p>
        <p>You can now monitor your energy consumption and receive smart insights.</p>
        <p>Thank you for choosing our service!</p>
      `
    },
    reset: {
      subject: 'Password Reset Request',
      message: `
        <h2>Password Reset</h2>
        <p>You have requested to reset your password.</p>
        <p>Your reset code is: <strong>${data.resetCode || 'N/A'}</strong></p>
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
      `
    }
  };

  const template = templates[type];
  if (!template) {
    throw new Error(`Email template '${type}' not found`);
  }

  return await sendEmail(to, template.subject, template.message);
};

module.exports = {
  sendEmail,
  sendTemplateEmail
};
