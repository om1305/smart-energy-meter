const express = require("express");
const router = express.Router();
const { runAI } = require("../controllers/aiController");

// ✅ Define AI prediction route
router.post("/predict", runAI);

module.exports = router;



