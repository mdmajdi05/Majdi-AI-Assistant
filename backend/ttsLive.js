// import { spawn } from "child_process";
// import path from "path";
// import fs from "fs";

// export function ttsLive(text) {
//   return new Promise((resolve, reject) => {
//     try {
//       const envPython = process.env.PYTHON_PATH;
//       const defaultVenvPython = path.join(process.cwd(), "python_tts", "venv", "Scripts", "python.exe");
//       const pythonCmd = envPython || defaultVenvPython || "python";

//       const script = path.join(process.cwd(), "python_tts", "tts.py");
//       const py = spawn(pythonCmd, [script, text], { windowsHide: true });

//       let stdout = "";
//       let stderr = "";

//       py.stdout.on("data", (data) => { stdout += data.toString(); });
//       py.stderr.on("data", (data) => { stderr += data.toString(); });

//       py.on("close", (code) => {
//         if (code === 0) {
//           const filePath = stdout.trim();
//           if (fs.existsSync(filePath)) resolve(filePath);
//           else reject(new Error(`TTS generated path not found: ${filePath}`));
//         } else {
//           reject(new Error(`Python TTS failed (code ${code}): ${stderr || stdout}`));
//         }
//       });

//       py.on("error", (err) => { reject(err); });
//     } catch (err) {
//       reject(err);
//     }
//   });
// }



//new

import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export function ttsLive(text) {
  return new Promise((resolve, reject) => {
    try {
      // Cross-platform Python path detection
      let pythonCmd;
      
      // Use environment variable if set
      if (process.env.PYTHON_PATH) {
        pythonCmd = process.env.PYTHON_PATH;
      } else {
        // Determine the correct Python path based on platform
        const isWindows = process.platform === "win32";
        const venvPath = path.join(process.cwd(), "python_tts", "venv");
        
        if (isWindows) {
          pythonCmd = path.join(venvPath, "Scripts", "python.exe");
        } else {
          pythonCmd = path.join(venvPath, "bin", "python");
        }
        
        // Fallback to system Python if virtual environment doesn't exist
        if (!fs.existsSync(pythonCmd)) {
          pythonCmd = "python3"; // Use python3 on Linux/Mac
        }
      }

      const script = path.join(process.cwd(), "python_tts", "tts.py");
      console.log(`Using Python: ${pythonCmd}`);
      console.log(`Running script: ${script}`);
      
      const py = spawn(pythonCmd, [script, text], { 
        windowsHide: true,
        cwd: process.cwd() // Set current working directory
      });

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

      py.on("error", (err) => { 
        console.error("Spawn error:", err);
        reject(err); 
      });
    } catch (err) {
      console.error("TTS error:", err);
      reject(err);
    }
  });
}