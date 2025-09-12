import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export function ttsLive(text) {
  return new Promise((resolve, reject) => {
    try {
      const envPython = process.env.PYTHON_PATH;
      const defaultVenvPython = path.join(process.cwd(), "python_tts", "venv", "Scripts", "python.exe");
      const pythonCmd = envPython || defaultVenvPython || "python";

      const script = path.join(process.cwd(), "python_tts", "tts.py");
      const py = spawn(pythonCmd, [script, text], { windowsHide: true });

      let stdout = "";
      let stderr = "";

      py.stdout.on("data", (data) => { stdout += data.toString(); });
      py.stderr.on("data", (data) => { stderr += data.toString(); });

      py.on("close", (code) => {
        if (code === 0) {
          const filePath = stdout.trim();
          if (fs.existsSync(filePath)) resolve(filePath);
          else reject(new Error(`TTS generated path not found: ${filePath}`));
        } else {
          reject(new Error(`Python TTS failed (code ${code}): ${stderr || stdout}`));
        }
      });

      py.on("error", (err) => { reject(err); });
    } catch (err) {
      reject(err);
    }
  });
}
