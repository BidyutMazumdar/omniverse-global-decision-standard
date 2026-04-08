// =======================================
// OMNIVERSE™ AI + DATA SERVER — ABSOLUTE FINAL v2.0.0
// Data-Driven • Scalable • Sovereign-Grade
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
// SECURITY LAYER
// =======================================
app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 60
}));

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// =======================================
// CACHE SYSTEM (1 Hour TTL)
// =======================================
let cache = {
    worldbank: null,
    combined: null,
    timestamp: 0
};

const CACHE_TTL = 60 * 60 * 1000;

// =======================================
// NORMALIZATION ENGINE
// =======================================
function normalize(value, min, max) {
    if (max === min) return 0;
    return (value - min) / (max - min);
}

// =======================================
// WORLD BANK DATA FETCH
// =======================================
async function fetchWorldBank() {
    const url = "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.CD?format=json&per_page=20000";

    const res = await fetch(url);
    const data = await res.json();

    return data[1]
        .filter(d => d.value !== null)
        .map(d => ({
            country: d.country.value,
            code: d.country.id,
            gdp: d.value
        }));
}

// =======================================
// MOCK UN / ITU DATA (UPGRADABLE)
// =======================================
function fetchUNMock() {
    return [
        { code: "IND", governance: 0.65, stability: 0.6, infrastructure: 0.7 },
        { code: "USA", governance: 0.85, stability: 0.75, infrastructure: 0.9 },
        { code: "CHN", governance: 0.78, stability: 0.8, infrastructure: 0.88 },
        { code: "DEU", governance: 0.82, stability: 0.85, infrastructure: 0.87 }
    ];
}

// =======================================
// COMBINED DATA ENGINE
// =======================================
async function getCombinedData() {

    if (cache.combined && Date.now() - cache.timestamp < CACHE_TTL) {
        return cache.combined;
    }

    const wb = await fetchWorldBank();
    const un = fetchUNMock();

    const gdpValues = wb.map(d => d.gdp);
    const minGDP = Math.min(...gdpValues);
    const maxGDP = Math.max(...gdpValues);

    const combined = wb.map(d => {

        const match = un.find(u => u.code === d.code);

        return {
            country: d.country,
            code: d.code,
            gdp: normalize(d.gdp, minGDP, maxGDP),
            governance: match?.governance ?? 0.5,
            stability: match?.stability ?? 0.5,
            infrastructure: match?.infrastructure ?? 0.5
        };
    });

    cache.combined = combined;
    cache.timestamp = Date.now();

    return combined;
}

// =======================================
// SCORING ENGINE
// =======================================
function computeScore(c) {

    const Cs = c.infrastructure;
    const Co = c.governance;
    const Io = c.gdp;
    const Rs = c.stability;
    const sigma = 0.3;

    return (Cs * Co * Io * Rs) * Math.exp(-sigma);
}

// =======================================
// ROUTES — DATA
// =======================================

// World Bank Raw
app.get("/data/worldbank", async (req, res) => {
    const data = await fetchWorldBank();
    res.json(data.slice(0, 100));
});

// Combined Dataset
app.get("/data/combined", async (req, res) => {
    const data = await getCombinedData();
    res.json(data.slice(0, 100));
});

// =======================================
// ROUTES — SCORING
// =======================================

// All Scores
app.get("/score/all", async (req, res) => {
    const data = await getCombinedData();

    const scores = data.map(d => ({
        country: d.country,
        code: d.code,
        score: computeScore(d)
    }));

    scores.sort((a, b) => b.score - a.score);

    res.json(scores.slice(0, 100));
});

// Top N
app.get("/score/top/:n", async (req, res) => {
    const n = parseInt(req.params.n) || 10;

    const data = await getCombinedData();

    const scores = data.map(d => ({
        country: d.country,
        code: d.code,
        score: computeScore(d)
    }));

    scores.sort((a, b) => b.score - a.score);

    res.json(scores.slice(0, n));
});

// =======================================
// AI ROUTE (UNCHANGED CORE)
// =======================================
app.post("/ai", async (req, res) => {

    try {
        const { risk, stability, capacity, governance } = req.body;

        const prompt = `
Evaluate:
Risk=${risk}, Stability=${stability}, Capacity=${capacity}, Governance=${governance}
Give executive decision insight.
`;

        const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }]
            })
        });

        const data = await apiResponse.json();

        res.json({
            result: data?.choices?.[0]?.message?.content || "No output"
        });

    } catch {
        res.status(500).json({ error: "AI_ERROR" });
    }
});

// =======================================
// HEALTH
// =======================================
app.get("/", (req, res) => {
    res.json({
        system: "OMNIVERSE™ DATA CORE",
        version: "v2.0.0",
        status: "LIVE"
    });
});

// =======================================
// START
// =======================================
app.listen(PORT, () => {
    console.log(`OMNIVERSE™ GLOBAL SYSTEM → http://localhost:${PORT}`);
});
