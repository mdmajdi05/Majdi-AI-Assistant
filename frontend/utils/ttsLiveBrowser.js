export function speakTextBrowser(text, lang = 'hi-IN') {
  if (!text || typeof text !== 'string' || !('speechSynthesis' in window)) {
    console.error('Speech synthesis not available or invalid text');
    return;
  }
  
  try {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create utterance
    const ut = new SpeechSynthesisUtterance(text);
    
    // Set properties
    ut.lang = lang; // Use provided language or default to Hindi
    ut.rate = 0.9; // Slightly slower for better clarity
    ut.pitch = 1.1; // Slightly higher pitch for female voice
    ut.volume = 0.9;
    
    // Get available voices
    let voices = window.speechSynthesis.getVoices();
    
    // Handle browsers where voices load asynchronously
    if (voices.length === 0) {
      console.log('No voices available yet, waiting for voices to load...');
      window.speechSynthesis.onvoiceschanged = function() {
        voices = window.speechSynthesis.getVoices();
        selectVoiceAndSpeak();
      };
    } else {
      selectVoiceAndSpeak();
    }
    
    function selectVoiceAndSpeak() {
      // First try to find a voice matching the exact language code
      let selectedVoice = voices.find(v => 
        v.lang && v.lang.toLowerCase() === lang.toLowerCase()
      );
      
      // If no exact match, try to find a voice matching the language part (hi from hi-IN)
      if (!selectedVoice) {
        const langPrefix = lang.split('-')[0].toLowerCase();
        selectedVoice = voices.find(v => 
          v.lang && v.lang.toLowerCase().startsWith(langPrefix)
        );
      }
      
      // If still no match, try to find an Indian voice or a female voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.lang && (v.lang.toLowerCase().includes('-in') || 
          v.name.toLowerCase().includes('indian')) && 
          (v.name.toLowerCase().includes('female') || 
           v.name.toLowerCase().includes('woman') || 
           v.name.toLowerCase().includes('swara'))
        ) || voices.find(v => 
          v.lang && v.lang.toLowerCase().includes('-in')
        ) || voices.find(v => 
          v.name.toLowerCase().includes('female') || 
          v.name.toLowerCase().includes('woman')
        ) || voices[0];
      }
      
      if (selectedVoice) {
        ut.voice = selectedVoice;
        console.log(`Using voice: ${selectedVoice.name} (${selectedVoice.lang})`);
      } else {
        console.log('No suitable voice found, using default voice');
      }
      
      // Add error handling
      ut.onerror = (event) => {
        console.error('Speech synthesis error:', event);
      };
      
      // Speak the text
      window.speechSynthesis.speak(ut);
    }
  } catch (error) {
    console.error('Error in speech synthesis:', error);
  }
}
