import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const handleChatbotQuery = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.trim() === "") {
      return res.status(400).json({ success: false, message: "Query is required" });
    }

    // ✅ Use correct, active Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are SmartEnergyBot — an AI assistant that helps users understand and reduce energy usage.
Be concise, friendly, and technically accurate.
User query: ${query}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      message: "Response generated successfully",
      reply: text,
    });
  } catch (error) {
    console.error("Gemini Chatbot Error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing chatbot query",
      error: error.message,
    });
  }
};





