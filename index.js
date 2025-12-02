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
  text = text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/__|_/g, "");

  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (line.toLowerCase().includes("okay, here")) return false;
      if (line.toLowerCase().includes("based on")) return false;
      if (line.toLowerCase().includes("parameter")) return false;
      if (line.toLowerCase().includes("specified")) return false;
      if (line.toLowerCase().includes("unique")) return false;
      if (line.length < 5) return false;
      return line.includes("-") || line.includes(":") || line.includes("–");
    })
    .map((line) => {
      line = line.replace(/[*_~`]/g, "").trim();
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

app.post("/generate", async (req, res) => {
  const data = req.body;
  const randomSeed = Math.floor(Math.random() * 10000);

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

  // Use only cheap paid models since free tier is exhausted
  const models = [
    {
      name: "google/gemini-flash-1.5-8b",
      tokens: 300,
      description: "Very cheap Gemini model (paid)",
    },
    {
      name: "openai/gpt-4o-mini",
      tokens: 300,
      description: "Cheap GPT model (paid)",
    },
  ];

  let lastError = null;

  for (const model of models) {
    try {
      console.log(`🔄 Trying model: ${model.description} (${model.name})...`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Baby Name Generator",
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

      if (!response.ok) {
        const errorText = await response.text();
        console.log(
          `❌ ${model.name} HTTP error: ${response.status} - ${errorText}`
        );
        lastError = `HTTP ${response.status}: ${errorText}`;
        continue;
      }

      const result = await response.json();
      console.log(
        `📊 Response from ${model.name}:`,
        JSON.stringify(result, null, 2)
      );

      if (result.error) {
        console.log(`❌ ${model.name} failed: ${result.error.message}`);
        lastError = result.error.message;
        continue;
      }

      const text = result?.choices?.[0]?.message?.content || "";

      if (!text) {
        console.log(`❌ ${model.name} returned empty response`);
        lastError = "Empty response from AI";
        continue;
      }

      console.log(`✅ Success with ${model.name}`);
      console.log("📝 Raw AI response:", text);

      const nameList = parseNamesWithMeanings(text);

      if (nameList.length === 0) {
        console.log(`❌ ${model.name} generated unparseable output`);
        lastError = "Could not parse AI output";
        continue;
      }

      console.log(`✅ Successfully parsed ${nameList.length} names`);

      return res.json({
        names: nameList,
        model_used: model.name,
      });
    } catch (err) {
      console.log(`❌ ${model.name} error: ${err.message}`);
      lastError = err.message;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }
  }

  console.error("❌ All models failed. Last error:", lastError);

  // Check if it's a rate limit error
  if (lastError && lastError.includes("Rate limit exceeded")) {
    return res.status(429).json({
      error: "Daily free tier limit reached (50 requests/day)",
      details: "You've used all 50 free requests for today",
      solutions: [
        "Add $10 to your OpenRouter account to unlock 1000 free requests/day",
        "Wait until midnight UTC for the rate limit to reset",
        "Your rate limit resets at: June 2, 2025 12:00 AM UTC",
      ],
      addCreditsUrl: "https://openrouter.ai/settings/credits",
    });
  }

  return res.status(500).json({
    error: "Unable to generate names. All AI models are currently unavailable.",
    details: lastError || "All available models exhausted",
    suggestion:
      "Please try again in a few moments. If the issue persists, check your OpenRouter API key and account status.",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    apiKeyLoaded: !!API_KEY,
    timestamp: new Date().toISOString(),
  });
});

app.get("/test-api", async (req, res) => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    const data = await response.json();
    res.json({
      status: "API connection successful",
      availableModels: data.data?.length || 0,
    });
  } catch (err) {
    res.status(500).json({
      status: "API connection failed",
      error: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log("🔑 API Key Loaded:", API_KEY ? "✅ Yes" : "❌ No");
  console.log("📝 Available endpoints:");
  console.log(
    `   POST http://localhost:${PORT}/generate - Generate baby names`
  );
  console.log(`   GET  http://localhost:${PORT}/health - Health check`);
  console.log(
    `   GET  http://localhost:${PORT}/test-api - Test API connection`
  );
  console.log(
    "\n⚠️  Note: Free tier limit reached. Add credits or wait for reset."
  );
});
