import { OpenAI } from 'openai';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 900 });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pytanie } = req.body;

    // Sprawdź cache
    const cachedResult = cache.get(pytanie);
    if (cachedResult) {
      return res.status(200).json(cachedResult);
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

    // Zapisz w cache
    cache.set(pytanie, result);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}