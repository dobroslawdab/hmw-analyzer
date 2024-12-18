const OpenAI = require('openai');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 900 });

const SYSTEM_PROMPT = `Jesteś ekspertem w analizie pytań "Jak moglibyśmy" (How Might We) używanych w Design Sprint.
Twoim zadaniem jest analiza i delikatne ulepszenie pytania przy zachowaniu oryginalnego sensu i intencji.

Zasady:
1. Zachowaj oryginalny sens i kontekst pytania
2. Wprowadzaj tylko niezbędne poprawki
3. Upewnij się, że pytanie zaczyna się od "Jak moglibyśmy"
4. Nie zmieniaj kluczowych elementów i szczegółów pytania
5. Zachowaj wszystkie specyficzne terminy i nazwy własne

Zwróć strukturę JSON zawierającą:
- ulepszonePytanie: poprawiona wersja z minimalnymi zmianami
- oryginalnyKontekst: true/false czy zachowano oryginalny kontekst
- sugestie: lista konkretnych sugestii dotyczących pytania
- ocenaJakosci: liczba 0-1 określająca jakość pytania
- problemyDoPoprawy: lista konkretnych elementów wymagających poprawy`;

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

    // Próba sparsowania odpowiedzi jako JSON
    try {
      const result = JSON.parse(completion.choices[0].message.content);
      cache.set(pytanie, result);
      return res.status(200).json(result);
    } catch (parseError) {
      // Jeśli parsowanie się nie powiedzie, zwróć surową odpowiedź w ustrukturyzowanej formie
      const result = {
        ulepszonePytanie: completion.choices[0].message.content,
        oryginalnyKontekst: true,
        sugestie: [],
        ocenaJakosci: 0.5,
        problemyDoPoprawy: ['Nie udało się przeanalizować odpowiedzi']
      };
      return res.status(200).json(result);
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