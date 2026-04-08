// =======================================
// OMNIVERSE™ AI SERVER — ULTIMATE EDITION
// Secure • Robust • Production-Ready
// =======================================

import express from "express";
import dotenv from "dotenv";

// Native fetch (Node 18+) fallback safe import
import fetch from "node-fetch";

dotenv.config();

const app = express();

// =======================================
// MIDDLEWARE
// =======================================
app.use(express.json({ limit: "1mb" }));

// Basic CORS (secure controlled)
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});

// =======================================
// HEALTH CHECK
// =======================================
app.get("/", (req, res) => {
    res.json({
        status: "OMNIVERSE™ AI Server Active",
        version: "v1.0.0",
        uptime: process.uptime()
    });
});

// =======================================
// CORE AI ENDPOINT
// =======================================
app.post("/ai", async (req, res) => {

    try {
        const { risk, stability, capacity, governance } = req.body;

        // INPUT VALIDATION
        if (
            [risk, stability, capacity, governance].some(
                v => typeof v !== "number" || v < 0 || v > 1
            )
        ) {
            return res.status(400).json({
                error: "Invalid input. All values must be numbers between 0 and 1."
            });
        }

        // PROMPT ENGINEERING (HIGH PRECISION)
        const prompt = `
OMNIVERSE™ Decision Evaluation Protocol

Inputs:
Risk = ${risk}
Stability = ${stability}
Capacity = ${capacity}
Governance = ${governance}

Task:
1. Evaluate systemic viability
2. Identify risk-stability balance
3. Provide strategic classification

Output Format:
- Decision Level
- Risk Insight
- Strategic Recommendation

Keep response concise, analytical, and executive-grade.
        `;

        // API CALL
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a high-level strategic AI decision system."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.4
            })
        });

        const data = await response.json();

        // ERROR HANDLING (API)
        if (!response.ok) {
            return res.status(500).json({
                error: "AI API Error",
                details: data
            });
        }

        const result = data?.choices?.[0]?.message?.content || "No response generated.";

        // SUCCESS RESPONSE
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            input: { risk, stability, capacity, governance },
            result
        });

    } catch (err) {

        // INTERNAL ERROR HANDLING
        res.status(500).json({
            error: "Internal Server Error",
            message: err.message
        });
    }
});

// =======================================
// SERVER INIT
// =======================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`OMNIVERSE™ AI Server running on port ${PORT}`);
});
