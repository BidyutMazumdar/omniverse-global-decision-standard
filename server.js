/* =======================================
   OMNIVERSE™ FINAL CORE — v1
   
======================================= */

import express from "express";
import dotenv from "dotenv";
import pkg from "pg";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Redis from "ioredis";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

dotenv.config();

const app = express();
const { Pool } = pkg;

const fetch = globalThis.fetch || (await import("node-fetch")).default;

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");
if (process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET too weak");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const API_KEY = process.env.OPENAI_API_KEY;
const NODE_ENV = process.env.NODE_ENV || "development";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
});

let redis = null;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: false,
      retryStrategy: () => null
    });

    redis.on("error", (err) => {
      if (NODE_ENV !== "production") {
        console.warn("Redis error:", err.message);
      }
    });

  } catch {}
}

app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGIN === "*") return cb(null, true);
    if (origin === ALLOWED_ORIGIN) return cb(null, true);
    return cb(new Error("CORS_BLOCKED"));
  }
}));

app.use(rateLimit({
  windowMs: 60000,
  max: NODE_ENV === "production" ? 150 : 100,
  keyGenerator: (req) => req.ip
}));

const createError = (status, msg) => {
  const e = new Error(msg);
  e.status = status;
  return e;
};

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "UNAUTHORIZED" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: "INVALID_TOKEN" });
  }
};

app.post("/auth/register", asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) throw createError(400, "INVALID_INPUT");

  const hash = await bcrypt.hash(password, 10);

  const user = await pool.query(
    `INSERT INTO users (name,email,password_hash)
     VALUES ($1,$2,$3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id,email`,
    [name || "User", email, hash]
  );

  if (!user.rows.length) throw createError(400, "USER_EXISTS");

  const org = await pool.query(
    `INSERT INTO organizations (name)
     VALUES ($1) RETURNING id`,
    [`${email}-org`]
  );

  await pool.query(
    `INSERT INTO memberships (user_id, org_id)
     VALUES ($1,$2)`,
    [user.rows[0].id, org.rows[0].id]
  );

  res.json(user.rows[0]);
}));

app.post("/auth/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) throw createError(400, "INVALID_INPUT");

  const user = await pool.query(
    `SELECT * FROM users WHERE email=$1`,
    [email]
  );

  if (!user.rows.length) throw createError(401, "INVALID_LOGIN");

  const valid = await bcrypt.compare(password, user.rows[0].password_hash);
  if (!valid) throw createError(401, "INVALID_LOGIN");

  const org = await pool.query(
    `SELECT org_id FROM memberships WHERE user_id=$1 LIMIT 1`,
    [user.rows[0].id]
  );

  if (!org.rows.length) throw createError(500, "ORG_NOT_FOUND");

  const token = jwt.sign(
    { userId: user.rows[0].id, orgId: org.rows[0].org_id },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
}));

async function fetchWorldBank() {
  const url = "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.CD?format=json&per_page=20000";

  const res = await fetch(url);
  if (!res.ok) throw createError(500, "WB_API_FAIL");

  const data = await res.json();
  return data?.[1]?.slice(0, 100) || [];
}

const computeScore = d => Math.log1p(d.value) / 10;

app.get("/score/all", auth, asyncHandler(async (req, res) => {

  const cacheKey = `scores:${req.user.orgId}`;

  try {
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    }
  } catch {}

  const data = await fetchWorldBank();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const scores = [];

    for (const row of data) {
      if (!row.value) continue;

      const score = computeScore(row);

      scores.push({
        country: row.country.value,
        code: row.country.id,
        score
      });

      await client.query(
        `INSERT INTO scores (org_id,country,code,score)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (org_id, code)
         DO UPDATE SET score = EXCLUDED.score`,
        [req.user.orgId, row.country.value, row.country.id, score]
      );
    }

    await client.query("COMMIT");

    try {
      if (redis) {
        await redis.set(cacheKey, JSON.stringify(scores), "EX", 60);
      }
    } catch {}

    res.json(scores);

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}));

app.post("/ai", auth, asyncHandler(async (req, res) => {

  if (!API_KEY) throw createError(500, "AI_NOT_CONFIGURED");

  const input = JSON.stringify(req.body);
  if (input.length > 2000) throw createError(400, "INPUT_TOO_LARGE");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input
    })
  });

  if (!response.ok) throw createError(500, "AI_API_FAIL");

  const data = await response.json();

  await pool.query(
    `INSERT INTO ai_insights (result,model)
     VALUES ($1,$2)`,
    [JSON.stringify(data), "gpt-4o-mini"]
  );

  res.json(data);
}));

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    redis: !!redis
  });
});

app.use((err, req, res, next) => {
  if (NODE_ENV !== "production") {
    console.error(err);
  }
  res.status(err.status || 500).json({
    error: err.message || "SERVER_ERROR"
  });
});

const server = app.listen(PORT, () => {
  console.log(`OMNIVERSE™ v1 running on ${PORT}`);
});

const shutdown = async () => {
  try {
    await pool.end();
    if (redis) await redis.quit();
  } catch {}

  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 5000);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
