const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const connectDB = require("./config/database");

const userRoutes = require("./routes/userRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const energyRoutes = require("./routes/energyRoutes");
const alertRoutes = require("./routes/alertRoutes");
const aiRoutes = require("./routes/aiRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const errorHandler = require("./middleware/errorHandler");

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? ["https://your-frontend-domain.com"] 
    : ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Smart Energy Meter API is running",
    timestamp: new Date(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/energy", energyRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/notifications", notificationRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Smart Energy Meter API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      users: "/api/users",
      devices: "/api/devices",
      energy: "/api/energy",
      alerts: "/api/alerts",
      ai: "/api/ai",
      chatbot: "/api/chatbot",
      notifications: "/api/notifications"
    }
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(` Smart Energy Meter API running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
});
