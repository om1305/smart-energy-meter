const express = require("express");
const { body } = require("express-validator");
const { getUserAlerts, createAlert, markAlertAsRead, resolveAlert } = require("../controllers/alertController");
const auth = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/alerts/:userId
// @desc    Get user alerts
// @access  Private
router.get("/:userId", auth, getUserAlerts);

// @route   POST /api/alerts/create
// @desc    Create alert
// @access  Private
router.post("/create", auth, [
  body("deviceId").trim().isLength({ min: 3, max: 50 }).withMessage("Device ID must be between 3 and 50 characters"),
  body("message").trim().isLength({ min: 5, max: 500 }).withMessage("Message must be between 5 and 500 characters"),
  body("alertType").isIn(["power_spike", "temperature_high", "device_offline", "maintenance", "custom","Energy Overload"]).withMessage("Invalid alert type"),
  body("severity").optional().isIn(["low", "medium", "high", "critical"]).withMessage("Invalid severity level"),
  body("metadata").optional().isObject().withMessage("Metadata must be an object")
], createAlert);

// @route   PUT /api/alerts/:id/read
// @desc    Mark alert as read
// @access  Private
router.put("/:id/read", auth, markAlertAsRead);

// @route   PUT /api/alerts/:id/resolve
// @desc    Resolve alert
// @access  Private
router.put("/:id/resolve", auth, resolveAlert);

module.exports = router;
