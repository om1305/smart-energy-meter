const { validationResult } = require("express-validator");
const EnergyReading = require("../models/EnergyReading");
const Device = require("../models/Device");
const Alert = require("../models/Alert");
const { sendEnergyAlert } = require('../utils/notificationService'); // adjust path
const User = require('../models/User'); // to get user email if not in Device

// @desc    Add energy reading from ESP32
// @route   POST /api/energy/add
// @access  Public (for ESP32 devices)
const addEnergyReading = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { deviceId, current, voltage, temperature } = req.body;

    // Find the device to get userId
    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    // Calculate power
    const power = current * voltage;

    // Create energy reading
    const energyReading = await EnergyReading.create({
      deviceId,
      current,
      voltage,
      temperature,
      power,
      userId: device.userId
    });

    // Check for power spike (50% above average)
    await checkForPowerSpike(deviceId, power, device.userId);

    res.status(201).json({
      success: true,
      energyReading
    });
  } catch (error) {
    console.error("Add energy reading error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// @desc    Get energy readings for a device
// @route   GET /api/energy/:deviceId
// @access  Private
const getEnergyReadings = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 100, page = 1 } = req.query;

    const skip = (page - 1) * limit;

    const readings = await EnergyReading.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await EnergyReading.countDocuments({ deviceId });

    res.json({
      success: true,
      count: readings.length,
      total,
      readings
    });
  } catch (error) {
    console.error("Get energy readings error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Helper function to check for power spikes
// const checkForPowerSpike = async (deviceId, currentPower, userId) => {
//   try {
//     // Get last 10 readings to calculate average
//     const recentReadings = await EnergyReading.find({ deviceId })
//       .sort({ timestamp: -1 })
//       .limit(10);

//     if (recentReadings.length >= 5) {
//       const averagePower = recentReadings.reduce((sum, reading) => sum + reading.power, 0) / recentReadings.length;
//       const threshold = averagePower * 1.5; // 50% above average

//       if (currentPower > threshold) {
//         // Create alert
//         await Alert.create({
//           userId,
//           deviceId,
//           message: `Power spike detected! Current power: ${currentPower.toFixed(2)}W is 50% above average: ${averagePower.toFixed(2)}W`,
//           alertType: "power_spike",
//           severity: "high",
//           metadata: {
//             currentPower,
//             averagePower,
//             threshold
//           }
//         });
//       }
//     }
//   } catch (error) {
//     console.error("Power spike check error:", error.message);
//   }
// };

const checkForPowerSpike = async (deviceId, currentPower, userId) => {
  try {
    // Get last 10 readings to calculate average
    const recentReadings = await EnergyReading.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(10);

    if (recentReadings.length >= 5) {
      const averagePower = recentReadings.reduce((sum, reading) => sum + reading.power, 0) / recentReadings.length;
      const threshold = averagePower * 1.5; // 50% above average

      if (currentPower > threshold) {
        // Create alert in DB
        const alert = await Alert.create({
          userId,
          deviceId,
          message: `Power spike detected! Current power: ${currentPower.toFixed(2)}W is 50% above average: ${averagePower.toFixed(2)}W`,
          alertType: "power_spike",
          severity: "high",
          metadata: {
            currentPower,
            averagePower,
            threshold
          }
        });

        // ✅ Send notification
        const user = await User.findById(userId); // get user email
        if (user && (user.email || user.fcmToken)) {
          try {
            await sendEnergyAlert({
              email: user.email,
              fcmToken: user.fcmToken,  // make sure FCM token is stored in user document
              deviceName: deviceId,     // or store deviceName in Device model
              alertType: "Power Spike",
              message: alert.message,
              energyData: { currentPower, averagePower, threshold }
            });
            console.log("Power spike notification sent");
          } catch (err) {
            console.error("Error sending power spike notification:", err.message);
          }
        }
      }
    }
  } catch (error) {
    console.error("Power spike check error:", error.message);
  }
};


module.exports = {
  addEnergyReading,
  getEnergyReadings
};
