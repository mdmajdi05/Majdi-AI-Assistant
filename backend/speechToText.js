import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getAIResponse(userText) {
  try {
    // Get current time for context
    const currentTime = new Date();
    const hour = currentTime.getHours();
    let timeContext = "";
    
    if (hour < 12) timeContext = "Good morning! ";
    else if (hour < 17) timeContext = "Good afternoon! ";
    else if (hour < 21) timeContext = "Good evening! ";
    else timeContext = "Good night! ";

    // Enhanced system prompt for better responses
    const systemPrompt = `You are Majdi, a friendly AI assistant who speaks naturally in Hinglish (Hindi + English mix). You're like a helpful friend who understands both languages perfectly.

Key characteristics:
- Speak naturally like a real person, not a robot
- Use Hinglish naturally - mix Hindi and English as people actually do
- Keep responses short and conversational (1-2 sentences max)
- Be warm, friendly, and helpful
- Don't be formal or robotic - be casual and natural
- If you don't understand, ask in a friendly way
- Current time context: ${timeContext}
- If asked about time, respond with the current time in a friendly way

Examples of natural responses:
- "Haan bilkul! Main aapki help kar sakti hun."
- "Achha question hai! Let me tell you..."
- "Hmm, interesting! Main sochti hun..."

Remember: You're talking to a friend, not giving a formal presentation. Be natural and conversational.`;

    // Handle time-related queries directly without calling API
    const timeRegex = /(?:time|samay|waqt|abhi kitne baje|kitna baj|time kya|kya time)\b/i;
    if (timeRegex.test(userText.toLowerCase())) {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      const timeString = `${hour12}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;
      return `Abhi ${timeString} baj rahe hain.`;
    }

    // Set timeout for API call to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('API request timeout')), 10000);
    });

    // Create API request
    const apiPromise = client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText }
      ],
      max_tokens: 300, // Reduced for more concise responses
      temperature: 0.8, // Slightly higher for more natural responses
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    // Race between timeout and API response
    const response = await Promise.race([apiPromise, timeoutPromise]);

    const text = response.choices?.[0]?.message?.content;
    return text ?? "Mujhe samajh nahi aaya — dobara bolo.";
  } catch (err) {
    console.error("AI Error:", err);
    if (err?.code === "rate_limit_exceeded" || err?.status === 429) {
      return "Mujhe abhi AI quota khatam ho raha hai — thodi der baad try karo.";
    }
    if (err.message === 'API request timeout') {
      return "Server response time out ho gaya. Kripya dobara koshish karein.";
    }
    // Fallback responses for common queries when API fails
    const lowerText = userText.toLowerCase();
    if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey') || lowerText.includes('namaste')) {
      return "Namaste! Kaise ho aap?";
    }
    if (lowerText.includes('how are you') || lowerText.includes('kaise ho')) {
      return "Main bilkul theek hun, aap batao?";
    }
    return "AI se response nahi aa paaya, kripya dobara koshish karo.";
  }
}
