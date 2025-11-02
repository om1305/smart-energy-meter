const express = require("express");
const { body } = require("express-validator");
const { registerUser, loginUser, getUserProfile } = require("../controllers/userController");
const auth = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/users/register
// @desc    Register user
// @access  Public
router.post("/register", [
  body("name").trim().isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
], registerUser);

// @route   POST /api/users/login
// @desc    Login user
// @access  Public
router.post("/login", [
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("password").exists().withMessage("Password is required")
], loginUser);

// @route   GET /api/users/:id
// @desc    Get user profile
// @access  Private
router.get("/:id", auth, getUserProfile);

module.exports = router;
