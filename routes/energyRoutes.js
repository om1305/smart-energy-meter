const express = require("express");
const { body } = require("express-validator");
const { addEnergyReading, getEnergyReadings , getEnergyInsights ,getEnergyHistory, getEnergyTrends} = require("../controllers/energyController");
const auth = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/energy/add
// @desc    Add energy reading from ESP32
// @access  Public (for ESP32 devices)
router.post("/add", [
  body("deviceId").trim().isLength({ min: 3, max: 50 }).withMessage("Device ID must be between 3 and 50 characters"),
  body("current").isNumeric().isFloat({ min: 0 }).withMessage("Current must be a positive number"),
  body("voltage").isNumeric().isFloat({ min: 0 }).withMessage("Voltage must be a positive number"),
  body("temperature").isNumeric().withMessage("Temperature must be a number")
], addEnergyReading);

// @route   GET /api/energy/:deviceId
// @desc    Get energy readings for a device
// @access  Private

router.get("/trends", auth, getEnergyTrends);       // /api/energy/trends
router.get("/history", auth, getEnergyHistory);     // /api/energy/history?deviceId=METER0005
router.get("/insights", auth, getEnergyInsights);

router.get("/:deviceId", auth, getEnergyReadings);
module.exports = router;
