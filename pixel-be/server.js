// const express = require('express');
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const cors = require('cors');
// require('dotenv').config();

// const app = express();
// const corsOptions = {
//   origin: '*', // During dev, allow everything
//   methods: 'GET,POST',
//   allowedHeaders: 'Content-Type',
// };
// app.use(cors(corsOptions));


// app.use(express.json({ limit: '50mb' })); // Allow large image data

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);



// app.get('/', (req, res) => res.send("Pixel Backend is Online! 👾"));
// app.get('/test-models', async (req, res) => {
//   try {
//     const listModels = await genAI.listModels();
//     console.log("AVAILABLE MODELS:");
//     listModels.models.forEach(m => console.log(`- ${m.name}`));
//     res.json(listModels);
//   } catch (error) {
//     console.error("Could not list models:", error);
//     res.status(500).send(error.message);
//   }
// });

// app.post('/analyze', async (req, res) => {
//   try {
//     const { image } = req.body;
// // Try 'gemini-1.5-flash-latest' or just 'gemini-1.5-flash'
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
//     const prompt = "Analyze this screenshot. What is happening here? Give a concise explanation.";
    
//     const result = await model.generateContent([
//       prompt,
//       { inlineData: { data: image, mimeType: "image/png" } }
//     ]);

//     const response = await result.response;
//     res.json({ text: response.text() });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("AI Analysis failed");
//   }
// });

// app.listen(5001, () => console.log('Backend running on port 5001'));



const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. Precise CORS and Body Limit
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' }));

// 2. Initialize GenAI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Ensure 'async' is present here!
app.post('/analyze', async (req, res) => { 
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: "No image data received" });
    }

const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = "What is in this screenshot? Be specific.";
    
    const imagePart = {
      inlineData: {
        data: image,
        mimeType: "image/png",
      },
    };

    // 'await' is only allowed because we used 'async' above
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    res.json({ text });
  } catch (error) {
    console.error("GEMINI ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(5001, () => console.log('🚀 Pixel Brain is live on port 5001'));