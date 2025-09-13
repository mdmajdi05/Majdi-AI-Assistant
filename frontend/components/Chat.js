




// new code 

import { useEffect, useRef, useState } from "react";
import { speakTextBrowser } from "../utils/ttsLiveBrowser";
//const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"; pehle ye tha
// Fix API_BASE parsing to handle comma-separated URLs
//ab yaha se 
const API_BASE_RAW = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
const API_BASE = API_BASE_RAW.split(",")[0].trim(); // Use the first URL in the list

//ab yaha tk hai

export default function Chat() {
  const [listening, setListening] = useState(false);
  const [hotwordDetected, setHotwordDetected] = useState(false);
  const [chatLog, setChatLog] = useState([
    { sender: "ai", text: "Namaste! I'm Majdi AI, your personal assistant. Main aapki kaise madad kar sakti hun? Aap 'hey majdi' bol kar ya 'Activate' button dabakar baat kar sakte hain." }
  ]);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [idleTimeLeft, setIdleTimeLeft] = useState(60);
  const [manual, setManual] = useState("");
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  
  const recognitionRef = useRef(null);
  const continuousRecRef = useRef(null);
  const idleTimeoutRef = useRef(null);
  const idleIntervalRef = useRef(null);
  const voiceQueueRef = useRef([]);
  const playingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isActiveRef = useRef(false);
  const lastHotwordTimeRef = useRef(0);
  const queryTimeoutRef = useRef(null);
  const accumulatedQueryRef = useRef("");
  const recognitionModeRef = useRef('hotword');
  const vadTimeoutRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const lastRecognitionRestartRef = useRef(0);

  // Keep ref in sync with state
  useEffect(() => {
    isActiveRef.current = isActive;
    isSpeakingRef.current = isSpeaking;
  }, [isActive, isSpeaking]);

  // Simplified hotword detection
  const detectHotword = (transcript) => {
    const lower = transcript.toLowerCase().trim();
    
    const hotwords = [
      "hey majdi", "majdi", "activate", "एक्टिवेट", "मजदी",
      "hey magic", "hey madi", "majdee", "majdi ai", "ai",
      "start listening", "wake up", "हे मजदी", "हेलो मजदी"
    ];
    
    for (const hotword of hotwords) {
      if (lower.includes(hotword)) {
        return hotword;
      }
    }
    
    return null;
  };

  // Get time-based greeting
  const getTimeBasedGreeting = () => {
    const greetings = [
      "Namaste! Main yahan hun, aapka kya kaam hai?",
      "Hello! Main aapki madad ke liye taiyar hun. Bataiye kya chahiye?",
      "Hi there! Main sun rahi hun, aap kya kehna chahte hain?",
      "Hey! Main yahan hun. Aapka question kya hai?",
      "Hello! Main aapki baat sun rahi hun. Boliye kya help chahiye?"
    ];
    
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  // Reset idle timer
  const resetIdleTimer = () => {
    setListening(true);
    setIdleTimeLeft(60);
    
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    
    if (idleIntervalRef.current) {
      clearInterval(idleIntervalRef.current);
    }
    
    idleIntervalRef.current = setInterval(() => {
      setIdleTimeLeft(prev => {
        if (prev <= 1) {
          goToSleep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    idleTimeoutRef.current = setTimeout(() => {
      goToSleep();
    }, 60000);
  };

  // Go to sleep function
  const goToSleep = () => {
    isActiveRef.current = false;
    setIsActive(false);
    setListening(false);
    setHotwordDetected(false);
    setIdleTimeLeft(60);
    recognitionModeRef.current = 'hotword';
    setIsUserSpeaking(false);
    
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    if (idleIntervalRef.current) {
      clearInterval(idleIntervalRef.current);
    }
    if (queryTimeoutRef.current) {
      clearTimeout(queryTimeoutRef.current);
    }
    if (vadTimeoutRef.current) {
      clearTimeout(vadTimeoutRef.current);
    }
    
    playBeep();
    
    setChatLog(prev => [...prev, { 
      sender: "ai", 
      text: "I'm going to sleep now. Say 'hey majdi' or click 'Activate' to wake me up again." 
    }]);
  };

  // Stop active mode manually
  const stopActiveMode = () => {
    goToSleep();
  };

  // Activate continuous listening mode
  const activateContinuousMode = () => {
    if (isProcessingRef.current || isActiveRef.current) return;
    
    isActiveRef.current = true;
    setIsActive(true);
    setListening(true);
    setHotwordDetected(true);
    recognitionModeRef.current = 'query';
    resetIdleTimer();
    
    playBeep();
    
    const greeting = getTimeBasedGreeting();
    setChatLog(prev => [...prev, { sender: "ai", text: greeting }]);
    
    voiceQueueRef.current.push({ url: null, text: greeting, fallbackLang: 'hi-IN' });
    playVoiceQueue();
  };

  // Voice Activity Detection (VAD) - Detect when user stops speaking
  const handleVoiceActivity = (transcript) => {
    if (!isActiveRef.current || isSpeakingRef.current) return;
    
    // User is speaking
    setIsUserSpeaking(true);
    resetIdleTimer();
    
    // Accumulate the query
    if (transcript) {
      accumulatedQueryRef.current += " " + transcript;
    }
    
    // Clear any existing timeout
    if (vadTimeoutRef.current) {
      clearTimeout(vadTimeoutRef.current);
    }
    
    // Set timeout to detect when user stops speaking
    vadTimeoutRef.current = setTimeout(() => {
      setIsUserSpeaking(false);
      
      if (accumulatedQueryRef.current.trim() && !isProcessingRef.current) {
        processUserQuery(accumulatedQueryRef.current.trim());
        accumulatedQueryRef.current = "";
      }
    }, 1500); // 1.5 seconds of silence indicates user stopped speaking
  };

  // Initialize speech recognition with improved error handling
  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return null;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "hi-IN";
    rec.maxAlternatives = 5;
    
    rec.onstart = () => {
      console.log("✅ Continuous recognition started");
    };

    rec.onresult = (evt) => {
      // Skip processing if assistant is speaking (Echo Cancellation)
      if (isSpeakingRef.current) return;
      
      let finalTranscript = "";
      
      for (let i = evt.resultIndex; i < evt.results.length; ++i) {
        if (evt.results[i].isFinal) {
          finalTranscript += evt.results[i][0].transcript;
        }
      }
      
      const fullTranscript = finalTranscript.trim();

      if (fullTranscript.length > 0) {
        console.log("🎤 Heard:", fullTranscript, "| Active:", isActiveRef.current, "| Mode:", recognitionModeRef.current);
        
        // Check for hotword if not active
        if (!isActiveRef.current && recognitionModeRef.current === 'hotword') {
          const detectedHotword = detectHotword(fullTranscript);
          if (detectedHotword) {
            const now = Date.now();
            if (now - lastHotwordTimeRef.current > 1000) {
              lastHotwordTimeRef.current = now;
              playBeep();
              activateContinuousMode();
              return;
            }
          }
        }
        
        // If active and in query mode, process the query with VAD
        if (isActiveRef.current && recognitionModeRef.current === 'query') {
          handleVoiceActivity(fullTranscript);
        }
      }
    };

    rec.onerror = (e) => {
      console.error("Recognition error:", e);
      
      if (e.error === 'not-allowed') {
        setPermissionsReady(false);
        return;
      }
      
      // Restart recognition on error with exponential backoff
      const now = Date.now();
      if (now - lastRecognitionRestartRef.current > 2000) { // Prevent too frequent restarts
        lastRecognitionRestartRef.current = now;
        
        setTimeout(() => {
          try {
            if (permissionsReady && !isProcessingRef.current) {
              rec.start();
              console.log("🔄 Restarting recognition after error");
            }
          } catch (e) {
            console.error("Failed to restart recognition:", e);
          }
        }, 1000);
      }
    };

    rec.onend = () => {
      console.log("🔄 Recognition ended, restarting...");
      
      if (permissionsReady && !isProcessingRef.current) {
        // Optimized restart with delay to prevent rapid cycling
        setTimeout(() => {
          try {
            rec.start();
          } catch (e) {
            console.error("Failed to restart recognition:", e);
          }
        }, 500);
      }
    };

    continuousRecRef.current = rec;
    return rec;
  };

  // Start speech recognition when permissions are ready
  useEffect(() => {
    if (!permissionsReady) return;

    const rec = initializeSpeechRecognition();
    if (!rec) {
      return;
    }

    recognitionRef.current = rec;
    
    // Start recognition with a small delay
    setTimeout(() => {
      try {
        rec.start();
        console.log("✅ Speech recognition started successfully");
      } catch (e) {
        console.error("Could not start continuous recognition:", e);
      }
    }, 500);

    return () => {
      if (rec) {
        try {
          rec.stop();
        } catch (e) {}
      }
    };
  }, [permissionsReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
      if (queryTimeoutRef.current) clearTimeout(queryTimeoutRef.current);
      if (vadTimeoutRef.current) clearTimeout(vadTimeoutRef.current);
    };
  }, []);

  // Enhanced beep function
  function playBeep() {
    try {
      const beep = new Audio("/beep.mp3");
      beep.volume = 0.8;
      beep.play().catch(() => {});
    } catch (e) {
      console.log("Beep error:", e);
    }
  }

  // Process user query
  const processUserQuery = async (query) => {
    if (!query || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    
    // Add to chat immediately
    setChatLog((prev) => [...prev, { sender: "user", text: query }]);
    
    // Send to backend
    await sendToBackend(query);
    
    isProcessingRef.current = false;
  };

  // Send query to backend
  async function sendToBackend(text) {
    try {
      console.log("📡 Sending to backend:", text);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // टाइमआउट को 60 सेकंड तक बढ़ाया गया
      
      const res = await fetch(`${API_BASE}/api/majdi/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("🔗 Backend response:", data);
      
      const botText = data.reply || "Majdi ko jawab nahi mila.";
      setChatLog((prev) => [...prev, { sender: "ai", text: botText }]);

      if (data.audioUrl) {
        voiceQueueRef.current.push({
          url: `${API_BASE}${data.audioUrl}`,
          text: botText,
          fallbackLang: 'hi-IN'
        });
      } else {
        voiceQueueRef.current.push({ 
          url: null, 
          text: botText,
          fallbackLang: 'hi-IN'
        });
      }
      playVoiceQueue();
    } catch (err) {
      console.error("Backend error:", err);
      let errorText = "Majdi ko call karte waqt error aaya.";
      
      if (err.name === "AbortError") {
        errorText = "Connection timeout ho gaya. Kripya internet connection check karein ya thodi der baad try karein.";
      }
      
      setChatLog((prev) => [...prev, { sender: "ai", text: errorText }]);
      voiceQueueRef.current.push({
        url: null,
        text: errorText,
        fallbackLang: 'hi-IN'
      });
      playVoiceQueue();
    }
  }

  // Voice queue management with optimized recognition restart
  function playVoiceQueue() {
    if (playingRef.current || voiceQueueRef.current.length === 0) return;

    playingRef.current = true;
    setIsSpeaking(true);

    const next = voiceQueueRef.current.shift();

    const playNext = () => {
      playingRef.current = false;
      setIsSpeaking(false);
      
      // Optimized recognition restart after TTS completes
      if (isActiveRef.current && continuousRecRef.current) {
        setTimeout(() => {
          try {
            if (continuousRecRef.current.state === 'inactive') {
              continuousRecRef.current.start();
              console.log("🔄 Recognition restarted after TTS");
            }
          } catch (e) {
            console.error("Error restarting recognition after TTS:", e);
          }
        }, 300);
      }
      
      // Play next in queue
      setTimeout(() => {
        if (voiceQueueRef.current.length > 0) {
          playVoiceQueue();
        }
      }, 300);
    };

    if (next.url) {
      try {
        const audio = new Audio(next.url);
        audio.preload = "auto";

        audio.play()
          .then(() => {
            audio.onended = playNext;
            audio.onerror = () => {
              speakTextBrowser(next.text, next.fallbackLang);
              setTimeout(playNext, Math.max(1500, next.text.length * 80));
            };
          })
          .catch(() => {
            speakTextBrowser(next.text, next.fallbackLang);
            setTimeout(playNext, Math.max(1500, next.text.length * 80));
          });
      } catch (error) {
        speakTextBrowser(next.text, next.fallbackLang);
        setTimeout(playNext, Math.max(1500, next.text.length * 80));
      }
    } else {
      speakTextBrowser(next.text, next.fallbackLang);
      setTimeout(playNext, Math.max(1500, next.text.length * 80));
    }
  }

  // Manual input
  const sendManual = async () => {
    if (!manual.trim()) return;
    setChatLog((prev) => [...prev, { sender: "user", text: manual }]);
    await sendToBackend(manual);
    setManual("");
  };

  // Test backend function
  const testBackend = async () => {
    await sendToBackend("Hello, how are you?");
  };

  // Enable permissions
  const enablePermissions = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia not supported in this browser");
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionsReady(true);
      
      setTimeout(() => {
        playBeep();
      }, 200);
      
    } catch (e) {
      let errorMessage = "Microphone permission is required for voice commands.";
      
      if (e.name === 'NotAllowedError') {
        errorMessage = "Microphone access was denied. Please allow microphone access in your browser settings and refresh the page.";
      } else if (e.name === 'NotFoundError') {
        errorMessage = "No microphone found. Please connect a microphone and try again.";
      } else if (e.name === 'NotSupportedError') {
        errorMessage = "Your browser doesn't support microphone access. Please use Chrome, Firefox, or Edge.";
      }
      
      alert(errorMessage);
    }
  };

  // Manual speak
  const manualSpeak = async () => {
    try {
      if (isSpeaking || isProcessingRef.current) {
        return;
      }
      
      if (!permissionsReady) {
        await enablePermissions();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!permissionsReady) {
          return;
        }
      }
      
      if (!isActiveRef.current) {
        activateContinuousMode();
      } else {
        setListening(true);
        playBeep();
      }
    } catch (error) {
      console.error("Manual speak error:", error);
    }
  };

  return (
    <div style={{ 
      width: "100vw",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
      color: "#00ff00",
      fontFamily: "'Courier New', monospace",
      padding: "20px",
      boxSizing: "border-box"
    }}>
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 5px #00ff00, 0 0 10px #00ff00, 0 0 15px #00ff00; }
          50% { box-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00; }
        }
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes matrix {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .active-glow {
          animation: glow 2s ease-in-out infinite;
        }
        .scan-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #00ff00, transparent);
          animation: scan 3s linear infinite;
        }
        .matrix-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: -1;
        }
        .matrix-char {
          position: absolute;
          color: #00ff00;
          font-size: 14px;
          animation: matrix 10s linear infinite;
          opacity: 0.2;
        }
        .terminal-text {
          color: #00ff00;
          text-shadow: 0 0 5px #00ff00;
          animation: flicker 3s ease-in-out infinite;
        }
        .status-indicator {
          position: relative;
          overflow: hidden;
        }
        .hack-button {
          background: linear-gradient(45deg, #0a0a0a, #1a1a2e);
          border: 2px solid #00ff00;
          color: #00ff00;
          text-shadow: 0 0 5px #00ff00;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .hack-button:hover {
          box-shadow: 0 0 20px #00ff00;
          transform: translateY(-2px);
          animation: pulse 1s infinite;
        }
        .hack-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .active-mode {
          background: linear-gradient(45deg, #00ff00, #00cc00);
          color: #000;
          text-shadow: none;
          animation: glow 1s ease-in-out infinite;
        }
        .stop-button {
          background: linear-gradient(45deg, #ff0000, #cc0000);
          border: 2px solid #ff0000;
          color: #fff;
          text-shadow: 0 0 5px #ff0000;
          animation: pulse 1s infinite;
        }
        .stop-button:hover {
          box-shadow: 0 0 20px #ff0000;
        }
        .breathing {
          animation: breathe 2s ease-in-out infinite;
        }
        .listening-indicator {
          animation: pulse 1s infinite;
        }
        .user-speaking {
          animation: glow 1s ease-in-out infinite;
          color: #ffaa00;
        }
      `}</style>
      
      {/* Matrix background effect */}
      <div className="matrix-bg">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="matrix-char"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${10 + Math.random() * 10}s`
            }}
          >
            {String.fromCharCode(0x30A0 + Math.random() * 96)}
          </div>
        ))}
      </div>

      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <h1 className="terminal-text" style={{ 
            fontSize: "3em", 
            margin: 0,
            textShadow: "0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00"
          }}>
            MAJDI AI ASSISTANT
          </h1>
          <div style={{ 
            fontSize: "1em", 
            color: "#00aa00", 
            marginTop: 10,
            textShadow: "0 0 5px #00aa00"
          }}>
            [SYSTEM INITIALIZED] [READY FOR COMMANDS]
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "20px", alignItems: "start" }}>
          
          {/* Left Column - Chat */}
          <div>
            {/* Chat Terminal */}
            <div style={{ 
              minHeight: 400, 
              border: "2px solid #00ff00", 
              padding: 20, 
              marginBottom: 20, 
              overflowY: "auto", 
              maxHeight: 500,
              background: "rgba(0, 0, 0, 0.8)",
              borderRadius: "5px",
              position: "relative"
            }}>
              <div className="scan-line"></div>
              <div style={{ 
                position: "absolute", 
                top: 10, 
                left: 15, 
                fontSize: "0.8em", 
                color: "#00aa00",
                textShadow: "0 0 3px #00aa00"
              }}>
                [CHAT_LOG] [ACTIVE]
              </div>
              <div style={{ marginTop: 30 }}>
                {chatLog.map((m, i) => (
                  <div key={i} style={{ 
                    marginBottom: 15,
                    padding: "10px 0",
                    borderBottom: "1px solid rgba(0, 255, 0, 0.2)"
                  }}>
                    <span style={{ 
                      color: m.sender === "ai" ? "#00ff00" : "#00aaff",
                      textShadow: `0 0 5px ${m.sender === "ai" ? "#00ff00" : "#00aaff"}`,
                      fontWeight: "bold"
                    }}>
                      {m.sender === "ai" ? "[MAJDI_AI]" : "[USER]"}: 
                    </span>{" "}
                    <span style={{ color: "#ffffff" }}>{m.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Input Controls */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
                <input
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="[ENTER_COMMAND]"
                  style={{ 
                    flex: 1,
                    padding: 15, 
                    background: "rgba(0, 0, 0, 0.8)",
                    border: "2px solid #00ff00",
                    color: "#00ff00",
                    fontFamily: "'Courier New', monospace",
                    fontSize: "14px",
                    borderRadius: "3px",
                    textShadow: "0 0 3px #00ff00"
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') sendManual();
                  }}
                />
                <button
                  onClick={sendManual}
                  className="hack-button"
                  style={{ 
                    padding: "15px 25px",
                    fontSize: "14px",
                    fontWeight: "bold"
                  }}
                >
                  [SEND]
                </button>
                <button
                  onClick={testBackend}
                  className="hack-button"
                  style={{ 
                    padding: "15px 25px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    backgroundColor: "#ff6600",
                    borderColor: "#ff6600"
                  }}
                >
                  [TEST]
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Controls & Status */}
          <div>
            {/* Control Buttons */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                <button
                  onClick={manualSpeak}
                  disabled={isSpeaking || isProcessingRef.current}
                  className={`hack-button ${isActive ? 'active-mode' : ''}`}
                  style={{ 
                    padding: "20px 30px", 
                    fontSize: "18px",
                    fontWeight: "bold",
                    cursor: (isSpeaking || isProcessingRef.current) ? "not-allowed" : "pointer",
                    transform: (isSpeaking || isProcessingRef.current) ? "scale(0.95)" : "scale(1)",
                    animation: isSpeaking ? "pulse 1s infinite" : (isActive ? "glow 2s ease-in-out infinite" : "none"),
                    width: "100%"
                  }}
                >
                  {isSpeaking ? "[SPEAKING...]" : 
                   isProcessingRef.current ? "[PROCESSING...]" :
                   isActive ? "[ACTIVE_MODE]" : 
                   "[ACTIVATE_AI]"}
                </button>
                
                {isActive && (
                  <button
                    onClick={stopActiveMode}
                    className="stop-button"
                    style={{ 
                      padding: "15px 30px", 
                      fontSize: "16px",
                      fontWeight: "bold",
                      width: "100%"
                    }}
                  >
                    [STOP_LISTENING]
                  </button>
                )}
              </div>
            </div>

            {/* System Status Panel */}
            <div className="status-indicator" style={{ 
              padding: "20px", 
              background: "rgba(0, 0, 0, 0.8)",
              borderRadius: "5px",
              border: `2px solid ${isActive ? "#00ff00" : isSpeaking ? "#ffaa00" : permissionsReady ? "#00aaff" : "#ff6600"}`,
              position: "relative",
              marginBottom: 20
            }}>
              <div className="scan-line"></div>
              <div style={{ 
                position: "absolute", 
                top: 10, 
                left: 15, 
                fontSize: "0.8em", 
                color: "#00aa00",
                textShadow: "0 0 3px #00aa00"
              }}>
                [SYSTEM_STATUS] [MONITORING]
              </div>
              
              <div style={{ marginTop: 25 }}>
                <div style={{ marginBottom: 15 }}>
                  <span style={{ color: "#00ff00", fontWeight: "bold" }}>[STATUS]:</span>{" "}
                  <span style={{ 
                    color: isActive ? "#00ff00" : isSpeaking ? "#ffaa00" : permissionsReady ? "#00aaff" : "#ff6600",
                    fontWeight: "bold",
                    fontSize: "16px",
                    textShadow: `0 0 5px ${isActive ? "#00ff00" : isSpeaking ? "#ffaa00" : permissionsReady ? "#00aaff" : "#ff6600"}`
                  }}>
                    {isActive ? "[ACTIVE_MODE] [LISTENING]" : 
                     isSpeaking ? "[SPEAKING] [PROCESSING]" : 
                     isProcessingRef.current ? "[PROCESSING_QUERY]" :
                     permissionsReady ? "[READY] [AWAITING_COMMANDS]" : 
                     "[ERROR] [MICROPHONE_REQUIRED]"}
                  </span>
                </div>
                
                <div style={{ marginBottom: 15 }}>
                  <span style={{ color: "#00ff00", fontWeight: "bold" }}>[HOTWORDS]:</span>{" "}
                  <span style={{ color: "#ffaa00", fontWeight: "bold" }}>
                    "hey majdi", "majdi", "AI", "activate"
                  </span>
                </div>
                
                <div style={{ marginBottom: 15 }}>
                  <span style={{ color: "#00ff00", fontWeight: "bold" }}>[MICROPHONE]:</span>{" "}
                  <span style={{ 
                    color: permissionsReady ? "#00ff00" : "#ff6600",
                    textShadow: `0 0 3px ${permissionsReady ? "#00ff00" : "#ff6600"}`
                  }}>
                    {permissionsReady ? "[READY] [ACCESS_GRANTED]" : "[ERROR] [ACCESS_DENIED]"}
                  </span>
                </div>

                {isActive && (
                  <div style={{ marginBottom: 15 }}>
                    <span style={{ color: "#00ff00", fontWeight: "bold" }}>[IDLE_TIMER]:</span>{" "}
                    <span style={{ 
                      color: idleTimeLeft > 10 ? "#00ff00" : "#ff6600",
                      textShadow: `0 0 3px ${idleTimeLeft > 10 ? "#00ff00" : "#ff6600"}`,
                      animation: idleTimeLeft <= 10 ? "pulse 1s infinite" : "none"
                    }}>
                      {idleTimeLeft}s remaining
                    </span>
                  </div>
                )}

                {isActive && (
                  <div style={{ marginBottom: 15 }}>
                    <span style={{ color: "#00ff00", fontWeight: "bold" }}>[LISTENING]:</span>{" "}
                    <span className="breathing listening-indicator" style={{ color: "#00ff00" }}>
                      ● ● ●
                    </span>
                  </div>
                )}

                {isUserSpeaking && (
                  <div style={{ marginBottom: 15 }}>
                    <span style={{ color: "#00ff00", fontWeight: "bold" }}>[USER_SPEAKING]:</span>{" "}
                    <span className="user-speaking" style={{ fontWeight: "bold" }}>
                      [DETECTED] [PROCESSING]
                    </span>
                  </div>
                )}
              </div>
              
              {!permissionsReady && (
                <div style={{ marginTop: 20, textAlign: "center" }}>
                  <button
                    onClick={enablePermissions}
                    className="hack-button"
                    style={{ 
                      padding: "15px 25px", 
                      fontSize: "14px",
                      fontWeight: "bold",
                      width: "100%"
                    }}
                  >
                    [ENABLE_MICROPHONE]
                  </button>
                </div>
              )}
            </div>
            
            {/* Instructions Panel */}
            <div style={{ 
              padding: "20px", 
              background: "rgba(0, 0, 0, 0.6)",
              border: "1px solid #00aa00",
              borderRadius: "5px",
              fontSize: "12px"
            }}>
              <div style={{ 
                color: "#00aa00", 
                fontWeight: "bold", 
                marginBottom: 15,
                textShadow: "0 0 3px #00aa00"
              }}>
                [SYSTEM_INSTRUCTIONS]
              </div>
              <div style={{ color: "#ffffff", lineHeight: "1.6" }}>
                • Click "[ENABLE_MICROPHONE]" first<br/>
                • Say "hey majdi" or "activate" to start<br/>
                • Or click "[ACTIVATE_AI]" button<br/>
                • Once active, AI listens for 1 minute<br/>
                • Click "[STOP_LISTENING]" to stop<br/>
                • Make sure microphone is working<br/>
                • Check console (F12) for debug logs
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}