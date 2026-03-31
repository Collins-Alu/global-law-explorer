var express = require("express");
var cors = require("cors");
var https = require("https");
require("dotenv").config();

var app = express();
var PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));

function postJSON(url, headers, body) {
  return new Promise(function (resolve, reject) {
    var parsed = new URL(url);
    var postData = JSON.stringify(body);

    var options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname,
      method: "POST",
      headers: Object.assign({}, headers, {
        "Content-Length": Buffer.byteLength(postData),
      }),
    };

    var req = https.request(options, function (res) {
      var chunks = [];
      res.on("data", function (chunk) { chunks.push(chunk); });
      res.on("end", function () {
        try {
          var data = JSON.parse(Buffer.concat(chunks).toString());
          resolve(data);
        } catch (e) {
          reject(new Error("Failed to parse API response"));
        }
      });
    });

    req.on("error", function (e) { reject(e); });
    req.write(postData);
    req.end();
  });
}

app.post("/api/ask", function (req, res) {
  var country = req.body.country;
  var law = req.body.law;

  if (!country || typeof country !== "string" || country.trim().length === 0) {
    return res.status(400).json({ error: "A valid country is required." });
  }
  if (!law || typeof law !== "string" || law.trim().length === 0) {
    return res.status(400).json({ error: "A valid legal topic is required." });
  }

  var cleanCountry = country.trim().slice(0, 100);
  var cleanLaw = law.trim().slice(0, 200);

  var API_KEY = process.env.GROQ_API_KEY;

  if (!API_KEY) {
    console.error("GROQ_API_KEY is not set in .env");
    return res.status(500).json({ error: "Server misconfiguration. API key not found." });
  }

  var requestBody = {
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: "You are a knowledgeable legal information assistant. Explain laws clearly with structured headings, bullet points, and practical examples. Always note that this is general information and not legal advice. Use markdown formatting: ## for sections, **bold** for key terms, - for lists."
      },
      {
        role: "user",
        content: "Explain the law about \"" + cleanLaw + "\" in " + cleanCountry + ". Cover: 1) Overview, 2) Key requirements and rules, 3) Penalties or consequences for violations, 4) Any recent changes or notable exceptions."
      }
    ]
  };

  postJSON(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + API_KEY
    },
    requestBody
  )
    .then(function (data) {
      if (data.error) {
        console.error("Groq API error:", data.error);
        return res.status(502).json({ error: data.error.message || "API returned an error." });
      }

      var answer =
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content;

      if (!answer) {
        return res.status(502).json({ error: "No response received from the AI model." });
      }

      return res.json({ answer: answer });
    })
    .catch(function (err) {
      console.error("Server error calling Groq:", err.message);
      return res.status(500).json({ error: "Failed to connect to the AI service. Please try again later." });
    });
});

app.post("/api/compare", function (req, res) {
  var country1 = req.body.country1;
  var country2 = req.body.country2;
  var law = req.body.law;

  if (!country1 || !country2 || !law) {
    return res.status(400).json({ error: "Two countries and a legal topic are required." });
  }

  var clean1 = country1.trim().slice(0, 100);
  var clean2 = country2.trim().slice(0, 100);
  var cleanLaw = law.trim().slice(0, 200);

  var API_KEY = process.env.GROQ_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "Server misconfiguration. API key not found." });
  }

  function fetchForCountry(ctry) {
    return postJSON(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + API_KEY
      },
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are a knowledgeable legal information assistant. Explain laws clearly and concisely with structured headings and bullet points. Use markdown formatting. Keep the response focused and under 400 words."
          },
          {
            role: "user",
            content: "Explain the law about \"" + cleanLaw + "\" in " + ctry + ". Cover: 1) Overview, 2) Key rules, 3) Penalties, 4) Notable exceptions."
          }
        ]
      }
    ).then(function (data) {
      if (data.error) throw new Error(data.error.message);
      var content =
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content;
      return content || "No response received.";
    });
  }

  Promise.all([fetchForCountry(clean1), fetchForCountry(clean2)])
    .then(function (results) {
      return res.json({
        country1: clean1,
        country2: clean2,
        law: cleanLaw,
        answer1: results[0],
        answer2: results[1]
      });
    })
    .catch(function (err) {
      console.error("Compare error:", err.message);
      return res.status(500).json({ error: "Failed to fetch comparison data. Please try again." });
    });
});

app.listen(PORT, function () {
  console.log("LexGlobe server running at http://localhost:" + PORT);
});