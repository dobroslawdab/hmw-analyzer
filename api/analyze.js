// api/analyze.js

const OpenAI = require('openai');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 900 });

const SYSTEM_PROMPT = `Jesteś ekspertem w analizie pytań "Jak moglibyśmy" (How Might We) używanych w Design Sprint.
Twoim zadaniem jest analiza i ewaluacja pytania według następujących kryteriów:

KRYTERIA OCENY:
1. Poprawne rozpoczęcie
   - Pytanie MUSI zaczynać się od "Jak moglibyśmy"
   - Jest to kluczowe dla zachęcenia do eksploracji rozwiązań

2. Odpowiedni poziom ogólności
   - Nie może być zbyt ogólne (np. "jak moglibyśmy poprawić wszystko")
   - Nie może być zbyt szczegółowe (np. sugerować konkretne rozwiązanie)
   - Powinno zostawiać przestrzeń na różne rozwiązania

3. Orientacja na działanie
   - Pytanie powinno sugerować możliwość działania
   - Powinno być sformułowane w sposób umożliwiający generowanie rozwiązań

4. Koncentracja na użytkowniku
   - Pytanie powinno odnosić się do potrzeb użytkownika/klienta
   - Powinno skupiać się na rezultatach dla użytkownika

Przeanalizuj pytanie i zwróć JSON zawierający:
{
  "ulepszonePytanie": "poprawiona wersja pytania",
  "oryginalnyKontekst": true/false,
  "ocenaJakosci": 0-1,
  "kryteria": {
    "poprawnePoczatek": true/false,
    "odpowiedniPoziom": true/false,
    "orientacjaNaDzialanie": true/false,
    "koncentracjaNaUzytkowniku": true/false
  },
  "sugestie": ["lista sugestii poprawy"],
  "problemyDoPoprawy": ["lista konkretnych problemów"],
  "mocneStrony": ["lista mocnych stron pytania"]
}`;

const handler = async (req, res) => {
  // Dodaj nagłówki CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Obsługa OPTIONS dla CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Test endpoint
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'API is working!' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pytanie } = req.body;

    if (!pytanie) {
      return res.status(400).json({ error: 'Pytanie jest wymagane' });
    }

    // Sprawdź cache
    const cachedResult = cache.get(pytanie);
    if (cachedResult) {
      return res.status(200).json(cachedResult);
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const userPrompt = `Przeanalizuj następujące pytanie "Jak moglibyśmy":
"${pytanie}"

Pamiętaj o zachowaniu oryginalnego sensu i kontekstu.
Skup się na minimalnych, niezbędnych poprawkach.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    try {
      const result = JSON.parse(completion.choices[0].message.content);
      cache.set(pytanie, result);
      return res.status(200).json(result);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return res.status(500).json({ 
        error: 'Failed to parse AI response',
        details: parseError.message 
      });
    }
  } catch (error) {
    console.error('Error:', error);
    
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Przekroczono limit zapytań do AI. Spróbuj ponownie za chwilę.'
      });
    }
    
    if (error.response?.status === 400) {
      return res.status(400).json({
        error: 'Nieprawidłowe zapytanie. Sprawdź treść pytania.'
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
};

module.exports = handler;