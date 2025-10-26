const { validationResult } = require("express-validator");
const Alert = require("../models/Alert");
const User = require("../models/User");
const Device = require("../models/Device");
const { sendEnergyAlert } = require("../utils/notificationService");

// @desc    Get user alerts
// @route   GET /api/alerts/:userId
// @access  Private
const getUserAlerts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, page = 1, isRead, severity } = req.query;

    const skip = (page - 1) * limit;
    let query = { userId };

    // Add filters
    if (isRead !== undefined) {
      query.isRead = isRead === "true";
    }
    if (severity) {
      query.severity = severity;
    }

    const alerts = await Alert.find(query)
      .populate('deviceId', 'name location')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Alert.countDocuments(query);

    res.json({
      success: true,
      count: alerts.length,
      total,
      alerts
    });
  } catch (error) {
    console.error("Get alerts error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// @desc    Create alert with notifications
// @route   POST /api/alerts/create
// @access  Private
const createAlert = async (req, res) => {
   console.log("Incoming alert data:", req.body); 
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { deviceId, message, alertType, severity, metadata } = req.body;

    // Create the alert
    const alert = await Alert.create({
      userId: req.user._id,
      deviceId,
      message,
      alertType,
      severity,
      metadata
    });
    console.log("Alert created successfully:", alert);


    // Populate alert with device info for notifications
    await alert.populate('deviceId', 'name location');

    // Send notifications if this is a high-priority alert
    if (severity === 'high' || severity === 'critical') {
      try {
        // Get user information for notifications
        const user = await User.findById(req.user._id).select('email fcmTokens');
        
        if (user) {
          const notificationResult = await sendEnergyAlert({
            email: user.email,
            fcmToken: user.fcmTokens, // Assuming fcmTokens is an array
            deviceName: alert.deviceId?.name || 'Unknown Device',
            alertType: alertType,
            message: message,
            energyData: {
              severity: severity,
              timestamp: alert.createdAt,
              metadata: metadata
            }
          });

          console.log('Alert notification sent:', notificationResult);
        }
      } catch (notificationError) {
        // Don't fail the alert creation if notification fails
        console.error('Failed to send alert notification:', notificationError.message);
      }
    }

    res.status(201).json({
      success: true,
      alert
    });
  } catch (error) {
    console.error("Create alert error:", error.message);
    console.error(error.stack);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// @desc    Create system alert (for device monitoring)
// @route   POST /api/alerts/system
// @access  Private
const createSystemAlert = async (req, res) => {
  try {
    const { deviceId, message, alertType, severity, metadata, userId } = req.body;

    // Validate required fields
    if (!deviceId || !message || !alertType || !severity) {
      return res.status(400).json({
        success: false,
        message: "deviceId, message, alertType, and severity are required"
      });
    }

    // Get device information
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    // Create alert for device owner
    const alert = await Alert.create({
      userId: userId || device.userId,
      deviceId,
      message,
      alertType,
      severity,
      metadata: {
        ...metadata,
        isSystemAlert: true,
        triggeredAt: new Date()
      }
    });

    // Populate alert with device info
    await alert.populate('deviceId', 'name location');

    // Send notifications
    try {
      const user = await User.findById(alert.userId).select('email fcmTokens');
      
      if (user) {
        const notificationResult = await sendEnergyAlert({
          email: user.email,
          fcmToken: user.fcmTokens,
          deviceName: device.name,
          alertType: alertType,
          message: message,
          energyData: {
            severity: severity,
            timestamp: alert.createdAt,
            deviceLocation: device.location,
            metadata: metadata
          }
        });

        console.log('System alert notification sent:', notificationResult);
      }
    } catch (notificationError) {
      console.error('Failed to send system alert notification:', notificationError.message);
    }

    res.status(201).json({
      success: true,
      alert
    });
  } catch (error) {
    console.error("Create system alert error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// @desc    Mark alert as read
// @route   PUT /api/alerts/:id/read
// @access  Private
const markAlertAsRead = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found"
      });
    }

    // Check if user owns the alert
    if (alert.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to update this alert"
      });
    }

    alert.isRead = true;
    alert.readAt = new Date();
    await alert.save();

    res.json({
      success: true,
      alert
    });
  } catch (error) {
    console.error("Mark alert as read error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// @desc    Resolve alert
// @route   PUT /api/alerts/:id/resolve
// @access  Private
const resolveAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found"
      });
    }

    // Check if user owns the alert
    if (alert.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to resolve this alert"
      });
    }

    alert.isResolved = true;
    alert.resolvedAt = new Date();
    await alert.save();

    res.json({
      success: true,
      alert
    });
  } catch (error) {
    console.error("Resolve alert error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// @desc    Get alert statistics
// @route   GET /api/alerts/stats/:userId
// @access  Private
const getAlertStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await Alert.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] }
          },
          unresolved: {
            $sum: { $cond: [{ $eq: ["$isResolved", false] }, 1, 0] }
          },
          critical: {
            $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] }
          },
          high: {
            $sum: { $cond: [{ $eq: ["$severity", "high"] }, 1, 0] }
          },
          medium: {
            $sum: { $cond: [{ $eq: ["$severity", "medium"] }, 1, 0] }
          },
          low: {
            $sum: { $cond: [{ $eq: ["$severity", "low"] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      unread: 0,
      unresolved: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    res.json({
      success: true,
      stats: result,
      period: `${days} days`
    });
  } catch (error) {
    console.error("Get alert stats error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

module.exports = {
  getUserAlerts,
  createAlert,
  createSystemAlert,
  markAlertAsRead,
  resolveAlert,
  getAlertStats
};
