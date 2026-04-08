// =======================================
// OMNIVERSE™ AI SERVER — FINAL LOCK v1.2.0
// Secure • Stable • Production-Hardened
// =======================================

import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();

// =======================================
// CORE CONFIG
// =======================================
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
    console.error("FATAL: OPENAI_API_KEY is missing");
    process.exit(1);
}

// =======================================
// SECURITY LAYER 🔥
// =======================================

// Rate Limiting (anti-abuse)
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 30 // max 30 requests/min per IP
});

app.use(limiter);

// JSON Limit
app.use(express.json({ limit: "1mb" }));

// CORS (controlled)
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});

// =======================================
// HEALTH CHECK
// =======================================
app.get("/", (req, res) => {
    res.json({
        system: "OMNIVERSE™ AI Core",
        status: "ACTIVE",
        version: "v1.2.0",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// =======================================
// VALIDATION ENGINE
// =======================================
function validateInput(input) {
    const { risk, stability, capacity, governance } = input;

    const values = [risk, stability, capacity, governance];

    return values.every(v => typeof v === "number" && v >= 0 && v <= 1);
}

// =======================================
// PROMPT ENGINE
// =======================================
function buildPrompt({ risk, stability, capacity, governance }) {
    return `
OMNIVERSE™ Strategic Decision Intelligence Protocol

INPUT VECTOR:
Risk = ${risk}
Stability = ${stability}
Capacity = ${capacity}
Governance = ${governance}

TASK:
- Evaluate system viability
- Detect instability factors
- Recommend execution stance

OUTPUT:
1. Decision Level
2. Risk Insight
3. Strategic Action

Constraints:
Concise • Analytical • Executive-grade
`;
}

// =======================================
// AI ROUTE
// =======================================
app.post("/ai", async (req, res) => {

    try {
        const input = req.body;

        if (!validateInput(input)) {
            return res.status(400).json({
                success: false,
                error: "INVALID_INPUT"
            });
        }

        const prompt = buildPrompt(input);

        const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a sovereign-grade AI strategic intelligence system."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3
            })
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            return res.status(502).json({
                success: false,
                error: "AI_UPSTREAM_ERROR"
            });
        }

        const output = data?.choices?.[0]?.message?.content ?? "No output";

        res.json({
            success: true,
            output
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            error: "SERVER_ERROR"
        });
    }
});

// =======================================
// 404
// =======================================
app.use((req, res) => {
    res.status(404).json({
        error: "NOT_FOUND"
    });
});

// =======================================
// START
// =======================================
app.listen(PORT, () => {
    console.log(`OMNIVERSE™ LIVE → http://localhost:${PORT}`);
});
