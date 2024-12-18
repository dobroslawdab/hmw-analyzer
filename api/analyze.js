// server.js (Node.js + Express)
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 900 });

// Konfiguracja CORS - dodaj domenę swojego Webflow
app.use(cors({
  origin: 'https://twoja-domena-webflow.webflow.io',
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `Jesteś ekspertem w analizie pytań "Jak moglibyśmy" (How Might We) używanych w Design Sprint...`; // reszta prompta jak wcześniej

app.post('/api/analyze-hmw', async (req, res) => {
  try {
    const { pytanie } = req.body;
    
    // Sprawdź cache
    const cachedResult = cache.get(pytanie);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Przeanalizuj: "${pytanie}"` }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const result = JSON.parse(completion.choices[0].message.content);
    cache.set(pytanie, result);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});