const { validationResult } = require("express-validator");
const Alert = require("../models/Alert");

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

// @desc    Create alert
// @route   POST /api/alerts/create
// @access  Private
const createAlert = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { deviceId, message, alertType, severity, metadata } = req.body;

    const alert = await Alert.create({
      userId: req.user._id,
      deviceId,
      message,
      alertType,
      severity,
      metadata
    });

    res.status(201).json({
      success: true,
      alert
    });
  } catch (error) {
    console.error("Create alert error:", error.message);
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

module.exports = {
  getUserAlerts,
  createAlert,
  markAlertAsRead,
  resolveAlert
};
