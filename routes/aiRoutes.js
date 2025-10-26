const express = require("express");
const { 
  getAIPrediction, 
  getPredictionHistory, 
  predictEnergyUsage, 
  predictDeviceFault, 
  predictRecommendations 
} = require("../controllers/aiController");
const auth = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/ai/predict/:deviceId
// @desc    Get AI prediction for device
// @access  Private
router.get("/predict/:deviceId", auth, getAIPrediction);

// @route   GET /api/ai/predictions/:deviceId
// @desc    Get prediction history for device
// @access  Private
router.get("/predictions/:deviceId", auth, getPredictionHistory);

// @route   POST /api/ai/predict-energy
// @desc    Predict next energy usage using TensorFlow.js
// @access  Private
router.post("/predict-energy", auth, predictEnergyUsage);

// @route   POST /api/ai/predict-fault
// @desc    Predict potential device faults using TensorFlow.js
// @access  Private
router.post("/predict-fault", auth, predictDeviceFault);

// @route   POST /api/ai/predict-recommendation
// @desc    Generate cost-saving and efficiency recommendations
// @access  Private
router.post("/predict-recommendation", auth, predictRecommendations);

module.exports = router;
