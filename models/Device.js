const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"]
  },
  deviceName: {
    type: String,
    required: [true, "Device name is required"],
    trim: true,
    maxlength: [100, "Device name cannot be more than 100 characters"]
  },
  deviceType: {
    type: String,
    required: [true, "Device type is required"],
    enum: ["smart_meter", "sensor", "appliance", "other"],
    default: "smart_meter"
  },
  powerRating: {
    type: Number,
    required: [true, "Power rating is required"],
    min: [0, "Power rating cannot be negative"]
  },
  status: {
    type: String,
    enum: ["on", "off", "standby"],
    default: "off"
  },
  deviceId: {
    type: String,
    unique: true,
    required: [true, "Device ID is required"]
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, "Location cannot be more than 200 characters"]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, "Description cannot be more than 500 characters"]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Device", deviceSchema);
