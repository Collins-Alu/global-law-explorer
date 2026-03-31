const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files from the same directory
app.use(express.static(__dirname));

// ── API Proxy Route ────────────────────────────────
// Frontend calls this instead of Groq directly.
// The API key stays on the server, never sent to the browser.
app.post("/api/ask", async (req, res) => {
  const { country, law } = req.body;

  // Input validation
  if (!country || typeof country !== "string" || country.trim().length === 0) {
    return res.status(400).json({ error: "A valid country is required." });
  }
  if (!law || typeof law !== "string" || law.trim().length === 0) {
    return res.status(400).json({ error: "A valid legal topic is required." });
  }

  // Sanitize inputs (basic XSS prevention)
  const cleanCountry = country.trim().slice(0, 100);
  const cleanLaw = law.trim().slice(0, 200);

  const API_KEY = process.env.GROQ_API_KEY;

  if (!API_KEY) {
    console.error("GROQ_API_KEY is not set in .env");
    return res.status(500).json({ error: "Server misconfiguration. API key not found." });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are a knowledgeable legal information assistant. Explain laws clearly with structured headings, bullet points, and practical examples. Always note that this is general information and not legal advice. Use markdown formatting: ## for sections, **bold** for key terms, - for lists.",
          },
          {
            role: "user",
            content: `Explain the law about "${cleanLaw}" in ${cleanCountry}. Cover: 1) Overview, 2) Key requirements and rules, 3) Penalties or consequences for violations, 4) Any recent changes or notable exceptions.`,
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Groq API error:", data.error);
      return res.status(502).json({ error: data.error.message || "API returned an error." });
    }

    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(502).json({ error: "No response received from the AI model." });
    }

    return res.json({ answer });

  } catch (err) {
    console.error("Server error calling Groq:", err.message);
    return res.status(500).json({ error: "Failed to connect to the AI service. Please try again later." });
  }
});

// ── Compare Route (two countries, same topic) ──────
app.post("/api/compare", async (req, res) => {
  const { country1, country2, law } = req.body;

  if (!country1 || !country2 || !law) {
    return res.status(400).json({ error: "Two countries and a legal topic are required." });
  }

  const clean1 = country1.trim().slice(0, 100);
  const clean2 = country2.trim().slice(0, 100);
  const cleanLaw = law.trim().slice(0, 200);

  const API_KEY = process.env.GROQ_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "Server misconfiguration. API key not found." });
  }

  // Fetch both in parallel
  const fetchForCountry = async (country) => {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are a knowledgeable legal information assistant. Explain laws clearly and concisely with structured headings and bullet points. Use markdown formatting. Keep the response focused and under 400 words.",
          },
          {
            role: "user",
            content: `Explain the law about "${cleanLaw}" in ${country}. Cover: 1) Overview, 2) Key rules, 3) Penalties, 4) Notable exceptions.`,
          },
        ],
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices?.[0]?.message?.content || "No response received.";
  };

  try {
    const [answer1, answer2] = await Promise.all([
      fetchForCountry(clean1),
      fetchForCountry(clean2),
    ]);

    return res.json({
      country1: clean1,
      country2: clean2,
      law: cleanLaw,
      answer1,
      answer2,
    });

  } catch (err) {
    console.error("Compare error:", err.message);
    return res.status(500).json({ error: "Failed to fetch comparison data. Please try again." });
  }
});

// ── Start Server ───────────────────────────────────
app.listen(PORT, () => {
  console.log(`LexGlobe server running at http://localhost:${PORT}`);
});