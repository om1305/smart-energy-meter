const { validationResult } = require("express-validator");
const EnergyReading = require("../models/EnergyReading");
const Device = require("../models/Device");
const Alert = require("../models/Alert");
const { sendEnergyAlert } = require("../utils/notificationService");
const User = require("../models/User");

// ✅ Add energy reading
const addEnergyReading = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { deviceId, current, voltage, temperature } = req.body;

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    const power = current * voltage;

    const energyReading = await EnergyReading.create({
      deviceId,
      current,
      voltage,
      temperature,
      power,
      userId: device.userId,
    });

    await checkForPowerSpike(deviceId, power, device.userId);

    res.status(201).json({
      success: true,
      energyReading,
    });
  } catch (error) {
    console.error("Add energy reading error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ✅ Get readings for a device
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
      readings,
    });
  } catch (error) {
    console.error("Get energy readings error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ✅ Helper: check power spike
const checkForPowerSpike = async (deviceId, currentPower, userId) => {
  try {
    const recentReadings = await EnergyReading.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(10);

    if (recentReadings.length >= 5) {
      const averagePower =
        recentReadings.reduce((sum, r) => sum + r.power, 0) /
        recentReadings.length;
      const threshold = averagePower * 1.5;

      if (currentPower > threshold) {
        const alert = await Alert.create({
          userId,
          deviceId,
          message: `Power spike detected! Current power: ${currentPower.toFixed(
            2
          )}W (avg: ${averagePower.toFixed(2)}W)`,
          alertType: "power_spike",
          severity: "high",
          metadata: { currentPower, averagePower, threshold },
        });

        const user = await User.findById(userId);
        if (user && (user.email || user.fcmToken)) {
          try {
            await sendEnergyAlert({
              email: user.email,
              fcmToken: user.fcmToken,
              deviceName: deviceId,
              alertType: "Power Spike",
              message: alert.message,
              energyData: { currentPower, averagePower, threshold },
            });
          } catch (err) {
            console.error("Notification error:", err.message);
          }
        }
      }
    }
  } catch (error) {
    console.error("Power spike check error:", error.message);
  }
};

// ✅ Dashboard summary endpoint
const getEnergySummary = async (req, res) => {
  try {
    res.json({
      todayCost: 34.5,
      totalUsage: 12.3,
      efficiency: 89,
    });
  } catch (error) {
    console.error("Summary error:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching summary",
    });
  }
};

// ✅ Export all controllers properly
module.exports = {
  addEnergyReading,
  getEnergyReadings,
  getEnergySummary,
};



