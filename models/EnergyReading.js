const mongoose = require("mongoose");

const energyReadingSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, "Device ID is required"]
  },
  current: {
    type: Number,
    required: [true, "Current reading is required"],
    min: [0, "Current cannot be negative"]
  },
  voltage: {
    type: Number,
    required: [true, "Voltage reading is required"],
    min: [0, "Voltage cannot be negative"]
  },
  temperature: {
    type: Number,
    required: [true, "Temperature reading is required"]
  },
  power: {
    type: Number,
    required: [true, "Power calculation is required"],
    min: [0, "Power cannot be negative"]
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
energyReadingSchema.index({ deviceId: 1, timestamp: -1 });
energyReadingSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("EnergyReading", energyReadingSchema);
