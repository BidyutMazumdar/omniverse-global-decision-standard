// =======================================
// OMNIVERSE™ AI + DATA SERVER — v3.2.0 LOCK FINAL
// Production-Safe • Claims-Safe • ESM Compatible • Render/Railway/Node 18+ Ready
// Canonical Release
// =======================================

import express from "express";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

dotenv.config();

const app = express();

// =======================================
// CORE CONFIG
// =======================================
const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
const API_KEY = process.env.OPENAI_API_KEY || "";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const NODE_ENV = process.env.NODE_ENV || "development";

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const FETCH_TIMEOUT_MS = 15000;
const AI_TIMEOUT_MS = 30000;
const MAX_TOP_N = 100;

// =======================================
// STARTUP VALIDATION
// =======================================
if (!API_KEY) {
  console.error("FATAL: OPENAI_API_KEY is missing");
  process.exit(1);
}

// =======================================
// SECURITY LAYER
// =======================================
app.disable("x-powered-by");
app.set("trust proxy", true); // robust for Render / Railway / reverse proxies

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(
  cors({
    origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again shortly."
    }
  })
);

app.use(express.json({ limit: "1mb" }));

// =======================================
// IN-MEMORY CACHE
// =======================================
const cache = {
  combined: null,
  timestamp: 0
};

// =======================================
// UTILS
// =======================================
function normalize(value, min, max) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return 0;
  }
  if (max === min) return 0;
  return (value - min) / (max - min);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toSafeNumber(value, fallback = 0.5) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function boundedUnitValue(value, fallback = 0.5) {
  return clamp(toSafeNumber(value, fallback), 0, 1);
}

function createError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function extractResponseText(apiResponse) {
  if (typeof apiResponse?.output_text === "string" && apiResponse.output_text.trim()) {
    return apiResponse.output_text.trim();
  }

  if (Array.isArray(apiResponse?.output)) {
    for (const item of apiResponse.output) {
      if (Array.isArray(item?.content)) {
        for (const part of item.content) {
          if (typeof part?.text === "string" && part.text.trim()) {
            return part.text.trim();
          }
        }
      }
    }
  }

  return "No output available.";
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    if (!response.ok) {
      let details = "";

      try {
        const errorPayload = await response.text();
        details = errorPayload ? ` | ${errorPayload.slice(0, 300)}` : "";
      } catch {
        // ignore read failure
      }

      throw createError(
        502,
        "UPSTREAM_HTTP_ERROR",
        `Upstream request failed with status ${response.status}${details}`
      );
    }

    return await response.json();
  } catch (err) {
    if (err?.name === "AbortError") {
      throw createError(504, "UPSTREAM_TIMEOUT", "Upstream request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function rankBand(score) {
  if (score >= 0.85) return "AAA";
  if (score >= 0.75) return "AA+";
  if (score >= 0.65) return "AA";
  if (score >= 0.55) return "A";
  if (score >= 0.45) return "BBB";
  return "BB";
}

// =======================================
// WORLD BANK DATA FETCH
// =======================================
async function fetchWorldBank() {
  const url =
    "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.CD?format=json&per_page=20000";

  const data = await fetchJsonWithTimeout(url);

  if (!Array.isArray(data) || !Array.isArray(data[1])) {
    throw createError(502, "INVALID_WORLD_BANK_DATA", "Unexpected World Bank response format");
  }

  const latestByCountry = new Map();

  for (const row of data[1]) {
    if (!row || row.value === null || !row.country?.value || !row.country?.id) continue;

    const gdp = Number(row.value);
    if (!Number.isFinite(gdp)) continue;

    const code = row.country.id;
    const year = Number.parseInt(row.date, 10) || 0;

    const existing = latestByCountry.get(code);

    if (!existing || year > existing.year) {
      latestByCountry.set(code, {
        country: row.country.value,
        code,
        gdp,
        year
      });
    }
  }

  return Array.from(latestByCountry.values()).map(({ country, code, gdp }) => ({
    country,
    code,
    gdp
  }));
}

// =======================================
// MOCK UN / ITU DATA (DEMONSTRATIVE)
// Replace with validated upstream datasets in production.
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
  const unMap = new Map(un.map((item) => [item.code, item]));

  if (!wb.length) {
    throw createError(502, "EMPTY_WORLD_BANK_DATA", "No World Bank data available");
  }

  // Log-normalization to reduce extreme GDP skew from outliers
  const gdpValues = wb.map((d) => Math.log1p(d.gdp));
  const minGDP = Math.min(...gdpValues);
  const maxGDP = Math.max(...gdpValues);

  const combined = wb.map((d) => {
    const match = unMap.get(d.code);

    return {
      country: d.country,
      code: d.code,
      gdp: normalize(Math.log1p(d.gdp), minGDP, maxGDP),
      governance: boundedUnitValue(match?.governance, 0.5),
      stability: boundedUnitValue(match?.stability, 0.5),
      infrastructure: boundedUnitValue(match?.infrastructure, 0.5)
    };
  });

  cache.combined = combined;
  cache.timestamp = Date.now();

  return combined;
}

function buildScores(data) {
  return data
    .map((d) => {
      const score = computeScore(d);
      return {
        country: d.country,
        code: d.code,
        score: Number(score.toFixed(6)),
        rankBand: rankBand(score)
      };
    })
    .sort((a, b) => b.score - a.score);
}

// =======================================
// SCORING ENGINE
// =======================================
function computeScore(c) {
  const Cs = boundedUnitValue(c.infrastructure);
  const Co = boundedUnitValue(c.governance);
  const Io = boundedUnitValue(c.gdp);
  const Rs = boundedUnitValue(c.stability);
  const sigma = 0.3;

  return Cs * Co * Io * Rs * Math.exp(-sigma);
}

// =======================================
// ROUTES — DATA
// =======================================
app.get(
  "/data/worldbank",
  asyncHandler(async (req, res) => {
    const data = await fetchWorldBank();

    res.json({
      source: "World Bank",
      note: "Latest available GDP per capita record per country (sample first 100).",
      count: Math.min(data.length, 100),
      data: data.slice(0, 100)
    });
  })
);

app.get(
  "/data/combined",
  asyncHandler(async (req, res) => {
    const data = await getCombinedData();

    res.json({
      source: "World Bank + demonstrative governance/stability/infrastructure layer",
      note: "Combined dataset includes mock supplementary values where no validated upstream layer is configured. GDP is log-normalized to reduce outlier distortion.",
      count: Math.min(data.length, 100),
      data: data.slice(0, 100)
    });
  })
);

// =======================================
// ROUTES — SCORING
// =======================================
app.get(
  "/score/all",
  asyncHandler(async (req, res) => {
    const data = await getCombinedData();
    const scores = buildScores(data);

    res.json({
      note: "Scores are framework outputs derived from log-normalized GDP and demonstrative supplementary factors.",
      count: Math.min(scores.length, 100),
      data: scores.slice(0, 100)
    });
  })
);

app.get(
  "/score/top/:n",
  asyncHandler(async (req, res) => {
    const parsed = Number.parseInt(req.params.n, 10);
    const n = Number.isFinite(parsed) ? clamp(parsed, 1, MAX_TOP_N) : 10;

    const data = await getCombinedData();
    const scores = buildScores(data);

    res.json({
      note: "Top-N framework outputs using log-normalized GDP and demonstrative supplementary layers.",
      requested: req.params.n,
      returned: n,
      data: scores.slice(0, n)
    });
  })
);

// =======================================
// ROUTE — AI INSIGHT
// =======================================
app.post(
  "/ai",
  asyncHandler(async (req, res) => {
    if (!req.is("application/json")) {
      throw createError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Content-Type must be application/json"
      );
    }

    const risk = boundedUnitValue(req.body?.risk, 0.5);
    const stability = boundedUnitValue(req.body?.stability, 0.5);
    const capacity = boundedUnitValue(req.body?.capacity, 0.5);
    const governance = boundedUnitValue(req.body?.governance, 0.5);

    const prompt = `
You are evaluating a structured decision profile.

Inputs:
- Risk: ${risk}
- Stability: ${stability}
- Capacity: ${capacity}
- Governance: ${governance}

Task:
Provide a concise executive insight in 3-5 sentences.
Focus on:
1. risk posture
2. operational resilience
3. governance quality
4. recommended strategic priority

Do not exaggerate. Keep the language professional and neutral.
`.trim();

    const apiResponse = await fetchJsonWithTimeout(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          input: prompt,
          max_output_tokens: 220
        })
      },
      AI_TIMEOUT_MS
    );

    const result = extractResponseText(apiResponse);

    res.json({
      result,
      meta: {
        model: "gpt-4o-mini",
        note: "AI insight is a narrative layer and is not identical to the /score/* mathematical ranking engine.",
        normalizedInputs: {
          risk,
          stability,
          capacity,
          governance
        }
      }
    });
  })
);

// =======================================
// HEALTH / STATUS
// =======================================
app.get("/health", (req, res) => {
  res.json({
    system: "OMNIVERSE™ DATA CORE",
    version: "v3.2.0-lock-final",
    status: "AVAILABLE",
    environment: NODE_ENV,
    cache: {
      combinedCached: Boolean(cache.combined),
      cacheAgeMs: cache.timestamp ? Date.now() - cache.timestamp : null
    }
  });
});

app.get("/", (req, res) => {
  res.json({
    system: "OMNIVERSE™ DATA CORE",
    version: "v3.2.0-lock-final",
    status: "AVAILABLE",
    endpoints: [
      "/health",
      "/data/worldbank",
      "/data/combined",
      "/score/all",
      "/score/top/:n",
      "/ai"
    ]
  });
});

// =======================================
// NOT FOUND
// =======================================
app.use((req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "The requested endpoint does not exist."
  });
});

// =======================================
// CENTRAL ERROR HANDLER
// =======================================
app.use((err, req, res, next) => {
  const status = Number.isInteger(err?.status) ? err.status : 500;
  const code = err?.code || "INTERNAL_SERVER_ERROR";

  if (NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(status).json({
    error: code,
    message:
      status === 500
        ? "An internal server error occurred."
        : err.message || "Request failed."
  });
});

// =======================================
// START
// =======================================
app.listen(PORT, () => {
  console.log(`OMNIVERSE™ DATA CORE → http://localhost:${PORT}`);
});
