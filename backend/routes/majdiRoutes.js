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

    // Generate voice file
    const generatedPath = await ttsLive(reply); 
    const fileName = path.basename(generatedPath);
    const audioUrl = `/static/${fileName}`;

    res.json({ reply, audioUrl });
  } catch (err) {
    console.error("Error in Majdi route:", err);
    const fallback =
      "Mujhe abhi voice generate karne mein dikkat aa rahi hai. Kripya thodi der mein try karo.";
    res.status(500).json({ error: err.message || "Server error", reply: fallback });
  }
});

export default router;
