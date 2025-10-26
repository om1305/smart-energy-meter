const { validationResult } = require("express-validator");
const Device = require("../models/Device");
const User = require('../models/User');
const { sendEnergyAlert } = require('../utils/notificationService');

// @desc    Add new device
// @route   POST /api/devices/add
// @access  Private
const addDevice = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { deviceName, deviceType, powerRating, deviceId, location, description } = req.body;

    // Check if device ID already exists
    const deviceExists = await Device.findOne({ deviceId });
    if (deviceExists) {
      return res.status(400).json({
        success: false,
        message: "Device ID already exists"
      });
    }

    const device = await Device.create({
      userId: req.user._id,
      deviceName,
      deviceType,
      powerRating,
      deviceId,
      location,
      description
    });

     const user = await User.findById(req.user._id);
    if (user && user.email) {
      try {
        await sendEnergyAlert({
          email: user.email,
          fcmToken: user.fcmToken || null, // optional, if using push
          deviceName: deviceName,
          alertType: 'device_registered',
          message: `Your device "${deviceName}" has been successfully registered.`,
          energyData: {
            deviceId,
            deviceType,
            powerRating,
            location
          }
        });


        console.log('Device registration notification sent');
      } catch (err) {
        console.error('Error sending device notification:', err.message);
      }
    }


    res.status(201).json({
      success: true,
      device
    });
  } catch (error) {
    console.error("Add device error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// @desc    Get user devices
// @route   GET /api/devices/:userId
// @access  Private
const getUserDevices = async (req, res) => {
  try {
    const devices = await Device.find({ userId: req.params.userId });
    
    res.json({
      success: true,
      count: devices.length,
      devices
    });
  } catch (error) {
    console.error("Get devices error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// @desc    Update device
// @route   PUT /api/devices/:id
// @access  Private
const updateDevice = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    let device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    // Check if user owns the device
    if (device.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to update this device"
      });
    }

    device = await Device.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

     const user = await User.findById(req.user._id);
    if (user && user.email) {
      try {
               await sendEnergyAlert({
  email: user.email,
  fcmToken: user.fcmToken || null,
  deviceName: device.deviceName,
  alertType: 'device_updated',
  message: `Your device "${device.deviceName}" has been updated.`,
  energyData: req.body // show what changed
}); 
        console.log('Device registration notification sent');
      } catch (err) {
        console.error('Error sending device notification:', err.message);
      }
    }


    res.json({
      success: true,
      device
    });
  } catch (error) {
    console.error("Update device error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// @desc    Delete device
// @route   DELETE /api/devices/:id
// @access  Private
const deleteDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    // Check if user owns the device
    if (device.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to delete this device"
      });
    }

    await Device.findByIdAndDelete(req.params.id);

     const user = await User.findById(req.user._id);
    if (user && user.email) {
      try {
       await sendEnergyAlert({
  email: user.email,
  fcmToken: user.fcmToken || null,
  deviceName: device.deviceName,
  alertType: 'device_deleted',
  message: `Your device "${device.deviceName}" has been deleted.`,
});
        console.log('Device registration notification sent');
      } catch (err) {
        console.error('Error sending device notification:', err.message);
      }
    }


    res.json({
      success: true,
      message: "Device deleted successfully"
    });
  } catch (error) {
    console.error("Delete device error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

module.exports = {
  addDevice,
  getUserDevices,
  updateDevice,
  deleteDevice
};
