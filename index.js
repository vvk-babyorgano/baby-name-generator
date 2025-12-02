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
  // Remove markdown formatting (bold, italic, etc.)
  text = text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/__|_/g, "");

  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      // Filter out empty lines and introduction/conclusion text
      if (!line) return false;
      if (line.toLowerCase().includes("okay, here")) return false;
      if (line.toLowerCase().includes("based on")) return false;
      if (line.toLowerCase().includes("parameter")) return false;
      if (line.toLowerCase().includes("specified")) return false;
      if (line.toLowerCase().includes("unique")) return false;
      if (line.length < 5) return false;

      // Must contain a separator (-, :, or –)
      return line.includes("-") || line.includes(":") || line.includes("–");
    })
    .map((line) => {
      // Remove any remaining special characters
      line = line.replace(/[*_~`]/g, "").trim();

      // Match patterns: "1. Name - Meaning" or "Name - Meaning"
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

// API endpoint with multiple model fallback
app.post("/generate", async (req, res) => {
  const data = req.body;
  const randomSeed = Math.floor(Math.random() * 10000);

  // Build a cleaner prompt
  const prompt = `Generate exactly 10 baby names with meanings.

Requirements:
- Gender: ${data.gender || "Any"}
- Origin: ${data.origin || "Any"}
- Religion: ${data.religion || "Any"}
- Numerology: ${data.numerology || "Any"}
- Rashi: ${data.rashi || "None"}
- Must start with letters: ${data.rashiLetters || "Any"}
- Associated Deity: ${data.deity || "Any"}
- Meaning Category: ${data.meaningCategory || "Any"}
- Random seed: ${randomSeed}

${
  data.rashiLetters
    ? `CRITICAL: Every name MUST start with one of these letters: ${data.rashiLetters}`
    : ""
}

IMPORTANT: Output ONLY the numbered list. No introduction, no explanation, no bold text.

Format (exactly like this):
1. Name - Meaning
2. Name - Meaning
3. Name - Meaning
4. Name - Meaning
5. Name - Meaning
6. Name - Meaning
7. Name - Meaning
8. Name - Meaning
9. Name - Meaning
10. Name - Meaning`;

  // List of models to try in order (free/cheap first)
  const models = [
    {
      name: "google/gemini-2.0-flash-exp:free",
      tokens: 800,
      description: "Free Gemini model",
    },
    {
      name: "meta-llama/llama-3.2-3b-instruct:free",
      tokens: 600,
      description: "Free Llama model",
    },
    {
      name: "qwen/qwen-2.5-7b-instruct:free",
      tokens: 600,
      description: "Free Qwen model",
    },
    {
      name: "mistralai/mistral-7b-instruct:free",
      tokens: 600,
      description: "Free Mistral model",
    },
    {
      name: "gpt-4.1-mini",
      tokens: 300,
      description: "Paid GPT model (fallback)",
    },
  ];

  // Try each model until one works
  for (const model of models) {
    try {
      console.log(`🔄 Trying model: ${model.description}...`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model.name,
            messages: [{ role: "user", content: prompt }],
            max_tokens: model.tokens,
            temperature: 0.8,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);
      const result = await response.json();

      // Check for errors
      if (result.error) {
        console.log(`❌ ${model.name} failed: ${result.error.message}`);

        // If it's a credit error and we're on the last paid model, inform user
        if (
          result.error.message.includes("credits") &&
          model.name === "gpt-4.1-mini"
        ) {
          console.log(
            "💡 All free models failed and insufficient credits for paid model"
          );
        }

        continue; // Try next model
      }

      // Check if we got content
      const text = result?.choices?.[0]?.message?.content || "";

      if (!text) {
        console.log(`❌ ${model.name} returned empty response`);
        continue;
      }

      console.log(`✅ Success with ${model.name}`);
      console.log("Raw AI response:", text);

      // Parse the names
      const nameList = parseNamesWithMeanings(text);

      if (nameList.length === 0) {
        console.log(`❌ ${model.name} generated unparseable output`);
        continue;
      }

      // Success! Return the names
      return res.json({
        names: nameList,
        model_used: model.name,
      });
    } catch (err) {
      console.log(`❌ ${model.name} error: ${err.message}`);
      continue; // Try next model
    }
  }

  // If all models failed
  console.error("❌ All models failed");
  return res.status(500).json({
    error:
      "Unable to generate names at this time. Please try again in a few moments or add credits to your OpenRouter account.",
    details: "All available models exhausted",
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    apiKeyLoaded: !!API_KEY,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log("🔑 API Key Loaded:", API_KEY ? "✅ Yes" : "❌ No");
  console.log("📝 Available endpoints:");
  console.log(
    `   POST http://localhost:${PORT}/generate - Generate baby names`
  );
  console.log(`   GET  http://localhost:${PORT}/health - Health check`);
});
