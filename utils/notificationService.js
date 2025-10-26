const { sendEmail, sendTemplateEmail } = require('./emailService');
const { 
  sendPushNotification, 
  sendMulticastNotification, 
  sendTopicNotification 
} = require('./fcmService');

/**
 * Send notification via both email and push notification
 * @param {Object} options - Notification options
 * @param {string} options.email - Recipient email address
 * @param {string|Array} options.fcmToken - FCM device token(s)
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} options.type - Notification type (alert, info, warning, etc.)
 * @param {Object} options.data - Additional data for push notification
 * @param {boolean} options.sendEmail - Whether to send email (default: true)
 * @param {boolean} options.sendPush - Whether to send push notification (default: true)
 * @returns {Promise<Object>} - Result object with success status and results
 */
const sendNotification = async (options) => {
  const {
    email,
    fcmToken,
    title,
    message,
    type = 'info',
    data = {},
    sendEmail: shouldSendEmail = true,
    sendPush: shouldSendPush = true
  } = options;

  const results = {
    email: null,
    push: null,
    success: false,
    errors: []
  };

  try {
    // Validate required parameters
    if (!title || !message) {
      throw new Error('title and message are required');
    }

    if (shouldSendEmail && !email) {
      throw new Error('email is required when sendEmail is true');
    }

    if (shouldSendPush && !fcmToken) {
      throw new Error('fcmToken is required when sendPush is true');
    }

    // Send email notification
    if (shouldSendEmail && email) {
      try {
        const emailResult = await sendTemplateEmail(email, type, {
          title,
          message,
          ...data
        });
        results.email = emailResult;
        
        if (!emailResult.success) {
          results.errors.push(`Email failed: ${emailResult.error}`);
        }
      } catch (error) {
        results.errors.push(`Email error: ${error.message}`);
        results.email = { success: false, error: error.message };
      }
    }

    // Send push notification
    if (shouldSendPush && fcmToken) {
      try {
        let pushResult;
        
        if (Array.isArray(fcmToken)) {
          // Multiple tokens - use multicast
          pushResult = await sendMulticastNotification(
            fcmToken, 
            title, 
            message, 
            { type, ...data }
          );
        } else {
          // Single token
          pushResult = await sendPushNotification(
            fcmToken, 
            title, 
            message, 
            { type, ...data }
          );
          
        }
        
        results.push = pushResult;
        
        if (!pushResult.success) {
          results.errors.push(`Push notification failed: ${pushResult.error}`);
        }
      } catch (error) {
        results.errors.push(`Push notification error: ${error.message}`);
        results.push = { success: false, error: error.message };
      }
      
    }

    // Determine overall success
    const emailSuccess = !shouldSendEmail || (results.email && results.email.success);
    const pushSuccess = !shouldSendPush || (results.push && results.push.success);
    
    results.success = emailSuccess && pushSuccess;

    return results;

  } catch (error) {
    console.error('Error in sendNotification:', error.message);
    results.errors.push(error.message);
    return results;
  }
};

/**
 * Send energy alert notification
 * @param {Object} options - Alert options
 * @param {string} options.email - User email
 * @param {string|Array} options.fcmToken - FCM token(s)
 * @param {string} options.deviceName - Device name
 * @param {string} options.alertType - Type of alert
 * @param {string} options.message - Alert message
 * @param {Object} options.energyData - Energy consumption data
 * @returns {Promise<Object>} - Result object
 */
const sendEnergyAlert = async (options) => {
  const {
    email,
    fcmToken,
    deviceName,
    alertType,
    message,
    energyData = {}
  } = options;

  const title = `Energy Alert - ${deviceName}`;
  const notificationMessage = `${alertType}: ${message}`;

      console.log("Sending email to:", email);


  return await sendNotification({
    email,
    fcmToken,
    title,
    message: notificationMessage,
    type: 'alert',
    data: {
      deviceName,
      alertType,
      energyData,
      timestamp: new Date().toISOString()
    },
    sendPush: !!fcmToken
  });
};

/**
 * Send device status notification
 * @param {Object} options - Status options
 * @param {string} options.email - User email
 * @param {string|Array} options.fcmToken - FCM token(s)
 * @param {string} options.deviceName - Device name
 * @param {string} options.status - Device status
 * @param {string} options.message - Status message
 * @returns {Promise<Object>} - Result object
 */
const sendDeviceStatusNotification = async (options) => {
  const {
    email,
    fcmToken,
    deviceName,
    status,
    message
  } = options;

  const title = `Device ${status} - ${deviceName}`;
  const notificationMessage = `${deviceName} is now ${status.toLowerCase()}. ${message}`;

  return await sendNotification({
    email,
    fcmToken,
    title,
    message: notificationMessage,
    type: 'info',
    data: {
      deviceName,
      status,
      timestamp: new Date().toISOString()
    }
    
  });
};

/**
 * Send energy consumption report
 * @param {Object} options - Report options
 * @param {string} options.email - User email
 * @param {string|Array} options.fcmToken - FCM token(s)
 * @param {Object} options.reportData - Report data
 * @returns {Promise<Object>} - Result object
 */
const sendEnergyReport = async (options) => {
  const {
    email,
    fcmToken,
    reportData = {}
  } = options;

  const title = 'Energy Consumption Report';
  const message = `Your energy consumption report is ready. Total usage: ${reportData.totalUsage || 'N/A'} kWh`;

  return await sendNotification({
    email,
    fcmToken,
    title,
    message,
    type: 'report',
    data: {
      reportData,
      timestamp: new Date().toISOString()
    }

  });
};

/**
 * Send welcome notification to new user
 * @param {Object} options - Welcome options
 * @param {string} options.email - User email
 * @param {string|Array} options.fcmToken - FCM token(s)
 * @param {string} options.userName - User name
 * @returns {Promise<Object>} - Result object
 */
const sendWelcomeNotification = async (options) => {
  const {
    email,
    fcmToken,
    userName
  } = options;

  const title = 'Welcome to Smart Energy Meter!';
  const message = `Welcome ${userName}! Your account has been set up successfully.`;

  return await sendNotification({
    email,
    fcmToken,
    title,
    message,
    type: 'welcome',
    data: {
      userName,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = {
  sendNotification,
  sendEnergyAlert,
  sendDeviceStatusNotification,
  sendEnergyReport,
  sendWelcomeNotification
};
