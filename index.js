const express = require("express");
const path = require("path");
require("dotenv").config();

const API_KEY = process.env.OPENROUTER_API_KEY;
const PORT = 3000;

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Helper: Parse AI text into structured name + meaning pairs
function parseNamesWithMeanings(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line)
    .map((line) => {
      // Example formats: "1. Aarav - Peaceful, calm and wise"
      const match = line.match(/^\d*\.?\s*(.+?)\s*[-–:]\s*(.+)$/);
      if (match) {
        return { name: match[1].trim(), meaning: match[2].trim() };
      }
      return { name: line, meaning: "Meaning not available." };
    });
}

// API endpoint
app.post("/generate", async (req, res) => {
  const data = req.body;

  const randomSeed = Math.floor(Math.random() * 1000); // random number
  const prompt = `
  Generate 10 beautiful and meaningful baby names with their meanings based on the following details (unique output each time you generate, even with same inputs):
  Random seed: ${randomSeed}
  - Gender: ${data.gender || "Any"}
  - Origin: ${data.origin || "Any"}
  - Religion: ${data.religion || "Any"}
  - Numerology: ${data.numerology || "Any"}
  - Start With: ${
    data.startWith
      ? data.startWith
      : data.rashi
      ? `Letters from ${data.rashi}`
      : "Any"
  }
  - Rashi: ${data.rashi || "None selected"}
  - Associated Deity: ${data.deity || "Any"}
  - Meaning Category: ${data.meaningCategory || "Any"}

  All names MUST start with letters associated with the selected Rashi (${
    data.rashiLetters || "Any"
  }).

  ✨ Ensure every response gives fresh, unique names not used before.  
  Format:
  1. Name - Meaning
  2. Name - Meaning
  (and so on)
  `;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 350,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    const result = await response.json();
    console.log("OpenRouter API response:", JSON.stringify(result, null, 2));

    if (result.error) {
      return res
        .status(500)
        .json({ error: `OpenRouter API error: ${result.error.message}` });
    }

    const text = result?.choices?.[0]?.message?.content || "";
    const nameList = parseNamesWithMeanings(text);

    if (nameList.length === 0) {
      return res.status(200).json({
        names: [],
        error: "No names generated. Try adjusting filters.",
      });
    }

    res.json({ names: nameList });
  } catch (err) {
    console.error("Fetch error:", err.message);
    res
      .status(500)
      .json({ error: "Failed to generate names. Please try again later." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log("🔑 API Key Loaded:", API_KEY ? "Yes" : "No");
});
