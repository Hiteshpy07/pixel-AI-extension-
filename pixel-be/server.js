
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- ANALYZE SCREENSHOT ---
app.post('/analyze', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image data received" });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      "You are Pixel, a helpful AI assistant. Analyze this screenshot and describe what you see in detail.",
      { inlineData: { data: image, mimeType: "image/png" } }
    ]);

    const text = result.response.text();
    res.json({ text });
  } catch (error) {
    console.error("ANALYZE ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- FOLLOW-UP CHAT ---
app.post('/chat', async (req, res) => {
  try {
    const { history, message, analysis } = req.body;
    if (!message) return res.status(400).json({ error: "No message provided" });

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `You are Pixel, a helpful AI assistant. You already analyzed a screenshot and this was your finding: "${analysis}". Answer follow-up questions based on this context.`,
    });

    // Gemini requires history to start with 'user' role
    // Only pass history entries after the first user message
    const validHistory = [];
    let foundUser = false;
    for (const msg of history) {
      if (msg.role === 'user') foundUser = true;
      if (foundUser) validHistory.push({
        role: msg.role,
        parts: [{ text: msg.text }]
      });
    }

    const chat = model.startChat({ history: validHistory });
    const result = await chat.sendMessage(message);
    res.json({ text: result.response.text() });
  } catch (error) {
    console.error("CHAT ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/test-models', async (req, res) => {
  try {
    const listModels = await genAI.listModels();
    res.json(listModels);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(5001, () => console.log('🚀 Pixel Brain is live on port 5001'));