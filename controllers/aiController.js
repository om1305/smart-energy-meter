
const axios = require("axios");
const EnergyReading = require("../models/EnergyReading");
const Prediction = require("../models/Prediction");
const { sendDeviceStatusNotification } = require("../utils/notificationService");


/**
 * Helper to call Python AI Server for predictions
 * @param {string} endpoint - AI endpoint to call (e.g. '/predict-energy')
 * @param {object} payload - Data to send to AI server
 */
const getAIPrediction = async (endpoint, payload) => {
  try {
    const baseUrl = process.env.AI_API_URL_BASE || "http://localhost:5000";
    const url = `${baseUrl}${endpoint}`;

    console.log(`📡 Sending data to AI server: ${url}`);

    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000, // prevent hanging
    });

    console.log("✅ Received response from AI:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ AI server error:", error.message);
    return {
      success: false,
      message: "AI server request failed",
      error: error.message,
    };
  }
};

/**
 * @desc Get prediction history for a device
 * @route GET /api/ai/predictions/:deviceId
 */
const getPredictionHistory = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    const skip = (page - 1) * limit;

    const predictions = await Prediction.find({ deviceId })
      .sort({ predictionDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Prediction.countDocuments({ deviceId });

    res.json({
      success: true,
      count: predictions.length,
      total,
      predictions,
    });
  } catch (error) {
    console.error("Get prediction history error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Helper: Create a fake prediction if AI server fails
 */
const createMockPrediction = async (deviceId, userId, readingsData, hours) => {
  const lastReading = readingsData[0];
  const averagePower =
    readingsData.reduce((sum, r) => sum + r.power, 0) / readingsData.length;

  const trendFactor = 1 + (Math.random() - 0.5) * 0.2; // ±10% variation
  const predictedPower = averagePower * trendFactor;
  const predictedCurrent =
    (predictedPower / lastReading.voltage) *
    (1 + (Math.random() - 0.5) * 0.1);
  const predictedVoltage =
    lastReading.voltage * (1 + (Math.random() - 0.5) * 0.05);
  const predictedTemperature =
    lastReading.temperature + (Math.random() - 0.5) * 5;

  return await Prediction.create({
    deviceId,
    userId,
    predictedPower,
    predictedCurrent,
    predictedVoltage,
    predictedTemperature,
    confidence: 0.6 + Math.random() * 0.3, // 60–90% confidence
    predictionDate: new Date(Date.now() + hours * 3600000),
    modelVersion: "mock-1.0",
    inputData: {
      readingsCount: readingsData.length,
      lastReading,
      predictionHours: hours,
    },
    metadata: {
      type: "mock_prediction",
      note: "Generated when AI service is unavailable",
    },
  });
};

/**
 * @desc Predict next energy usage using AI (Python server)
 * @route POST /api/ai/predict-energy
 */
// const predictEnergyUsage = async (req, res) => {
//   try {
//     const {
//       powerConsumption,
//       electricalParameters,
//       environmentalData,
//       deviceCharacteristics,
//       faultSimulationData,
//     } = req.body;

//     if (!powerConsumption || !electricalParameters) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Missing required fields: powerConsumption or electricalParameters",
//       });
//     }

//     const aiResponse = await getAIPrediction("/predict-energy", {
//       powerConsumption,
//       electricalParameters,
//       environmentalData,
//       deviceCharacteristics,
//       faultSimulationData,
//     });

//     res.status(200).json({
//       success: true,
//       source: "Python AI Server",
//       predictionType: "Energy Usage",
//       dataSent: req.body,
//       aiResult: aiResponse,
//     });
//   } catch (error) {
//     console.error("Error in predictEnergyUsage:", error.message);
//     res.status(500).json({
//       success: false,
//       message: "Error communicating with AI server for energy prediction",
//       error: error.message,
//     });
//   }
// };

// const predictEnergyUsage = async (req, res) => {
//   try {
//     const {
//       powerConsumption,
//       electricalParameters,
//       environmentalData,
//       deviceCharacteristics,
//       faultSimulationData,
//       deviceId,
//     } = req.body;

//     if (!powerConsumption || !electricalParameters) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Missing required fields: powerConsumption or electricalParameters",
//       });
//     }

//     // 1️⃣ Try calling the Python AI server
//     const aiResponse = await getAIPrediction("/predict-energy", {
//       powerConsumption,
//       electricalParameters,
//       environmentalData,
//       deviceCharacteristics,
//       faultSimulationData,
//     });

//     let savedPrediction = null;

//     // 2️⃣ If AI server failed, create a mock prediction and save to MongoDB
//     if (!aiResponse.success) {
//       console.log("⚠️ AI server failed — generating mock prediction...");

//       const fakeReading = {
//         voltage: electricalParameters.voltage || 230,
//         current: electricalParameters.current || 1.5,
//         power:
//           Array.isArray(powerConsumption)
//             ? powerConsumption[powerConsumption.length - 1]
//             : powerConsumption.currentPower ||
//               electricalParameters.voltage * electricalParameters.current,
//         temperature: environmentalData?.temperature || 25,
//       };

//       savedPrediction = await createMockPrediction(
//         deviceId || "device001",  // fallback if deviceId missing
//         req.user?.id || null,     // logged in user if available
//         [fakeReading],
//         1                         // prediction for next 1 hour
//       );
//     }

//     // 3️⃣ Return result
//     res.status(200).json({
//       success: true,
//       source: aiResponse.success ? "Python AI Server" : "Mock Prediction",
//       predictionType: "Energy Usage",
//       dataSent: req.body,
//       aiResult: aiResponse,
//       savedPrediction,
//     });
//   } catch (error) {
//     console.error("Error in predictEnergyUsage:", error.message);
//     res.status(500).json({
//       success: false,
//       message: "Error communicating with AI server for energy prediction",
//       error: error.message,
//     });
//   }
// };

const predictEnergyUsage = async (req, res) => {
  try {
    const {
      powerConsumption,
      electricalParameters,
      environmentalData,
      deviceCharacteristics,
      faultSimulationData,
      deviceId,
    } = req.body;

    if (!powerConsumption || !electricalParameters) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: powerConsumption or electricalParameters",
      });
    }

    const aiResponse = await getAIPrediction("/predict-energy", {
      powerConsumption,
      electricalParameters,
      environmentalData,
      deviceCharacteristics,
      faultSimulationData,
    });

    let savedPrediction;

    if (aiResponse.success && aiResponse.predictedPower) {
      // ✅ Save actual AI response
      savedPrediction = await Prediction.create({
        deviceId: deviceId || "METER0005",
        userId: req.user?.id || null,
        predictedPower: aiResponse.predictedPower,
        predictedCurrent: aiResponse.predictedCurrent,
        predictedVoltage: aiResponse.predictedVoltage,
        predictedTemperature: aiResponse.predictedTemperature,
        confidence: aiResponse.confidence || 0.9,
        predictionDate: new Date(),
        modelVersion: aiResponse.modelVersion || "v1.0",
        metadata: {
          type: "ai_prediction",
          note: "Saved from Python AI server response",
        },
      });
    } else {
      // ⚙️ Fallback to mock prediction
      console.log("⚠️ AI server failed — generating mock prediction...");
      const fakeReading = {
        voltage: electricalParameters.voltage || 230,
        current: electricalParameters.current || 1.5,
        power:
          Array.isArray(powerConsumption)
            ? powerConsumption[powerConsumption.length - 1]
            : powerConsumption.currentPower ||
              electricalParameters.voltage * electricalParameters.current,
        temperature: environmentalData?.temperature || 25,
      };

      savedPrediction = await createMockPrediction(
        deviceId || "device001",
        req.user?.id || null,
        [fakeReading],
        1
      );
    }

    // ✅ Always return saved prediction
    res.status(200).json({
      success: true,
      source: aiResponse.success ? "Python AI Server" : "Mock Prediction",
      predictionType: "Energy Usage",
      aiResult: aiResponse,
      savedPrediction,
    });
  } catch (error) {
    console.error("Error in predictEnergyUsage:", error.message);
    res.status(500).json({
      success: false,
      message: "Error communicating with AI server for energy prediction",
      error: error.message,
    });
  }
};


/**
 * @desc Predict potential device faults using AI
 * @route POST /api/ai/predict-fault
 */
const predictDeviceFault = async (req, res) => {
  try {
    const {
      electricalParameters,
      environmentalData,
      deviceCharacteristics,
      faultSimulationData,
    } = req.body;

    if (!electricalParameters) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: electricalParameters",
      });
    }

    const aiResponse = await getAIPrediction("/predict-fault", {
      electricalParameters,
      environmentalData,
      deviceCharacteristics,
      faultSimulationData,
    });

    res.status(200).json({
      success: true,
      source: "Python AI Server",
      predictionType: "Fault Detection",
      dataSent: req.body,
      aiResult: aiResponse,
    });
  } catch (error) {
    console.error("Error in predictDeviceFault:", error.message);
    res.status(500).json({
      success: false,
      message: "Error communicating with AI server for fault prediction",
      error: error.message,
    });
  }
};

/**
 * @desc Generate cost-saving and efficiency recommendations using AI
 * @route POST /api/ai/predict-recommendation
 */
const predictRecommendations = async (req, res) => {
  try {
    const {
      powerConsumption,
      electricalParameters,
      environmentalData,
      deviceCharacteristics,
      faultSimulationData,
    } = req.body;

    if (!powerConsumption || !electricalParameters) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: powerConsumption or electricalParameters",
      });
    }

    const aiResponse = await getAIPrediction("/predict-recommendation", {
      powerConsumption,
      electricalParameters,
      environmentalData,
      deviceCharacteristics,
      faultSimulationData,
    });

    res.status(200).json({
      success: true,
      source: "Python AI Server",
      predictionType: "Energy Recommendation",
      dataSent: req.body,
      aiResult: aiResponse,
    });
  } catch (error) {
    console.error("Error in predictRecommendations:", error.message);
    res.status(500).json({
      success: false,
      message: "Error communicating with AI server for recommendations",
      error: error.message,
    });
  }
};

module.exports = {
  getAIPrediction,           // common AI call function
  getPredictionHistory,      // fetch old predictions
  predictEnergyUsage,        // energy usage prediction
  predictDeviceFault,        // fault detection
  predictRecommendations,    // AI suggestions
  createMockPrediction       // fallback mock data
};



// basically by req we call the data from esp32 and by axios we send the data to python server 
//try and actch uses to make the server works even if there is an error
// 3 main function predictEnergyUsage , predictDeviceFault , predictRecommendations
//createMockPrediction is for mock prediction if some error occurs then this will give fake data
//aiPrediction is for common thing in all main function