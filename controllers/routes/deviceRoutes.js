const express = require("express");
const { body } = require("express-validator");
const { addDevice, getUserDevices, updateDevice, deleteDevice } = require("../controllers/deviceController");
const auth = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/devices/add
// @desc    Add new device
// @access  Private
router.post("/add", auth, [
  body("deviceName").trim().isLength({ min: 2, max: 100 }).withMessage("Device name must be between 2 and 100 characters"),
  body("deviceType").isIn(["smart_meter", "sensor", "appliance", "other"]).withMessage("Invalid device type"),
  body("powerRating").isNumeric().isFloat({ min: 0 }).withMessage("Power rating must be a positive number"),
  body("deviceId").trim().isLength({ min: 3, max: 50 }).withMessage("Device ID must be between 3 and 50 characters"),
  body("location").optional().trim().isLength({ max: 200 }).withMessage("Location cannot exceed 200 characters"),
  body("description").optional().trim().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters")
], addDevice);

// @route   GET /api/devices/:userId
// @desc    Get user devices
// @access  Private
router.get("/:userId", auth, getUserDevices);

// @route   PUT /api/devices/:id
// @desc    Update device
// @access  Private
router.put("/:id", auth, [
  body("deviceName").optional().trim().isLength({ min: 2, max: 100 }).withMessage("Device name must be between 2 and 100 characters"),
  body("deviceType").optional().isIn(["smart_meter", "sensor", "appliance", "other"]).withMessage("Invalid device type"),
  body("powerRating").optional().isNumeric().isFloat({ min: 0 }).withMessage("Power rating must be a positive number"),
  body("location").optional().trim().isLength({ max: 200 }).withMessage("Location cannot exceed 200 characters"),
  body("description").optional().trim().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters")
], updateDevice);

// @route   DELETE /api/devices/:id
// @desc    Delete device
// @access  Private
router.delete("/:id", auth, deleteDevice);

module.exports = router;
