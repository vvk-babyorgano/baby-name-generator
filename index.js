const express = require('express');
const path = require('path');
require('dotenv').config();

const API_KEY = process.env.OPENROUTER_API_KEY;
const PORT = 3000;

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to parse AI response into names
function parseNames(text) {
  return text
    .split(/[\n,]/) // split by comma or newline
    .map(n => n.replace(/^\d+\.\s*/, '').trim()) // remove numbering
    .filter(n => n); // remove empty strings
}

// API endpoint
app.post('/generate', async (req, res) => {
  const data = req.body;

  const prompt = `Generate 10 baby names based on the following details:
    Gender: ${data.gender || 'Any'}
    Origin: ${data.origin || 'Any'}
    Religion: ${data.religion || 'Any'}
    Numerology: ${data.numerology || 'Any'}
    Start With: ${data.startWith || 'Any'}
    Associated Deity: ${data.deity || 'Any'}
    Meaning Category: ${data.meaningCategory || 'Any'}
    Return the names as a comma-separated list.`;

  try {
    // Fetch AI response
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const result = await response.json();
    console.log('OpenRouter API response:', JSON.stringify(result, null, 2));

    if (result.error) {
      return res.status(500).json({ error: `OpenRouter API error: ${result.error.message}` });
    }

    const text = result?.choices?.[0]?.message?.content || '';
    const names = parseNames(text);

    if (names.length === 0) {
      return res.status(200).json({ names: [], error: 'No names generated. Try changing filters.' });
    }

    res.json({ names });

  } catch (err) {
    console.error('Fetch error:', err.message);
    res.status(500).json({ error: 'Failed to generate names. Please try again later.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Loaded API Key:', API_KEY ? 'Yes' : 'No');
});
