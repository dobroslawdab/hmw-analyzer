const OpenAI = require('openai');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 900 });

const handler = async (req, res) => {
  // Dodaj nagłówki CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Obsługa OPTIONS dla CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Test endpoint - dodaj prostą odpowiedź dla GET
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'API is working!' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pytanie } = req.body;

    // Logowanie dla debugowania
    console.log('Otrzymane pytanie:', pytanie);

    if (!pytanie) {
      return res.status(400).json({ error: 'Pytanie jest wymagane' });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Jesteś ekspertem w analizie pytań 'Jak moglibyśmy'. Zachowuj oryginalny sens i kontekst pytania."
        },
        {
          role: "user",
          content: `Przeanalizuj pytanie: "${pytanie}"`
        }
      ],
      temperature: 0.7,
    });

    const result = {
      ulepszonePytanie: completion.choices[0].message.content,
      oryginalnyKontekst: true
    };

    // Logowanie dla debugowania
    console.log('Wysyłam odpowiedź:', result);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack 
    });
  }
};

module.exports = handler;