const express = require('express');
const router = express.Router();
const { sendEmail, sendTemplateEmail } = require('../utils/emailService');
const { sendPushNotification, sendMulticastNotification } = require('../utils/fcmService');
const { 
  sendNotification, 
  sendEnergyAlert, 
  sendDeviceStatusNotification,
  sendWelcomeNotification 
} = require('../utils/notificationService');

// Test email notification
router.post('/test-email', async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'to, subject, and message are required'
      });
    }

    const result = await sendEmail(to, subject, message);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending email',
      error: error.message
    });
  }
});

// Test template email
router.post('/test-template-email', async (req, res) => {
  try {
    const { to, type, data } = req.body;

    if (!to || !type) {
      return res.status(400).json({
        success: false,
        message: 'to and type are required'
      });
    }

    const result = await sendTemplateEmail(to, type, data);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending template email',
      error: error.message
    });
  }
});

// Test push notification
router.post('/test-push', async (req, res) => {
  try {
    const { token, title, body, data } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'token, title, and body are required'
      });
    }

    const result = await sendPushNotification(token, title, body, data);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending push notification',
      error: error.message
    });
  }
});

// Test multicast push notification
router.post('/test-multicast-push', async (req, res) => {
  try {
    const { tokens, title, body, data } = req.body;

    if (!tokens || !Array.isArray(tokens) || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'tokens (array), title, and body are required'
      });
    }

    const result = await sendMulticastNotification(tokens, title, body, data);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending multicast push notification',
      error: error.message
    });
  }
});

// Test combined notification (email + push)
router.post('/test-combined', async (req, res) => {
  try {
    const { email, fcmToken, title, message, type, data } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'title and message are required'
      });
    }

    const result = await sendNotification({
      email,
      fcmToken,
      title,
      message,
      type,
      data,
      sendEmail: !!email,
      sendPush: !!fcmToken
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending combined notification',
      error: error.message
    });
  }
});

// Test energy alert notification
router.post('/test-energy-alert', async (req, res) => {
  try {
    const { email, fcmToken, deviceName, alertType, message, energyData } = req.body;

    if (!deviceName || !alertType || !message) {
      return res.status(400).json({
        success: false,
        message: 'deviceName, alertType, and message are required'
      });
    }

    const result = await sendEnergyAlert({
      email,
      fcmToken,
      deviceName,
      alertType,
      message,
      energyData
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending energy alert',
      error: error.message
    });
  }
});

// Test device status notification
router.post('/test-device-status', async (req, res) => {
  try {
    const { email, fcmToken, deviceName, status, message } = req.body;

    if (!deviceName || !status || !message) {
      return res.status(400).json({
        success: false,
        message: 'deviceName, status, and message are required'
      });
    }

    const result = await sendDeviceStatusNotification({
      email,
      fcmToken,
      deviceName,
      status,
      message
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending device status notification',
      error: error.message
    });
  }
});

// Test welcome notification
router.post('/test-welcome', async (req, res) => {
  try {
    const { email, fcmToken, userName } = req.body;

    if (!userName) {
      return res.status(400).json({
        success: false,
        message: 'userName is required'
      });
    }

    const result = await sendWelcomeNotification({
      email,
      fcmToken,
      userName
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending welcome notification',
      error: error.message
    });
  }
});

// Get notification service status
router.get('/status', (req, res) => {
  const status = {
    email: {
      configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      host: process.env.SMTP_HOST || 'Not configured',
      user: process.env.SMTP_USER || 'Not configured'
    },
    fcm: {
      configured: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      projectId: process.env.FIREBASE_PROJECT_ID || 'Not configured'
    }
  };

  res.json({
    success: true,
    message: 'Notification service status',
    status
  });
});

module.exports = router;
