const express = require("express");
const path = require("path");
require("dotenv").config();

const API_KEY = process.env.OPENROUTER_API_KEY;
const PORT = 3000;

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Improved helper: Clean markdown and parse names
function parseNamesWithMeanings(text) {
  // Remove markdown formatting
  text = text.replace(/\*\*/g, "").replace(/\*/g, "");

  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      // Filter out empty lines and introduction text
      if (!line) return false;
      if (line.toLowerCase().includes("okay, here")) return false;
      if (line.toLowerCase().includes("based on")) return false;
      if (line.toLowerCase().includes("parameter")) return false;
      if (line.toLowerCase().includes("specified")) return false;
      if (line.length < 5) return false;

      // Must contain a separator (-, :, or –)
      return line.includes("-") || line.includes(":") || line.includes("–");
    })
    .map((line) => {
      // Remove any remaining special characters
      line = line.replace(/[*_~`]/g, "").trim();

      // Match: "1. Name - Meaning" or "Name - Meaning"
      const match = line.match(/^\d*\.?\s*(.+?)\s*[-–:]\s*(.+)$/);
      if (match) {
        return {
          name: match[1].trim(),
          meaning: match[2].trim(),
        };
      }
      return null;
    })
    .filter((item) => item !== null);
}

// API endpoint
app.post("/generate", async (req, res) => {
  const data = req.body;
  const randomSeed = Math.floor(Math.random() * 1000);

  const prompt = `Generate exactly 10 baby names with meanings.

Requirements:
- Gender: ${data.gender || "Any"}
- Origin: ${data.origin || "Any"}
- Religion: ${data.religion || "Any"}
- Numerology: ${data.numerology || "Any"}
- Rashi: ${data.rashi || "None"}
- Start with letters: ${data.rashiLetters || "Any"}
- Deity: ${data.deity || "Any"}
- Meaning Category: ${data.meaningCategory || "Any"}
- Random seed: ${randomSeed}

${
  data.rashiLetters
    ? `CRITICAL: All names MUST start with these letters: ${data.rashiLetters}`
    : ""
}

Output ONLY the numbered list in this exact format (no introduction, no bold text, no explanation):
1. Name - Meaning
2. Name - Meaning
3. Name - Meaning
(continue for all 10)

Do NOT include any text before or after the list. Do NOT use bold formatting.`;

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
          model: "google/gemini-2.0-flash-exp:free",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 600,
          temperature: 0.7, // Add some variety
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    const result = await response.json();

    console.log("OpenRouter API response:", JSON.stringify(result, null, 2));

    if (result.error) {
      return res.status(500).json({
        error: `OpenRouter API error: ${result.error.message}`,
      });
    }

    const text = result?.choices?.[0]?.message?.content || "";
    console.log("Raw AI response:", text); // Debug log

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
    res.status(500).json({
      error: "Failed to generate names. Please try again later.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log("🔑 API Key Loaded:", API_KEY ? "Yes" : "No");
});
