const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, "Device ID is required"]
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"]
  },
  predictedPower: {
    type: Number,
    required: [true, "Predicted power is required"],
    min: [0, "Predicted power cannot be negative"]
  },
  predictedCurrent: {
    type: Number,
    required: [true, "Predicted current is required"],
    min: [0, "Predicted current cannot be negative"]
  },
  predictedVoltage: {
    type: Number,
    required: [true, "Predicted voltage is required"],
    min: [0, "Predicted voltage cannot be negative"]
  },
  predictedTemperature: {
    type: Number,
    required: [true, "Predicted temperature is required"]
  },
  confidence: {
    type: Number,
    required: [true, "Confidence level is required"],
    min: [0, "Confidence cannot be negative"],
    max: [1, "Confidence cannot be greater than 1"]
  },
  predictionDate: {
    type: Date,
    required: [true, "Prediction date is required"]
  },
  modelVersion: {
    type: String,
    default: "1.0"
  },
  inputData: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, "Input data is required"]
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for efficient queries
predictionSchema.index({ deviceId: 1, predictionDate: -1 });
predictionSchema.index({ userId: 1, predictionDate: -1 });

module.exports = mongoose.model("Prediction", predictionSchema);
