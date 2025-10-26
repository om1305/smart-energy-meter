const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"]
  },
  deviceId: {
    type: String,
    required: [true, "Device ID is required"]
  },
  message: {
    type: String,
    required: [true, "Alert message is required"],
    trim: true,
    maxlength: [500, "Alert message cannot be more than 500 characters"]
  },
  alertType: {
    type: String,
    required: [true, "Alert type is required"],
    enum: ["power_spike", "temperature_high", "device_offline", "maintenance", "custom" , "energy_overload"],
    default: "custom"
  },
  severity: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "medium"
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for efficient queries
alertSchema.index({ userId: 1, createdAt: -1 });
alertSchema.index({ deviceId: 1, createdAt: -1 });
alertSchema.index({ isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Alert", alertSchema);
