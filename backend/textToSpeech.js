import edgeTTS from "edge-tts";
import fs from "fs";
import { exec } from "child_process";

export const speakText = async (text) => {
  try {
    console.log("🔊 Majdi is speaking...");

    // Microsoft Edge TTS settings
    const filePath = "./output.mp3";

    // Available voices: hi-IN-SwaraNeural, en-US-JennyNeural etc.
    const VOICE = "hi-IN-SwaraNeural"; // Hinglish style
    const rate = "+0%"; // Speech rate (can be -20%, +20%, etc.)
    const volume = "+0%"; // Volume adjustment

    // Convert text to speech
    const tts = await edgeTTS.synthesize({
      text,
      voice: VOICE,
      rate,
      volume,
    });

    // Save as MP3
    await fs.promises.writeFile(filePath, Buffer.from(tts.audioBuffer));

    console.log("✅ Speech saved:", filePath);

    // Play the audio automatically
    const player = process.platform === "win32" ? "start" : "afplay";
    exec(`${player} ${filePath}`);
  } catch (error) {
    console.error("❌ TTS Error:", error);
  }
};
