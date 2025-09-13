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
      // Cross-platform Python detection
      let pythonCmd;
      
      // Use environment variable if set
      if (process.env.PYTHON_PATH) {
        pythonCmd = process.env.PYTHON_PATH;
      } else {
        // Detect platform and use appropriate Python command
        const isWindows = process.platform === "win32";
        pythonCmd = isWindows ? "python" : "python3";
      }

      const script = path.join(process.cwd(), "python_tts", "tts.py");
      
      console.log(`🔧 Using Python: ${pythonCmd}`);
      console.log(`🔧 Running script: ${script}`);
      
      const py = spawn(pythonCmd, [script, text]);

      let stdout = "";
      let stderr = "";

      py.stdout.on("data", (data) => { 
        stdout += data.toString();
        console.log(`🐍 Python stdout: ${data.toString()}`);
      });
      
      py.stderr.on("data", (data) => { 
        stderr += data.toString();
        console.error(`🐍 Python stderr: ${data.toString()}`);
      });

      py.on("close", (code) => {
        console.log(`🐍 Python process exited with code ${code}`);
        if (code === 0) {
          const filePath = stdout.trim();
          if (fs.existsSync(filePath)) {
            console.log(`✅ TTS file created: ${filePath}`);
            resolve(filePath);
          } else {
            console.error(`❌ TTS file not found: ${filePath}`);
            reject(new Error(`TTS generated path not found: ${filePath}`));
          }
        } else {
          console.error(`❌ TTS process failed: ${stderr || stdout}`);
          reject(new Error(`Python TTS failed (code ${code}): ${stderr || stdout}`));
        }
      });

      py.on("error", (err) => { 
        console.error("❌ Spawn error:", err);
        reject(err); 
      });
    } catch (err) {
      console.error("❌ TTS error:", err);
      reject(err);
    }
  });
}