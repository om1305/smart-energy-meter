const { spawn } = require("child_process");
const path = require("path");

const runAI = async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, "../ai_predictor.py");
    const py = spawn("python", [scriptPath]);

    let output = "";
    let errorOutput = "";

    // Send JSON input to Python
    py.stdin.write(JSON.stringify(req.body || {}));
    py.stdin.end();

    // Capture output
    py.stdout.on("data", (data) => (output += data.toString()));
    py.stderr.on("data", (data) => (errorOutput += data.toString()));

    py.on("close", () => {
      if (errorOutput) console.error("Python Error:", errorOutput);

      try {
        const result = JSON.parse(output);
        res.json(result);
      } catch (err) {
        console.error("Invalid Python Output:", output);
        res.status(400).json({
          success: false,
          message: "Invalid Python output",
          raw: output,
          errorOutput,
        });
      }
    });
  } catch (error) {
    console.error("AI Controller Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to run AI model",
    });
  }
};

module.exports = { runAI };







