// import express from "express";
// import { getAIResponse } from "../speechToText.js";
// import { ttsLive } from "../ttsLive.js";
// import path from "path";

// const router = express.Router();

// router.post("/ask", async (req, res) => {
//   const { text } = req.body;
//   if (!text) return res.status(400).json({ error: "Text is required" });

//   try {
//     console.log(`👂 User said: ${text}`);

//     const reply = await getAIResponse(text);

//     // Generate voice file
//     const generatedPath = await ttsLive(reply); 
//     const fileName = path.basename(generatedPath);
//     const audioUrl = `/static/${fileName}`;

//     res.json({ reply, audioUrl });
//   } catch (err) {
//     console.error("Error in Majdi route:", err);
//     const fallback =
//       "Mujhe abhi voice generate karne mein dikkat aa rahi hai. Kripya thodi der mein try karo.";
//     res.status(500).json({ error: err.message || "Server error", reply: fallback });
//   }
// });

// export default router;



import express from "express";
import { getAIResponse } from "../speechToText.js";
import { ttsLive } from "../ttsLive.js";
import path from "path";

const router = express.Router();

router.post("/ask", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });

  try {
    console.log(`👂 User said: ${text}`);
    const reply = await getAIResponse(text);
    console.log(`🤖 AI replied: ${reply}`);

    // Try TTS but don't fail the entire request if it fails
    let audioUrl = null;
    try {
      const generatedPath = await ttsLive(reply);
      const fileName = path.basename(generatedPath);
      audioUrl = `/static/${fileName}`;
      console.log(`✅ TTS successful: ${audioUrl}`);
    } catch (ttsError) {
      console.log("⚠️ TTS failed, but continuing with text response only");
      // This is not a critical error - continue with text response
    }

    // ✅ Always return 200 status with response
    res.status(200).json({ reply, audioUrl });

  } catch (err) {
    console.error("❌ Error in Majdi route:", err);
    
    // ✅ Return 200 instead of 500 to ensure frontend gets the response
    res.status(200).json({ 
      reply: "Mujhe abhi response generate karne mein dikkat aa rahi hai. Kripya thodi der mein try karo.",
      audioUrl: null 
    });
  }
});

// Add debug endpoint to check Python
router.get("/debug/python", async (req, res) => {
  try {
    const { spawn } = require("child_process");
    const pythonCmd = process.env.PYTHON_PATH || "python3";
    
    console.log(`🔧 Testing Python: ${pythonCmd}`);
    
    const py = spawn(pythonCmd, ["--version"]);

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (data) => { stdout += data.toString(); });
    py.stderr.on("data", (data) => { stderr += data.toString(); });

    py.on("close", (code) => {
      if (code === 0) {
        res.json({ 
          success: true, 
          version: stdout.trim(),
          message: "Python is working correctly!",
          pythonCmd: pythonCmd
        });
      } else {
        res.json({ 
          success: false, 
          error: stderr || stdout,
          message: "Python is not available",
          pythonCmd: pythonCmd
        });
      }
    });

    py.on("error", (err) => {
      res.json({ 
        success: false, 
        error: err.message,
        message: "Failed to spawn Python process",
        pythonCmd: pythonCmd
      });
    });

  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message,
      message: "Internal server error in Python debug"
    });
  }
});

export default router;