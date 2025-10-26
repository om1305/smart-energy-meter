const EnergyReading = require("../models/EnergyReading");
const Device = require("../models/Device");

// @desc    Chatbot query handler
// @route   POST /api/chatbot/query
// @access  Private
const handleChatbotQuery = async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.user._id;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Query is required"
      });
    }

    const lowerQuery = query.toLowerCase();
    let response = "";

    // Handle different types of queries
    if (lowerQuery.includes("power") && lowerQuery.includes("consumption")) {
      response = await handlePowerConsumptionQuery(userId);
    } else if (lowerQuery.includes("device") && (lowerQuery.includes("most") || lowerQuery.includes("highest"))) {
      response = await handleHighestConsumptionQuery(userId);
    } else if (lowerQuery.includes("temperature") || lowerQuery.includes("hot")) {
      response = await handleTemperatureQuery(userId);
    } else if (lowerQuery.includes("alert") || lowerQuery.includes("warning")) {
      response = await handleAlertQuery(userId);
    } else if (lowerQuery.includes("help") || lowerQuery.includes("what")) {
      response = getHelpResponse();
    } else {
      response = getDefaultResponse();
    }

    res.json({
      success: true,
      query,
      response,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Chatbot query error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Helper function to handle power consumption queries
const handlePowerConsumptionQuery = async (userId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayReadings = await EnergyReading.find({
      userId,
      timestamp: { $gte: today }
    });

    if (todayReadings.length === 0) {
      return "No power consumption data available for today.";
    }

    const totalPower = todayReadings.reduce((sum, reading) => sum + reading.power, 0);
    const averagePower = totalPower / todayReadings.length;
    const maxPower = Math.max(...todayReadings.map(r => r.power));

    return `Today's power consumption summary:
     Total power: ${totalPower.toFixed(2)}W
     Average power: ${averagePower.toFixed(2)}W
     Peak power: ${maxPower.toFixed(2)}W
     Total readings: ${todayReadings.length}`;
  } catch (error) {
    return "Unable to retrieve power consumption data at the moment.";
  }
};

// Helper function to handle highest consumption queries
const handleHighestConsumptionQuery = async (userId) => {
  try {
    const devices = await Device.find({ userId });
    let highestDevice = null;
    let highestPower = 0;

    for (const device of devices) {
      const recentReadings = await EnergyReading.find({ deviceId: device.deviceId })
        .sort({ timestamp: -1 })
        .limit(10);

      if (recentReadings.length > 0) {
        const avgPower = recentReadings.reduce((sum, r) => sum + r.power, 0) / recentReadings.length;
        if (avgPower > highestPower) {
          highestPower = avgPower;
          highestDevice = device;
        }
      }
    }

    if (highestDevice) {
      return `The device with highest power consumption is "${highestDevice.deviceName}" with an average of ${highestPower.toFixed(2)}W.`;
    } else {
      return "No power consumption data available for your devices.";
    }
  } catch (error) {
    return "Unable to determine the highest consuming device at the moment.";
  }
};

// Helper function to handle temperature queries
const handleTemperatureQuery = async (userId) => {
  try {
    const recentReadings = await EnergyReading.find({ userId })
      .sort({ timestamp: -1 })
      .limit(20);

    if (recentReadings.length === 0) {
      return "No temperature data available.";
    }

    const temperatures = recentReadings.map(r => r.temperature);
    const avgTemp = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
    const maxTemp = Math.max(...temperatures);
    const minTemp = Math.min(...temperatures);

    return `Temperature summary:
     Current average: ${avgTemp.toFixed(1)}C
     Highest recorded: ${maxTemp.toFixed(1)}C
     Lowest recorded: ${minTemp.toFixed(1)}C`;
  } catch (error) {
    return "Unable to retrieve temperature data at the moment.";
  }
};

// Helper function to handle alert queries
const handleAlertQuery = async (userId) => {
  try {
    const Alert = require("../models/Alert");
    const unreadAlerts = await Alert.find({ userId, isRead: false });
    const totalAlerts = await Alert.countDocuments({ userId });

    if (unreadAlerts.length === 0) {
      return `You have no unread alerts. Total alerts: ${totalAlerts}`;
    }

    return `You have ${unreadAlerts.length} unread alerts out of ${totalAlerts} total alerts. Check your dashboard for details.`;
  } catch (error) {
    return "Unable to retrieve alert information at the moment.";
  }
};

// Helper function to get help response
const getHelpResponse = () => {
  return `I can help you with:
     Power consumption queries
     Device performance analysis
     Temperature monitoring
     Alert information
     Energy usage patterns

    Try asking: "Which device consumed most power?" or "What's my power consumption today?"`;
};

// Helper function to get default response
const getDefaultResponse = () => {
  return `I'm not sure how to help with that. Try asking about:
     Power consumption
     Device performance
     Temperature readings
     Energy alerts
     Usage patterns`;
};

module.exports = {
  handleChatbotQuery
};
