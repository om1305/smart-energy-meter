const express = require("express");
const { handleChatbotQuery } = require("../controllers/llmChatbotController");

const router = express.Router();
router.post("/ask", handleChatbotQuery);

module.exports = router;









