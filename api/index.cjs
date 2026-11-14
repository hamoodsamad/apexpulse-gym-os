"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/vercel-entry.ts
var vercel_entry_exports = {};
__export(vercel_entry_exports, {
  default: () => handler
});
module.exports = __toCommonJS(vercel_entry_exports);
var import_express2 = __toESM(require("express"), 1);

// server/db.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_node_crypto = __toESM(require("node:crypto"), 1);
var import_pg = require("pg");

// server/dates.ts
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function todayDateStr() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function calculateExpiryDate(startDateStr, duration) {
  const base = /* @__PURE__ */ new Date(`${startDateStr.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(base.getTime())) {
    throw new Error("Invalid start date for expiry calculation");
  }
  const target = new Date(base.getTime());
  switch (duration) {
    case "1m":
      target.setUTCMonth(target.getUTCMonth() + 1);
      break;
    case "3m":
      target.setUTCMonth(target.getUTCMonth() + 3);
      break;
    case "6m":
      target.setUTCMonth(target.getUTCMonth() + 6);
      break;
    case "1y":
      target.setUTCFullYear(target.getUTCFullYear() + 1);
      break;
    default:
      throw new Error(`Unsupported duration: ${String(duration)}`);
  }
  return target.toISOString().slice(0, 10);
}
function isDateExpired(expiryDateStr) {
  if (!expiryDateStr) return true;
  const today = todayDateStr();
  return expiryDateStr.slice(0, 10) < today;
}
function daysUntilDate(targetDateStr) {
  const today = (/* @__PURE__ */ new Date(`${todayDateStr()}T00:00:00.000Z`)).getTime();
  const target = (/* @__PURE__ */ new Date(
    `${targetDateStr.slice(0, 10)}T00:00:00.000Z`
  )).getTime();
  return Math.ceil((target - today) / (1e3 * 60 * 60 * 24));
}

// server/db.ts
var globalStore = globalThis;
var activeEngine = "postgres";
function convertPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}
function getDbEngine() {
  return activeEngine;
}
async function query(sql, params = []) {
  if (activeEngine === "postgres") {
    const pool = globalStore.__apexpulsePgPool;
    if (!pool) throw new Error("PostgreSQL pool not initialized");
    const result = await pool.query(convertPlaceholders(sql), params);
    return result.rows;
  }
  const sqliteDb = globalStore.__apexpulseSqliteDb;
  if (!sqliteDb) throw new Error("SQLite database not initialized");
  return sqliteDb.prepare(sql).all(...params);
}
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}
async function execute(sql, params = []) {
  if (activeEngine === "postgres") {
    const pool = globalStore.__apexpulsePgPool;
    if (!pool) throw new Error("PostgreSQL pool not initialized");
    await pool.query(convertPlaceholders(sql), params);
    return;
  }
  const sqliteDb = globalStore.__apexpulseSqliteDb;
  if (!sqliteDb) throw new Error("SQLite database not initialized");
  sqliteDb.prepare(sql).run(...params);
}
var SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    full_name TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    member_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    age INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'suspended', 'pending')),
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('gym_only', 'cardio_only', 'gym_cardio', 'custom_deal')),
    description TEXT NOT NULL DEFAULT '',
    is_deal INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS package_services (
    package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (package_id, service_id)
  )`,
  `CREATE TABLE IF NOT EXISTS package_prices (
    id TEXT PRIMARY KEY,
    package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    duration TEXT NOT NULL CHECK (duration IN ('1m', '3m', '6m', '1y')),
    price DOUBLE PRECISION NOT NULL,
    UNIQUE (package_id, duration)
  )`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    package_name TEXT NOT NULL,
    duration TEXT NOT NULL CHECK (duration IN ('1m', '3m', '6m', '1y')),
    amount DOUBLE PRECISION NOT NULL,
    start_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'suspended', 'pending_approval', 'cancelled')),
    payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'unpaid', 'pending')),
    approved_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    amount DOUBLE PRECISION NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'transfer', 'online')),
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'unpaid', 'pending_approval', 'rejected')),
    reference_no TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    approved_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    paid_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS biometric_credentials (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('webauthn', 'secugen', 'zkteco', 'digitalpersona')),
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL DEFAULT '',
    counter INTEGER NOT NULL DEFAULT 0,
    transports TEXT NOT NULL DEFAULT '[]',
    device_label TEXT NOT NULL,
    template_hash TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id TEXT PRIMARY KEY,
    challenge TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('register', 'verify')),
    member_id TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
    verification_method TEXT NOT NULL CHECK (verification_method IN ('webauthn', 'hardware_sdk')),
    verification_result TEXT NOT NULL CHECK (verification_result IN ('valid', 'expired', 'unpaid', 'suspended')),
    device_label TEXT NOT NULL,
    scanned_at TEXT NOT NULL
  )`
];
async function seedInitialCatalog() {
  const existingServices = await query(
    "SELECT id FROM services LIMIT 1"
  );
  if (existingServices.length > 0) return;
  const ts = nowIso();
  const baseServices = [
    {
      id: "svc_gym",
      name: "Gym",
      description: "Full access to strength training, free weights, and resistance machines."
    },
    {
      id: "svc_cardio",
      name: "Cardio",
      description: "Treadmills, ellipticals, stair climbers, rowing, and cycling zones."
    },
    {
      id: "svc_steam",
      name: "Steam Room",
      description: "Aromatic eucalyptus steam recovery suite."
    },
    {
      id: "svc_sauna",
      name: "Sauna",
      description: "Dry Finnish cedarwood heat recovery room."
    },
    {
      id: "svc_pt",
      name: "Personal Training",
      description: "Dedicated one-on-one certified coaching sessions and programming."
    }
  ];
  for (const svc of baseServices) {
    await execute(
      "INSERT INTO services (id, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?) ON CONFLICT DO NOTHING",
      [svc.id, svc.name, svc.description, ts, ts]
    );
  }
  const basePackages = [
    {
      id: "pkg_gym_only",
      name: "Gym Only",
      category: "gym_only",
      description: "Core strength floor, Olympic lifting platforms, and weight machines.",
      is_deal: 0,
      serviceIds: ["svc_gym"],
      prices: { "1m": 45, "3m": 120, "6m": 220, "1y": 400 }
    },
    {
      id: "pkg_cardio_only",
      name: "Cardio Only",
      category: "cardio_only",
      description: "Unlimited cardio theater, endurance ergs, and heart-rate conditioning zone.",
      is_deal: 0,
      serviceIds: ["svc_cardio"],
      prices: { "1m": 35, "3m": 95, "6m": 175, "1y": 320 }
    },
    {
      id: "pkg_gym_cardio",
      name: "Gym + Cardio",
      category: "gym_cardio",
      description: "Complete access to both strength training equipment and the cardio theater.",
      is_deal: 0,
      serviceIds: ["svc_gym", "svc_cardio"],
      prices: { "1m": 65, "3m": 175, "6m": 320, "1y": 580 }
    }
  ];
  for (const pkg of basePackages) {
    await execute(
      "INSERT INTO packages (id, name, category, description, is_deal, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?) ON CONFLICT DO NOTHING",
      [pkg.id, pkg.name, pkg.category, pkg.description, pkg.is_deal, ts, ts]
    );
    for (const serviceId of pkg.serviceIds) {
      await execute(
        "INSERT INTO package_services (package_id, service_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
        [pkg.id, serviceId]
      );
    }
    for (const [duration, price] of Object.entries(pkg.prices)) {
      await execute(
        "INSERT INTO package_prices (id, package_id, duration, price) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
        [`pp_${import_node_crypto.default.randomUUID().slice(0, 8)}`, pkg.id, duration, price]
      );
    }
  }
}
async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    activeEngine = "postgres";
    if (!globalStore.__apexpulsePgPool) {
      const isLocal = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
      globalStore.__apexpulsePgPool = new import_pg.Pool({
        connectionString: databaseUrl,
        max: 5,
        idleTimeoutMillis: 3e4,
        ssl: isLocal ? false : { rejectUnauthorized: false }
      });
    }
    await globalStore.__apexpulsePgPool.query("SELECT 1");
  } else {
    if (process.env.VERCEL) {
      throw new Error(
        "DATABASE_URL environment variable is required on Vercel. Connect a Cloud PostgreSQL database (Neon, Supabase, or Vercel Postgres)."
      );
    }
    activeEngine = "sqlite";
    if (!globalStore.__apexpulseSqliteDb) {
      const { default: Database } = await import("better-sqlite3");
      const dataDir = import_node_path.default.resolve(process.cwd(), "data");
      if (!import_node_fs.default.existsSync(dataDir)) {
        import_node_fs.default.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = import_node_path.default.join(dataDir, "gym.db");
      const db = new Database(dbPath);
      db.pragma("journal_mode = WAL");
      db.pragma("foreign_keys = ON");
      globalStore.__apexpulseSqliteDb = db;
    }
  }
  if (!globalStore.__apexpulseDbInitialized) {
    for (const stmt of SCHEMA_STATEMENTS) {
      await execute(stmt);
    }
    await seedInitialCatalog();
    globalStore.__apexpulseDbInitialized = true;
  }
}

// server/routes.ts
var import_node_crypto4 = __toESM(require("node:crypto"), 1);
var import_express = __toESM(require("express"), 1);

// server/auth.ts
var import_node_crypto2 = __toESM(require("node:crypto"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var cachedFallbackSecret = null;
function getJwtSecret() {
  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret && envSecret !== "CHANGE_ME_TO_A_LONG_RANDOM_SECRET_KEY") {
    return envSecret;
  }
  if (!cachedFallbackSecret) {
    const seed = process.env.DATABASE_URL?.trim() || import_node_crypto2.default.randomBytes(32).toString("hex");
    cachedFallbackSecret = import_node_crypto2.default.createHash("sha256").update(`apexpulse:${seed}`).digest("hex");
  }
  return cachedFallbackSecret;
}
async function hashPassword(password) {
  return import_bcryptjs.default.hash(password, 12);
}
async function verifyPassword(password, hash) {
  return import_bcryptjs.default.compare(password, hash);
}
function signAuthToken(payload) {
  return import_jsonwebtoken.default.sign(payload, getJwtSecret(), { expiresIn: "24h" });
}
function verifyAuthToken(token) {
  try {
    return import_jsonwebtoken.default.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}
function extractTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map((part) => part.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith("apexpulse_token=")) {
        return decodeURIComponent(cookie.slice("apexpulse_token=".length));
      }
    }
  }
  return null;
}
async function requireAuth(req, res, next) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const decoded = verifyAuthToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Invalid or expired session token" });
    return;
  }
  const user = await queryOne(
    "SELECT id, email, role, full_name FROM users WHERE id = ?",
    [decoded.userId]
  );
  if (!user) {
    res.status(401).json({ error: "User account no longer exists" });
    return;
  }
  const memberRow = await queryOne(
    "SELECT id FROM members WHERE user_id = ? OR email = ?",
    [user.id, user.email]
  );
  req.auth = {
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
    memberId: memberRow?.id ?? null
  };
  next();
}
function requireAdmin(req, res, next) {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.auth.role !== "admin") {
    res.status(403).json({ error: "Administrator authorization required" });
    return;
  }
  next();
}

// server/syncExpiry.ts
async function syncExpiredSubscriptions() {
  const today = todayDateStr();
  const ts = nowIso();
  const expiredRows = await query(
    `SELECT id, member_id FROM subscriptions WHERE status = 'active' AND expiry_date < ?`,
    [today]
  );
  for (const row of expiredRows) {
    await execute(
      `UPDATE subscriptions SET status = 'expired', updated_at = ? WHERE id = ?`,
      [ts, row.id]
    );
    const otherActive = await queryOne(
      `SELECT id FROM subscriptions WHERE member_id = ? AND status = 'active' AND expiry_date >= ? LIMIT 1`,
      [row.member_id, today]
    );
    if (!otherActive) {
      await execute(
        `UPDATE members SET status = 'expired', updated_at = ? WHERE id = ? AND status != 'suspended'`,
        [ts, row.member_id]
      );
    }
  }
}
async function evaluateMemberAccessState(memberId) {
  await syncExpiredSubscriptions();
  const member = await queryOne(
    "SELECT * FROM members WHERE id = ?",
    [memberId]
  );
  if (!member) return null;
  const subscriptions = await query(
    `SELECT * FROM subscriptions WHERE member_id = ? ORDER BY created_at DESC`,
    [memberId]
  );
  const activeSub = subscriptions.find((s) => s.status === "active") ?? null;
  const suspendedSub = subscriptions.find((s) => s.status === "suspended") ?? null;
  const latestSubscription = activeSub ?? subscriptions[0] ?? null;
  const latestPayment = latestSubscription ? await queryOne(
    `SELECT * FROM payments WHERE subscription_id = ? ORDER BY created_at DESC LIMIT 1`,
    [latestSubscription.id]
  ) : await queryOne(
    `SELECT * FROM payments WHERE member_id = ? ORDER BY created_at DESC LIMIT 1`,
    [memberId]
  );
  if (member.status === "suspended" || suspendedSub && !activeSub) {
    return {
      member,
      latestSubscription,
      latestPayment,
      verificationResult: "suspended",
      statusLabel: "SUSPENDED",
      reason: "Membership is currently suspended by administration."
    };
  }
  if (!latestSubscription) {
    return {
      member,
      latestSubscription: null,
      latestPayment,
      verificationResult: "unpaid",
      statusLabel: "UNPAID",
      reason: "No active subscription or confirmed payment on file."
    };
  }
  if (latestSubscription.payment_status !== "paid" || latestPayment?.status === "unpaid" || latestPayment?.status === "pending_approval") {
    return {
      member,
      latestSubscription,
      latestPayment,
      verificationResult: "unpaid",
      statusLabel: "UNPAID",
      reason: latestPayment?.status === "pending_approval" ? "Payment is awaiting administrator confirmation." : "Subscription payment is unpaid."
    };
  }
  if (latestSubscription.status === "expired" || isDateExpired(latestSubscription.expiry_date)) {
    return {
      member,
      latestSubscription,
      latestPayment,
      verificationResult: "expired",
      statusLabel: "EXPIRED",
      reason: `Membership expired on ${latestSubscription.expiry_date}.`
    };
  }
  if (latestSubscription.status === "active" && latestSubscription.payment_status === "paid") {
    return {
      member,
      latestSubscription,
      latestPayment,
      verificationResult: "valid",
      statusLabel: "VALID",
      reason: `Active ${latestSubscription.package_name} membership valid through ${latestSubscription.expiry_date}.`
    };
  }
  return {
    member,
    latestSubscription,
    latestPayment,
    verificationResult: "unpaid",
    statusLabel: "UNPAID",
    reason: "Membership requires active confirmation."
  };
}

// server/biometrics.ts
var import_node_crypto3 = __toESM(require("node:crypto"), 1);
var import_server = require("@simplewebauthn/server");
function getRpConfig(req) {
  const rpName = process.env.RP_NAME?.trim() || "ApexPulse Gym OS";
  const originHeader = req.headers.origin;
  const forwardedProto = req.headers["x-forwarded-proto"]?.split(",")[0]?.trim();
  const forwardedHost = req.headers["x-forwarded-host"]?.split(",")[0]?.trim();
  const hostHeader = forwardedHost || req.headers.host || "localhost:3000";
  const proto = forwardedProto || (hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1") ? "http" : "https");
  let origin = originHeader || process.env.APP_URL?.trim() || `${proto}://${hostHeader}`;
  if (origin.endsWith("/")) {
    origin = origin.slice(0, -1);
  }
  let rpID = process.env.RP_ID?.trim() || "";
  if (!rpID) {
    try {
      rpID = new URL(origin).hostname;
    } catch {
      rpID = hostHeader.split(":")[0];
    }
  }
  return { rpName, rpID, expectedOrigin: origin };
}
async function recordAttendanceAndBuildResult(memberId, method, deviceLabel) {
  const evaluation = await evaluateMemberAccessState(memberId);
  if (!evaluation) return null;
  const attendanceId = `att_${import_node_crypto3.default.randomUUID().slice(0, 12)}`;
  const scannedAt = nowIso();
  await execute(
    `INSERT INTO attendance (id, member_id, subscription_id, verification_method, verification_result, device_label, scanned_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      attendanceId,
      evaluation.member.id,
      evaluation.latestSubscription?.id ?? null,
      method,
      evaluation.verificationResult,
      deviceLabel,
      scannedAt
    ]
  );
  return {
    attendanceId,
    scannedAt,
    verificationMethod: method,
    verificationResult: evaluation.verificationResult,
    statusLabel: evaluation.statusLabel,
    reason: evaluation.reason,
    deviceLabel,
    member: {
      id: evaluation.member.id,
      memberCode: evaluation.member.member_code,
      fullName: evaluation.member.full_name,
      phone: evaluation.member.phone,
      age: Number(evaluation.member.age),
      status: evaluation.member.status
    },
    subscription: evaluation.latestSubscription ? {
      id: evaluation.latestSubscription.id,
      packageName: evaluation.latestSubscription.package_name,
      duration: evaluation.latestSubscription.duration,
      startDate: evaluation.latestSubscription.start_date,
      expiryDate: evaluation.latestSubscription.expiry_date,
      status: evaluation.latestSubscription.status,
      paymentStatus: evaluation.latestSubscription.payment_status
    } : null,
    payment: evaluation.latestPayment ? {
      id: evaluation.latestPayment.id,
      amount: Number(evaluation.latestPayment.amount),
      status: evaluation.latestPayment.status,
      method: evaluation.latestPayment.method,
      paidAt: evaluation.latestPayment.paid_at
    } : null
  };
}
function registerBiometricRoutes(router) {
  router.get(
    "/biometrics/member/:memberId",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const rows = await query(
        "SELECT id, member_id, provider, credential_id, device_label, counter, created_at FROM biometric_credentials WHERE member_id = ? ORDER BY created_at DESC",
        [req.params.memberId]
      );
      res.json({ credentials: rows });
    }
  );
  router.delete(
    "/biometrics/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const existing = await queryOne(
        "SELECT * FROM biometric_credentials WHERE id = ?",
        [req.params.id]
      );
      if (!existing) {
        res.status(404).json({ error: "Biometric credential not found" });
        return;
      }
      await execute("DELETE FROM biometric_credentials WHERE id = ?", [
        req.params.id
      ]);
      res.json({ ok: true });
    }
  );
  router.post(
    "/biometrics/webauthn/register-options",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const { memberId } = req.body;
      if (!memberId) {
        res.status(400).json({ error: "memberId is required" });
        return;
      }
      const member = await queryOne(
        "SELECT * FROM members WHERE id = ?",
        [memberId]
      );
      if (!member) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      const existingCreds = await query(
        `SELECT * FROM biometric_credentials WHERE member_id = ? AND provider = 'webauthn'`,
        [member.id]
      );
      const { rpName, rpID } = getRpConfig(req);
      const options = await (0, import_server.generateRegistrationOptions)({
        rpName,
        rpID,
        userName: member.email,
        userDisplayName: member.full_name,
        userID: new Uint8Array(Buffer.from(member.id, "utf8")),
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "required"
        },
        excludeCredentials: existingCreds.map((c) => ({
          id: c.credential_id,
          transports: JSON.parse(
            c.transports || "[]"
          )
        }))
      });
      const challengeId = `chl_${import_node_crypto3.default.randomUUID().slice(0, 12)}`;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1e3).toISOString();
      await execute(
        `INSERT INTO webauthn_challenges (id, challenge, purpose, member_id, expires_at, created_at) VALUES (?, ?, 'register', ?, ?, ?)`,
        [challengeId, options.challenge, member.id, expiresAt, nowIso()]
      );
      res.json({ challengeId, options });
    }
  );
  router.post(
    "/biometrics/webauthn/register-verify",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const { challengeId, memberId, response, deviceLabel } = req.body;
      if (!challengeId || !memberId || !response) {
        res.status(400).json({ error: "challengeId, memberId, and response are required" });
        return;
      }
      const challengeRow = await queryOne(
        `SELECT challenge, member_id, expires_at FROM webauthn_challenges WHERE id = ? AND purpose = 'register'`,
        [challengeId]
      );
      if (!challengeRow || challengeRow.member_id !== memberId) {
        res.status(400).json({
          error: "Biometric enrollment challenge not found or mismatched"
        });
        return;
      }
      if (challengeRow.expires_at < nowIso()) {
        await execute("DELETE FROM webauthn_challenges WHERE id = ?", [
          challengeId
        ]);
        res.status(400).json({ error: "Biometric enrollment challenge expired" });
        return;
      }
      const { rpID, expectedOrigin } = getRpConfig(req);
      try {
        const verification = await (0, import_server.verifyRegistrationResponse)({
          response,
          expectedChallenge: challengeRow.challenge,
          expectedOrigin,
          expectedRPID: rpID,
          requireUserVerification: true
        });
        await execute("DELETE FROM webauthn_challenges WHERE id = ?", [
          challengeId
        ]);
        if (!verification.verified || !verification.registrationInfo) {
          res.status(400).json({ error: "Hardware biometric verification failed" });
          return;
        }
        const { credential } = verification.registrationInfo;
        const publicKeyBase64 = Buffer.from(credential.publicKey).toString(
          "base64url"
        );
        const credRecordId = `bio_${import_node_crypto3.default.randomUUID().slice(0, 12)}`;
        await execute(
          `INSERT INTO biometric_credentials (id, member_id, provider, credential_id, public_key, counter, transports, device_label, template_hash, created_at)
         VALUES (?, ?, 'webauthn', ?, ?, ?, ?, ?, '', ?)`,
          [
            credRecordId,
            memberId,
            credential.id,
            publicKeyBase64,
            credential.counter,
            JSON.stringify(credential.transports || []),
            (deviceLabel || "WebAuthn Biometric Sensor").trim().slice(0, 80),
            nowIso()
          ]
        );
        res.status(201).json({ verified: true, credentialRecordId: credRecordId });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : "WebAuthn registration failed"
        });
      }
    }
  );
  router.post(
    "/biometrics/webauthn/verify-options",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const { memberId } = req.body || {};
      const creds = memberId ? await query(
        `SELECT * FROM biometric_credentials WHERE member_id = ? AND provider = 'webauthn'`,
        [memberId]
      ) : await query(
        `SELECT * FROM biometric_credentials WHERE provider = 'webauthn'`
      );
      if (creds.length === 0) {
        res.status(404).json({
          error: memberId ? "This member has no WebAuthn fingerprint credential enrolled." : "No members have enrolled WebAuthn biometric credentials yet."
        });
        return;
      }
      const { rpID } = getRpConfig(req);
      const options = await (0, import_server.generateAuthenticationOptions)({
        rpID,
        userVerification: "required",
        allowCredentials: creds.map((c) => ({
          id: c.credential_id,
          transports: JSON.parse(
            c.transports || "[]"
          )
        }))
      });
      const challengeId = `chl_${import_node_crypto3.default.randomUUID().slice(0, 12)}`;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1e3).toISOString();
      await execute(
        `INSERT INTO webauthn_challenges (id, challenge, purpose, member_id, expires_at, created_at) VALUES (?, ?, 'verify', ?, ?, ?)`,
        [challengeId, options.challenge, memberId || null, expiresAt, nowIso()]
      );
      res.json({ challengeId, options });
    }
  );
  router.post(
    "/biometrics/webauthn/verify",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const { challengeId, response, deviceLabel } = req.body;
      if (!challengeId || !response) {
        res.status(400).json({ error: "challengeId and response are required" });
        return;
      }
      const challengeRow = await queryOne(
        `SELECT challenge, expires_at FROM webauthn_challenges WHERE id = ? AND purpose = 'verify'`,
        [challengeId]
      );
      if (!challengeRow) {
        res.status(400).json({ error: "Verification challenge not found" });
        return;
      }
      if (challengeRow.expires_at < nowIso()) {
        await execute("DELETE FROM webauthn_challenges WHERE id = ?", [
          challengeId
        ]);
        res.status(400).json({ error: "Verification challenge expired" });
        return;
      }
      const cred = await queryOne(
        `SELECT * FROM biometric_credentials WHERE credential_id = ? AND provider = 'webauthn'`,
        [response.id]
      );
      if (!cred) {
        res.status(404).json({
          error: "Unrecognized biometric credential. Member not found."
        });
        return;
      }
      const { rpID, expectedOrigin } = getRpConfig(req);
      try {
        const verification = await (0, import_server.verifyAuthenticationResponse)({
          response,
          expectedChallenge: challengeRow.challenge,
          expectedOrigin,
          expectedRPID: rpID,
          requireUserVerification: true,
          credential: {
            id: cred.credential_id,
            publicKey: new Uint8Array(
              Buffer.from(cred.public_key, "base64url")
            ),
            counter: Number(cred.counter),
            transports: JSON.parse(
              cred.transports || "[]"
            )
          }
        });
        await execute("DELETE FROM webauthn_challenges WHERE id = ?", [
          challengeId
        ]);
        if (!verification.verified) {
          res.status(401).json({ error: "Biometric assertion verification failed" });
          return;
        }
        await execute(
          "UPDATE biometric_credentials SET counter = ? WHERE id = ?",
          [verification.authenticationInfo.newCounter, cred.id]
        );
        const result = await recordAttendanceAndBuildResult(
          cred.member_id,
          "webauthn",
          (deviceLabel || cred.device_label || "WebAuthn Fingerprint Sensor").slice(0, 80)
        );
        if (!result) {
          res.status(404).json({ error: "Member profile not found for credential" });
          return;
        }
        res.json(result);
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : "Biometric verification error"
        });
      }
    }
  );
  router.post(
    "/biometrics/sdk/enroll",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const { memberId, provider, templateData, deviceLabel } = req.body;
      if (!memberId || !provider || !templateData || templateData.trim().length < 32) {
        res.status(400).json({
          error: "Valid hardware biometric templateData captured from scanner SDK is required (minimum 32 chars)."
        });
        return;
      }
      if (!["secugen", "zkteco", "digitalpersona"].includes(provider)) {
        res.status(400).json({ error: "Unsupported hardware scanner SDK provider" });
        return;
      }
      const member = await queryOne(
        "SELECT * FROM members WHERE id = ?",
        [memberId]
      );
      if (!member) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      const templateHash = import_node_crypto3.default.createHash("sha256").update(templateData.trim()).digest("hex");
      const existingHash = await queryOne(
        "SELECT * FROM biometric_credentials WHERE template_hash = ?",
        [templateHash]
      );
      if (existingHash) {
        res.status(409).json({ error: "This fingerprint template is already enrolled." });
        return;
      }
      const credRecordId = `bio_${import_node_crypto3.default.randomUUID().slice(0, 12)}`;
      const credentialId = `${provider}_${templateHash.slice(0, 24)}`;
      await execute(
        `INSERT INTO biometric_credentials (id, member_id, provider, credential_id, public_key, counter, transports, device_label, template_hash, created_at)
       VALUES (?, ?, ?, ?, '', 0, '[]', ?, ?, ?)`,
        [
          credRecordId,
          memberId,
          provider,
          credentialId,
          (deviceLabel || `${provider.toUpperCase()} USB Scanner`).slice(0, 80),
          templateHash,
          nowIso()
        ]
      );
      res.status(201).json({
        enrolled: true,
        credentialRecordId: credRecordId,
        credentialId
      });
    }
  );
  router.post(
    "/biometrics/sdk/verify",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const { provider, templateData, matchedCredentialId, deviceLabel } = req.body;
      if (!provider || !templateData && !matchedCredentialId) {
        res.status(400).json({
          error: "Hardware scanner templateData or matchedCredentialId is required"
        });
        return;
      }
      let matchedCred = null;
      if (matchedCredentialId) {
        matchedCred = await queryOne(
          "SELECT * FROM biometric_credentials WHERE credential_id = ? AND provider = ?",
          [matchedCredentialId, provider]
        );
      } else if (templateData) {
        const templateHash = import_node_crypto3.default.createHash("sha256").update(templateData.trim()).digest("hex");
        matchedCred = await queryOne(
          "SELECT * FROM biometric_credentials WHERE template_hash = ? AND provider = ?",
          [templateHash, provider]
        );
      }
      if (!matchedCred) {
        res.status(404).json({
          error: "No matching enrolled member fingerprint found for hardware capture."
        });
        return;
      }
      const result = await recordAttendanceAndBuildResult(
        matchedCred.member_id,
        "hardware_sdk",
        (deviceLabel || matchedCred.device_label || `${provider.toUpperCase()} Scanner`).slice(0, 80)
      );
      if (!result) {
        res.status(404).json({ error: "Member profile not found" });
        return;
      }
      res.json(result);
    }
  );
}

// server/routes.ts
var VALID_DURATIONS = ["1m", "3m", "6m", "1y"];
function isValidDuration(value) {
  return VALID_DURATIONS.includes(value);
}
function setAuthCookie(res, token) {
  const isSecure = Boolean(
    process.env.VERCEL || process.env.NODE_ENV === "production"
  );
  res.cookie("apexpulse_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    maxAge: 24 * 60 * 60 * 1e3,
    path: "/"
  });
}
async function generateNextMemberCode() {
  const countRow = await queryOne(
    "SELECT COUNT(*) as cnt FROM members"
  );
  let seq = Number(countRow?.cnt ?? 0) + 1001;
  while (true) {
    const candidate = `MEM-${seq}`;
    const exists = await queryOne(
      "SELECT id FROM members WHERE member_code = ?",
      [candidate]
    );
    if (!exists) return candidate;
    seq += 1;
  }
}
async function hydratePackages() {
  const packages = await query(
    "SELECT * FROM packages ORDER BY is_deal ASC, created_at ASC"
  );
  const services = await query(
    "SELECT * FROM services ORDER BY name ASC"
  );
  const links = await query(
    "SELECT package_id, service_id FROM package_services"
  );
  const prices = await query("SELECT package_id, duration, price FROM package_prices");
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  return packages.map((pkg) => {
    const pkgServiceIds = links.filter((l) => l.package_id === pkg.id).map((l) => l.service_id);
    const pkgServices = pkgServiceIds.map((sid) => serviceMap.get(sid)).filter((s) => Boolean(s));
    const priceMap = {
      "1m": 0,
      "3m": 0,
      "6m": 0,
      "1y": 0
    };
    for (const p of prices) {
      if (p.package_id === pkg.id && isValidDuration(p.duration)) {
        priceMap[p.duration] = Number(p.price);
      }
    }
    return {
      id: pkg.id,
      name: pkg.name,
      category: pkg.category,
      description: pkg.description,
      isDeal: Boolean(pkg.is_deal),
      isActive: Boolean(pkg.is_active),
      serviceIds: pkgServiceIds,
      services: pkgServices.map((s) => ({ id: s.id, name: s.name })),
      prices: priceMap,
      createdAt: pkg.created_at,
      updatedAt: pkg.updated_at
    };
  });
}
function createApiRouter() {
  const router = import_express.default.Router();
  router.get("/health", async (_req, res) => {
    res.json({ status: "ok", dbEngine: getDbEngine(), timestamp: nowIso() });
  });
  router.get(
    "/sync/stamp",
    requireAuth,
    async (req, res) => {
      const [mRow, sRow, pRow, pkgRow, svcRow, attRow, bioRow] = await Promise.all([
        queryOne(
          "SELECT MAX(updated_at) as v, COUNT(*) as c FROM members"
        ),
        queryOne(
          "SELECT MAX(updated_at) as v, COUNT(*) as c FROM subscriptions"
        ),
        queryOne(
          "SELECT MAX(created_at) as v, COUNT(*) as c FROM payments"
        ),
        queryOne(
          "SELECT MAX(updated_at) as v, COUNT(*) as c FROM packages"
        ),
        queryOne(
          "SELECT MAX(updated_at) as v, COUNT(*) as c FROM services"
        ),
        queryOne(
          "SELECT MAX(scanned_at) as v, COUNT(*) as c FROM attendance"
        ),
        queryOne(
          "SELECT MAX(created_at) as v, COUNT(*) as c FROM biometric_credentials"
        )
      ]);
      const stamp = {
        members: `${mRow?.v ?? ""}:${Number(mRow?.c ?? 0)}`,
        subscriptions: `${sRow?.v ?? ""}:${Number(sRow?.c ?? 0)}`,
        payments: `${pRow?.v ?? ""}:${Number(pRow?.c ?? 0)}`,
        packages: `${pkgRow?.v ?? ""}:${Number(pkgRow?.c ?? 0)}`,
        services: `${svcRow?.v ?? ""}:${Number(svcRow?.c ?? 0)}`,
        attendance: `${attRow?.v ?? ""}:${Number(attRow?.c ?? 0)}`,
        biometrics: `${bioRow?.v ?? ""}:${Number(bioRow?.c ?? 0)}`,
        role: req.auth?.role
      };
      res.json({ stamp });
    }
  );
  router.get("/auth/status", async (_req, res) => {
    const adminRow = await queryOne(
      `SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'`
    );
    res.json({
      hasAdmin: Number(adminRow?.cnt ?? 0) > 0,
      dbEngine: getDbEngine()
    });
  });
  router.post("/auth/setup-admin", async (req, res) => {
    const adminCount = await queryOne(
      `SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'`
    );
    if (Number(adminCount?.cnt ?? 0) > 0) {
      res.status(403).json({
        error: "Facility administrator already initialized. Please sign in."
      });
      return;
    }
    const { fullName, email, password } = req.body;
    if (!fullName?.trim() || !email?.trim() || !password || password.length < 8) {
      res.status(400).json({
        error: "Full name, valid email, and password (min 8 chars) are required."
      });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await queryOne(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail]
    );
    if (existingUser) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    const userId = `usr_${import_node_crypto4.default.randomUUID().slice(0, 12)}`;
    const passwordHash = await hashPassword(password);
    await execute(
      "INSERT INTO users (id, email, password_hash, role, full_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [
        userId,
        normalizedEmail,
        passwordHash,
        "admin",
        fullName.trim(),
        nowIso()
      ]
    );
    const payload = {
      userId,
      email: normalizedEmail,
      role: "admin",
      fullName: fullName.trim(),
      memberId: null
    };
    const token = signAuthToken(payload);
    setAuthCookie(res, token);
    res.status(201).json({ token, user: payload });
  });
  router.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await queryOne("SELECT * FROM users WHERE email = ?", [
      normalizedEmail
    ]);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    const memberRow = await queryOne(
      "SELECT id FROM members WHERE user_id = ? OR email = ?",
      [user.id, user.email]
    );
    if (memberRow) {
      await execute(
        "UPDATE members SET user_id = ? WHERE id = ? AND user_id IS NULL",
        [user.id, memberRow.id]
      );
    }
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      memberId: memberRow?.id ?? null
    };
    const token = signAuthToken(payload);
    setAuthCookie(res, token);
    res.json({ token, user: payload });
  });
  router.post("/auth/register", async (req, res) => {
    const { fullName, email, phone, age, password } = req.body;
    if (!fullName?.trim() || !email?.trim() || !phone?.trim() || !age || !password || password.length < 8) {
      res.status(400).json({
        error: "Full name, email, phone, age, and password (min 8 chars) are required."
      });
      return;
    }
    const parsedAge = Number(age);
    if (!Number.isInteger(parsedAge) || parsedAge < 12 || parsedAge > 110) {
      res.status(400).json({ error: "Age must be an integer between 12 and 110." });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await queryOne(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail]
    );
    if (existingUser) {
      res.status(409).json({ error: "An account with this email is already registered." });
      return;
    }
    const ts = nowIso();
    const userId = `usr_${import_node_crypto4.default.randomUUID().slice(0, 12)}`;
    const passwordHash = await hashPassword(password);
    await execute(
      "INSERT INTO users (id, email, password_hash, role, full_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, normalizedEmail, passwordHash, "member", fullName.trim(), ts]
    );
    const member = await queryOne(
      "SELECT * FROM members WHERE email = ?",
      [normalizedEmail]
    );
    let memberId;
    if (member) {
      memberId = member.id;
      await execute(
        "UPDATE members SET user_id = ?, updated_at = ? WHERE id = ?",
        [userId, ts, memberId]
      );
    } else {
      memberId = `mem_${import_node_crypto4.default.randomUUID().slice(0, 12)}`;
      const memberCode = await generateNextMemberCode();
      await execute(
        `INSERT INTO members (id, user_id, member_code, full_name, email, phone, age, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', '', ?, ?)`,
        [
          memberId,
          userId,
          memberCode,
          fullName.trim(),
          normalizedEmail,
          phone.trim(),
          parsedAge,
          ts,
          ts
        ]
      );
    }
    const payload = {
      userId,
      email: normalizedEmail,
      role: "member",
      fullName: fullName.trim(),
      memberId
    };
    const token = signAuthToken(payload);
    setAuthCookie(res, token);
    res.status(201).json({ token, user: payload });
  });
  router.post("/auth/logout", (_req, res) => {
    res.clearCookie("apexpulse_token", { path: "/" });
    res.json({ ok: true });
  });
  router.get(
    "/auth/me",
    requireAuth,
    async (req, res) => {
      res.json({ user: req.auth });
    }
  );
  router.get("/services", requireAuth, async (_req, res) => {
    const rows = await query(
      "SELECT * FROM services ORDER BY name ASC"
    );
    res.json({
      services: rows.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        isActive: Boolean(s.is_active),
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }))
    });
  });
  router.post("/services", requireAuth, requireAdmin, async (req, res) => {
    const { name, description } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: "Service name is required." });
      return;
    }
    const existing = await queryOne(
      "SELECT id FROM services WHERE LOWER(name) = LOWER(?)",
      [name.trim()]
    );
    if (existing) {
      res.status(409).json({ error: "A service with this name already exists." });
      return;
    }
    const id = `svc_${import_node_crypto4.default.randomUUID().slice(0, 10)}`;
    const ts = nowIso();
    await execute(
      "INSERT INTO services (id, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
      [id, name.trim(), (description || "").trim(), ts, ts]
    );
    res.status(201).json({
      id,
      name: name.trim(),
      description: (description || "").trim(),
      isActive: true
    });
  });
  router.put("/services/:id", requireAuth, requireAdmin, async (req, res) => {
    const { name, description, isActive } = req.body;
    const existing = await queryOne(
      "SELECT * FROM services WHERE id = ?",
      [req.params.id]
    );
    if (!existing) {
      res.status(404).json({ error: "Service not found." });
      return;
    }
    const ts = nowIso();
    await execute(
      "UPDATE services SET name = ?, description = ?, is_active = ?, updated_at = ? WHERE id = ?",
      [
        name?.trim() || existing.name,
        description !== void 0 ? description.trim() : existing.description,
        isActive !== void 0 ? isActive ? 1 : 0 : existing.is_active,
        ts,
        existing.id
      ]
    );
    res.json({ ok: true });
  });
  router.delete(
    "/services/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const existing = await queryOne(
        "SELECT * FROM services WHERE id = ?",
        [req.params.id]
      );
      if (!existing) {
        res.status(404).json({ error: "Service not found." });
        return;
      }
      await execute("DELETE FROM services WHERE id = ?", [existing.id]);
      res.json({ ok: true });
    }
  );
  router.get("/packages", requireAuth, async (_req, res) => {
    const packages = await hydratePackages();
    res.json({ packages });
  });
  router.post("/packages", requireAuth, requireAdmin, async (req, res) => {
    const { name, category, description, isDeal, serviceIds, prices } = req.body;
    if (!name?.trim() || !Array.isArray(serviceIds) || serviceIds.length === 0 || !prices) {
      res.status(400).json({
        error: "Package name, at least one service, and duration prices are required."
      });
      return;
    }
    for (const dur of VALID_DURATIONS) {
      const val = Number(prices[dur]);
      if (Number.isNaN(val) || val < 0) {
        res.status(400).json({
          error: `Valid non-negative price required for duration ${dur}.`
        });
        return;
      }
    }
    const pkgCategory = category && ["gym_only", "cardio_only", "gym_cardio", "custom_deal"].includes(
      category
    ) ? category : "custom_deal";
    const pkgId = `pkg_${import_node_crypto4.default.randomUUID().slice(0, 10)}`;
    const ts = nowIso();
    await execute(
      "INSERT INTO packages (id, name, category, description, is_deal, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
      [
        pkgId,
        name.trim(),
        pkgCategory,
        (description || "").trim(),
        isDeal ? 1 : 0,
        ts,
        ts
      ]
    );
    for (const sid of serviceIds) {
      const svc = await queryOne(
        "SELECT id FROM services WHERE id = ?",
        [sid]
      );
      if (svc) {
        await execute(
          "INSERT INTO package_services (package_id, service_id) VALUES (?, ?)",
          [pkgId, sid]
        );
      }
    }
    for (const dur of VALID_DURATIONS) {
      await execute(
        "INSERT INTO package_prices (id, package_id, duration, price) VALUES (?, ?, ?, ?)",
        [
          `pp_${import_node_crypto4.default.randomUUID().slice(0, 8)}`,
          pkgId,
          dur,
          Number(prices[dur])
        ]
      );
    }
    const all = await hydratePackages();
    res.status(201).json({ package: all.find((p) => p.id === pkgId) });
  });
  router.put("/packages/:id", requireAuth, requireAdmin, async (req, res) => {
    const existing = await queryOne(
      "SELECT * FROM packages WHERE id = ?",
      [req.params.id]
    );
    if (!existing) {
      res.status(404).json({ error: "Package not found." });
      return;
    }
    const {
      name,
      category,
      description,
      isDeal,
      isActive,
      serviceIds,
      prices
    } = req.body;
    const ts = nowIso();
    await execute(
      "UPDATE packages SET name = ?, category = ?, description = ?, is_deal = ?, is_active = ?, updated_at = ? WHERE id = ?",
      [
        name?.trim() || existing.name,
        category && ["gym_only", "cardio_only", "gym_cardio", "custom_deal"].includes(
          category
        ) ? category : existing.category,
        description !== void 0 ? description.trim() : existing.description,
        isDeal !== void 0 ? isDeal ? 1 : 0 : existing.is_deal,
        isActive !== void 0 ? isActive ? 1 : 0 : existing.is_active,
        ts,
        existing.id
      ]
    );
    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      await execute("DELETE FROM package_services WHERE package_id = ?", [
        existing.id
      ]);
      for (const sid of serviceIds) {
        const svc = await queryOne(
          "SELECT id FROM services WHERE id = ?",
          [sid]
        );
        if (svc) {
          await execute(
            "INSERT INTO package_services (package_id, service_id) VALUES (?, ?)",
            [existing.id, sid]
          );
        }
      }
    }
    if (prices) {
      for (const dur of VALID_DURATIONS) {
        if (prices[dur] !== void 0) {
          const val = Number(prices[dur]);
          if (Number.isNaN(val) || val < 0) {
            res.status(400).json({ error: `Invalid price for ${dur}` });
            return;
          }
          const existingPrice = await queryOne(
            "SELECT id FROM package_prices WHERE package_id = ? AND duration = ?",
            [existing.id, dur]
          );
          if (existingPrice) {
            await execute("UPDATE package_prices SET price = ? WHERE id = ?", [
              val,
              existingPrice.id
            ]);
          } else {
            await execute(
              "INSERT INTO package_prices (id, package_id, duration, price) VALUES (?, ?, ?, ?)",
              [`pp_${import_node_crypto4.default.randomUUID().slice(0, 8)}`, existing.id, dur, val]
            );
          }
        }
      }
    }
    const all = await hydratePackages();
    res.json({ package: all.find((p) => p.id === existing.id) });
  });
  router.delete(
    "/packages/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const existing = await queryOne(
        "SELECT * FROM packages WHERE id = ?",
        [req.params.id]
      );
      if (!existing) {
        res.status(404).json({ error: "Package not found." });
        return;
      }
      const used = await queryOne(
        "SELECT id FROM subscriptions WHERE package_id = ? LIMIT 1",
        [existing.id]
      );
      if (used) {
        await execute(
          "UPDATE packages SET is_active = 0, updated_at = ? WHERE id = ?",
          [nowIso(), existing.id]
        );
        res.json({ ok: true, archived: true });
        return;
      }
      await execute("DELETE FROM packages WHERE id = ?", [existing.id]);
      res.json({ ok: true, archived: false });
    }
  );
  router.get(
    "/members",
    requireAuth,
    async (req, res) => {
      await syncExpiredSubscriptions();
      let members;
      if (req.auth.role === "admin") {
        members = await query(
          "SELECT * FROM members ORDER BY created_at DESC"
        );
      } else if (req.auth.memberId) {
        members = await query("SELECT * FROM members WHERE id = ?", [
          req.auth.memberId
        ]);
      } else {
        members = [];
      }
      const subscriptions = await query(
        "SELECT * FROM subscriptions ORDER BY created_at DESC"
      );
      const payments = await query(
        "SELECT * FROM payments ORDER BY created_at DESC"
      );
      const bioCounts = await query(
        "SELECT member_id, COUNT(*) as cnt FROM biometric_credentials GROUP BY member_id"
      );
      const bioMap = new Map(
        bioCounts.map((b) => [b.member_id, Number(b.cnt)])
      );
      const enriched = members.map((m) => {
        const memberSubs = subscriptions.filter((s) => s.member_id === m.id);
        const activeOrLatestSub = memberSubs.find((s) => s.status === "active") ?? memberSubs[0] ?? null;
        const latestPayment = activeOrLatestSub ? payments.find((p) => p.subscription_id === activeOrLatestSub.id) ?? null : payments.find((p) => p.member_id === m.id) ?? null;
        return {
          id: m.id,
          userId: m.user_id,
          memberCode: m.member_code,
          fullName: m.full_name,
          email: m.email,
          phone: m.phone,
          age: Number(m.age),
          status: m.status,
          notes: m.notes,
          biometricCount: bioMap.get(m.id) ?? 0,
          activeSubscription: activeOrLatestSub ? {
            id: activeOrLatestSub.id,
            packageId: activeOrLatestSub.package_id,
            packageName: activeOrLatestSub.package_name,
            duration: activeOrLatestSub.duration,
            amount: Number(activeOrLatestSub.amount),
            startDate: activeOrLatestSub.start_date,
            expiryDate: activeOrLatestSub.expiry_date,
            status: activeOrLatestSub.status,
            paymentStatus: activeOrLatestSub.payment_status
          } : null,
          latestPayment: latestPayment ? {
            id: latestPayment.id,
            amount: Number(latestPayment.amount),
            method: latestPayment.method,
            status: latestPayment.status,
            paidAt: latestPayment.paid_at
          } : null,
          createdAt: m.created_at,
          updatedAt: m.updated_at
        };
      });
      res.json({ members: enriched });
    }
  );
  router.get(
    "/members/:id",
    requireAuth,
    async (req, res) => {
      await syncExpiredSubscriptions();
      const targetId = req.params.id;
      if (req.auth.role !== "admin" && req.auth.memberId !== targetId) {
        res.status(403).json({ error: "Access denied to this member profile." });
        return;
      }
      const member = await queryOne(
        "SELECT * FROM members WHERE id = ?",
        [targetId]
      );
      if (!member) {
        res.status(404).json({ error: "Member not found." });
        return;
      }
      const subscriptions = await query(
        "SELECT * FROM subscriptions WHERE member_id = ? ORDER BY created_at DESC",
        [member.id]
      );
      const payments = await query(
        "SELECT * FROM payments WHERE member_id = ? ORDER BY created_at DESC",
        [member.id]
      );
      const attendance = await query(
        "SELECT * FROM attendance WHERE member_id = ? ORDER BY scanned_at DESC LIMIT 100",
        [member.id]
      );
      const biometrics = await query(
        "SELECT id, provider, credential_id, device_label, created_at FROM biometric_credentials WHERE member_id = ? ORDER BY created_at DESC",
        [member.id]
      );
      res.json({
        member: {
          id: member.id,
          userId: member.user_id,
          memberCode: member.member_code,
          fullName: member.full_name,
          email: member.email,
          phone: member.phone,
          age: Number(member.age),
          status: member.status,
          notes: member.notes,
          createdAt: member.created_at,
          updatedAt: member.updated_at
        },
        subscriptions,
        payments,
        attendance,
        biometrics
      });
    }
  );
  router.post(
    "/members",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const {
        fullName,
        email,
        phone,
        age,
        notes,
        accountPassword,
        packageId,
        duration,
        startDate,
        paymentStatus,
        paymentMethod,
        referenceNo
      } = req.body;
      if (!fullName?.trim() || !email?.trim() || !phone?.trim() || !age) {
        res.status(400).json({ error: "Full name, email, phone, and age are required." });
        return;
      }
      const parsedAge = Number(age);
      if (!Number.isInteger(parsedAge) || parsedAge < 12 || parsedAge > 110) {
        res.status(400).json({ error: "Age must be between 12 and 110." });
        return;
      }
      const normalizedEmail = email.trim().toLowerCase();
      const existingMember = await queryOne(
        "SELECT id FROM members WHERE email = ?",
        [normalizedEmail]
      );
      if (existingMember) {
        res.status(409).json({
          error: "A member with this email address is already registered."
        });
        return;
      }
      const ts = nowIso();
      let userId = null;
      const existingUser = await queryOne(
        "SELECT id, role FROM users WHERE email = ?",
        [normalizedEmail]
      );
      if (existingUser) {
        userId = existingUser.id;
      } else if (accountPassword && accountPassword.length >= 8) {
        userId = `usr_${import_node_crypto4.default.randomUUID().slice(0, 12)}`;
        const passwordHash = await hashPassword(accountPassword);
        await execute(
          "INSERT INTO users (id, email, password_hash, role, full_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [
            userId,
            normalizedEmail,
            passwordHash,
            "member",
            fullName.trim(),
            ts
          ]
        );
      }
      const memberId = `mem_${import_node_crypto4.default.randomUUID().slice(0, 12)}`;
      const memberCode = await generateNextMemberCode();
      const initialMemberStatus = packageId && paymentStatus === "paid" ? "active" : "pending";
      await execute(
        `INSERT INTO members (id, user_id, member_code, full_name, email, phone, age, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          memberId,
          userId,
          memberCode,
          fullName.trim(),
          normalizedEmail,
          phone.trim(),
          parsedAge,
          initialMemberStatus,
          (notes || "").trim(),
          ts,
          ts
        ]
      );
      if (packageId && duration && isValidDuration(duration)) {
        const pkg = await queryOne(
          "SELECT * FROM packages WHERE id = ?",
          [packageId]
        );
        const priceRow = await queryOne(
          "SELECT price FROM package_prices WHERE package_id = ? AND duration = ?",
          [packageId, duration]
        );
        if (pkg && priceRow) {
          const subId = `sub_${import_node_crypto4.default.randomUUID().slice(0, 12)}`;
          const effStart = startDate?.slice(0, 10) || todayDateStr();
          const expiryDate = calculateExpiryDate(effStart, duration);
          const isPaid = paymentStatus === "paid";
          const subStatus = isPaid ? expiryDate < todayDateStr() ? "expired" : "active" : "pending_approval";
          const subPaymentStatus = isPaid ? "paid" : "unpaid";
          await execute(
            `INSERT INTO subscriptions (id, member_id, package_id, package_name, duration, amount, start_date, expiry_date, status, payment_status, approved_by_user_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              subId,
              memberId,
              pkg.id,
              pkg.name,
              duration,
              Number(priceRow.price),
              effStart,
              expiryDate,
              subStatus,
              subPaymentStatus,
              req.auth.userId,
              ts,
              ts
            ]
          );
          if (subStatus === "expired") {
            await execute(
              `UPDATE members SET status = 'expired' WHERE id = ?`,
              [memberId]
            );
          }
          const payId = `pay_${import_node_crypto4.default.randomUUID().slice(0, 12)}`;
          await execute(
            `INSERT INTO payments (id, member_id, subscription_id, amount, method, status, reference_no, notes, approved_by_user_id, paid_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              payId,
              memberId,
              subId,
              Number(priceRow.price),
              paymentMethod || "cash",
              isPaid ? "confirmed" : "unpaid",
              (referenceNo || "").trim(),
              "Initial registration subscription",
              isPaid ? req.auth.userId : null,
              isPaid ? ts : null,
              ts
            ]
          );
        }
      }
      res.status(201).json({ id: memberId, memberCode });
    }
  );
  router.put(
    "/members/:id",
    requireAuth,
    async (req, res) => {
      const member = await queryOne(
        "SELECT * FROM members WHERE id = ?",
        [req.params.id]
      );
      if (!member) {
        res.status(404).json({ error: "Member not found." });
        return;
      }
      if (req.auth.role !== "admin" && req.auth.memberId !== member.id) {
        res.status(403).json({ error: "Access denied." });
        return;
      }
      const { fullName, phone, age, notes } = req.body;
      const nextAge = age !== void 0 ? Number(age) : member.age;
      if (!Number.isInteger(nextAge) || nextAge < 12 || nextAge > 110) {
        res.status(400).json({ error: "Age must be between 12 and 110." });
        return;
      }
      const ts = nowIso();
      if (req.auth.role === "admin") {
        await execute(
          "UPDATE members SET full_name = ?, phone = ?, age = ?, notes = ?, updated_at = ? WHERE id = ?",
          [
            fullName?.trim() || member.full_name,
            phone?.trim() || member.phone,
            nextAge,
            notes !== void 0 ? notes.trim() : member.notes,
            ts,
            member.id
          ]
        );
      } else {
        await execute(
          "UPDATE members SET phone = ?, age = ?, updated_at = ? WHERE id = ?",
          [phone?.trim() || member.phone, nextAge, ts, member.id]
        );
      }
      res.json({ ok: true });
    }
  );
  router.post(
    "/members/:id/status",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const member = await queryOne(
        "SELECT * FROM members WHERE id = ?",
        [req.params.id]
      );
      if (!member) {
        res.status(404).json({ error: "Member not found." });
        return;
      }
      const { status } = req.body;
      if (status !== "active" && status !== "suspended") {
        res.status(400).json({ error: "Status must be active or suspended." });
        return;
      }
      const ts = nowIso();
      if (status === "suspended") {
        await execute(
          `UPDATE members SET status = 'suspended', updated_at = ? WHERE id = ?`,
          [ts, member.id]
        );
        await execute(
          `UPDATE subscriptions SET status = 'suspended', updated_at = ? WHERE member_id = ? AND status = 'active'`,
          [ts, member.id]
        );
      } else {
        const today = todayDateStr();
        await execute(
          `UPDATE subscriptions SET status = 'active', updated_at = ? WHERE member_id = ? AND status = 'suspended' AND payment_status = 'paid' AND expiry_date >= ?`,
          [ts, member.id, today]
        );
        const activeSub = await queryOne(
          `SELECT id FROM subscriptions WHERE member_id = ? AND status = 'active' AND expiry_date >= ? LIMIT 1`,
          [member.id, today]
        );
        const nextStatus = activeSub ? "active" : "expired";
        await execute(
          "UPDATE members SET status = ?, updated_at = ? WHERE id = ?",
          [nextStatus, ts, member.id]
        );
      }
      res.json({ ok: true });
    }
  );
  router.delete("/members/:id", requireAuth, requireAdmin, async (req, res) => {
    const member = await queryOne(
      "SELECT * FROM members WHERE id = ?",
      [req.params.id]
    );
    if (!member) {
      res.status(404).json({ error: "Member not found." });
      return;
    }
    await execute("DELETE FROM members WHERE id = ?", [member.id]);
    res.json({ ok: true });
  });
  router.get(
    "/subscriptions",
    requireAuth,
    async (req, res) => {
      await syncExpiredSubscriptions();
      const rows = req.auth.role === "admin" ? await query(
        `SELECT s.*, m.full_name as member_name, m.member_code, m.phone
             FROM subscriptions s
             JOIN members m ON s.member_id = m.id
             ORDER BY s.created_at DESC`
      ) : req.auth.memberId ? await query(
        `SELECT s.*, m.full_name as member_name, m.member_code, m.phone
               FROM subscriptions s
               JOIN members m ON s.member_id = m.id
               WHERE s.member_id = ?
               ORDER BY s.created_at DESC`,
        [req.auth.memberId]
      ) : [];
      res.json({ subscriptions: rows });
    }
  );
  router.post(
    "/subscriptions",
    requireAuth,
    async (req, res) => {
      const {
        memberId,
        packageId,
        duration,
        startDate,
        paymentStatus,
        paymentMethod,
        referenceNo
      } = req.body;
      const targetMemberId = req.auth.role === "admin" ? memberId : req.auth.memberId;
      if (!targetMemberId || !packageId || !duration || !isValidDuration(duration)) {
        res.status(400).json({
          error: "Valid member, packageId, and duration are required."
        });
        return;
      }
      const member = await queryOne(
        "SELECT * FROM members WHERE id = ?",
        [targetMemberId]
      );
      if (!member) {
        res.status(404).json({ error: "Member not found." });
        return;
      }
      const pkg = await queryOne(
        "SELECT * FROM packages WHERE id = ?",
        [packageId]
      );
      const priceRow = await queryOne(
        "SELECT price FROM package_prices WHERE package_id = ? AND duration = ?",
        [packageId, duration]
      );
      if (!pkg || !priceRow) {
        res.status(404).json({ error: "Package or duration pricing not found." });
        return;
      }
      const ts = nowIso();
      const subId = `sub_${import_node_crypto4.default.randomUUID().slice(0, 12)}`;
      const payId = `pay_${import_node_crypto4.default.randomUUID().slice(0, 12)}`;
      const effStart = startDate?.slice(0, 10) || todayDateStr();
      const expiryDate = calculateExpiryDate(effStart, duration);
      const amount = Number(priceRow.price);
      if (req.auth.role === "admin") {
        const isPaid = paymentStatus === "paid";
        const subStatus = isPaid ? expiryDate < todayDateStr() ? "expired" : "active" : "pending_approval";
        await execute(
          `INSERT INTO subscriptions (id, member_id, package_id, package_name, duration, amount, start_date, expiry_date, status, payment_status, approved_by_user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            subId,
            member.id,
            pkg.id,
            pkg.name,
            duration,
            amount,
            effStart,
            expiryDate,
            subStatus,
            isPaid ? "paid" : "unpaid",
            req.auth.userId,
            ts,
            ts
          ]
        );
        if (isPaid && subStatus === "active") {
          await execute(
            `UPDATE members SET status = 'active', updated_at = ? WHERE id = ?`,
            [ts, member.id]
          );
        }
        await execute(
          `INSERT INTO payments (id, member_id, subscription_id, amount, method, status, reference_no, notes, approved_by_user_id, paid_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            payId,
            member.id,
            subId,
            amount,
            paymentMethod || "cash",
            isPaid ? "confirmed" : "unpaid",
            (referenceNo || "").trim(),
            `Subscription: ${pkg.name} (${duration.toUpperCase()})`,
            isPaid ? req.auth.userId : null,
            isPaid ? ts : null,
            ts
          ]
        );
      } else {
        await execute(
          `INSERT INTO subscriptions (id, member_id, package_id, package_name, duration, amount, start_date, expiry_date, status, payment_status, approved_by_user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', 'pending', NULL, ?, ?)`,
          [
            subId,
            member.id,
            pkg.id,
            pkg.name,
            duration,
            amount,
            effStart,
            expiryDate,
            ts,
            ts
          ]
        );
        await execute(
          `INSERT INTO payments (id, member_id, subscription_id, amount, method, status, reference_no, notes, approved_by_user_id, paid_at, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending_approval', ?, ?, NULL, NULL, ?)`,
          [
            payId,
            member.id,
            subId,
            amount,
            paymentMethod || "transfer",
            (referenceNo || "").trim(),
            `Member requested ${pkg.name} (${duration.toUpperCase()})`,
            ts
          ]
        );
      }
      res.status(201).json({ subscriptionId: subId, paymentId: payId });
    }
  );
  router.post(
    "/subscriptions/:id/renew",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const existing = await queryOne(
        "SELECT * FROM subscriptions WHERE id = ?",
        [req.params.id]
      );
      if (!existing) {
        res.status(404).json({ error: "Subscription not found." });
        return;
      }
      const { packageId, duration, paymentStatus, paymentMethod, referenceNo } = req.body;
      const nextPkgId = packageId || existing.package_id;
      const nextDuration = duration && isValidDuration(duration) ? duration : existing.duration;
      const pkg = await queryOne(
        "SELECT * FROM packages WHERE id = ?",
        [nextPkgId]
      );
      const priceRow = await queryOne(
        "SELECT price FROM package_prices WHERE package_id = ? AND duration = ?",
        [nextPkgId, nextDuration]
      );
      if (!pkg || !priceRow) {
        res.status(404).json({ error: "Package pricing not found." });
        return;
      }
      const today = todayDateStr();
      const startDate = existing.expiry_date > today ? existing.expiry_date : today;
      const expiryDate = calculateExpiryDate(startDate, nextDuration);
      const ts = nowIso();
      const isPaid = paymentStatus !== "unpaid";
      const subId = `sub_${import_node_crypto4.default.randomUUID().slice(0, 12)}`;
      const payId = `pay_${import_node_crypto4.default.randomUUID().slice(0, 12)}`;
      await execute(
        `INSERT INTO subscriptions (id, member_id, package_id, package_name, duration, amount, start_date, expiry_date, status, payment_status, approved_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          subId,
          existing.member_id,
          pkg.id,
          pkg.name,
          nextDuration,
          Number(priceRow.price),
          startDate,
          expiryDate,
          isPaid ? "active" : "pending_approval",
          isPaid ? "paid" : "unpaid",
          req.auth.userId,
          ts,
          ts
        ]
      );
      if (isPaid) {
        await execute(
          `UPDATE members SET status = 'active', updated_at = ? WHERE id = ?`,
          [ts, existing.member_id]
        );
      }
      await execute(
        `INSERT INTO payments (id, member_id, subscription_id, amount, method, status, reference_no, notes, approved_by_user_id, paid_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payId,
          existing.member_id,
          subId,
          Number(priceRow.price),
          paymentMethod || "cash",
          isPaid ? "confirmed" : "unpaid",
          (referenceNo || "").trim(),
          `Renewal: ${pkg.name} (${nextDuration.toUpperCase()})`,
          isPaid ? req.auth.userId : null,
          isPaid ? ts : null,
          ts
        ]
      );
      res.status(201).json({
        subscriptionId: subId,
        paymentId: payId,
        startDate,
        expiryDate
      });
    }
  );
  router.post(
    "/subscriptions/:id/approve",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const sub = await queryOne(
        "SELECT * FROM subscriptions WHERE id = ?",
        [req.params.id]
      );
      if (!sub) {
        res.status(404).json({ error: "Subscription not found." });
        return;
      }
      const ts = nowIso();
      const today = todayDateStr();
      const startDate = sub.start_date >= today ? sub.start_date : today;
      const expiryDate = calculateExpiryDate(startDate, sub.duration);
      await execute(
        `UPDATE subscriptions SET start_date = ?, expiry_date = ?, status = 'active', payment_status = 'paid', approved_by_user_id = ?, updated_at = ? WHERE id = ?`,
        [startDate, expiryDate, req.auth.userId, ts, sub.id]
      );
      await execute(
        `UPDATE payments SET status = 'confirmed', approved_by_user_id = ?, paid_at = ? WHERE subscription_id = ? AND status != 'confirmed'`,
        [req.auth.userId, ts, sub.id]
      );
      await execute(
        `UPDATE members SET status = 'active', updated_at = ? WHERE id = ?`,
        [ts, sub.member_id]
      );
      res.json({ ok: true, startDate, expiryDate });
    }
  );
  router.get(
    "/payments",
    requireAuth,
    async (req, res) => {
      const rows = req.auth.role === "admin" ? await query(
        `SELECT p.*, m.full_name as member_name, m.member_code, s.package_name, s.duration, s.expiry_date
             FROM payments p
             JOIN members m ON p.member_id = m.id
             JOIN subscriptions s ON p.subscription_id = s.id
             ORDER BY p.created_at DESC`
      ) : req.auth.memberId ? await query(
        `SELECT p.*, m.full_name as member_name, m.member_code, s.package_name, s.duration, s.expiry_date
               FROM payments p
               JOIN members m ON p.member_id = m.id
               JOIN subscriptions s ON p.subscription_id = s.id
               WHERE p.member_id = ?
               ORDER BY p.created_at DESC`,
        [req.auth.memberId]
      ) : [];
      res.json({ payments: rows });
    }
  );
  router.post(
    "/payments",
    requireAuth,
    async (req, res) => {
      const {
        memberId,
        subscriptionId,
        amount,
        method,
        status,
        referenceNo,
        notes
      } = req.body;
      const targetMemberId = req.auth.role === "admin" ? memberId : req.auth.memberId;
      if (!targetMemberId || !subscriptionId || !amount || Number(amount) <= 0) {
        res.status(400).json({
          error: "Valid member, subscription, and positive amount are required."
        });
        return;
      }
      const sub = await queryOne(
        "SELECT * FROM subscriptions WHERE id = ? AND member_id = ?",
        [subscriptionId, targetMemberId]
      );
      if (!sub) {
        res.status(404).json({ error: "Subscription record not found for member." });
        return;
      }
      const ts = nowIso();
      const payId = `pay_${import_node_crypto4.default.randomUUID().slice(0, 12)}`;
      const effStatus = req.auth.role === "admin" && (status === "confirmed" || status === "unpaid") ? status : "pending_approval";
      await execute(
        `INSERT INTO payments (id, member_id, subscription_id, amount, method, status, reference_no, notes, approved_by_user_id, paid_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payId,
          targetMemberId,
          subscriptionId,
          Number(amount),
          method || "cash",
          effStatus,
          (referenceNo || "").trim(),
          (notes || "").trim(),
          effStatus === "confirmed" ? req.auth.userId : null,
          effStatus === "confirmed" ? ts : null,
          ts
        ]
      );
      if (effStatus === "confirmed") {
        const today = todayDateStr();
        const nextStatus = sub.expiry_date < today ? "expired" : "active";
        await execute(
          `UPDATE subscriptions SET payment_status = 'paid', status = ?, approved_by_user_id = ?, updated_at = ? WHERE id = ?`,
          [nextStatus, req.auth.userId, ts, sub.id]
        );
        if (nextStatus === "active") {
          await execute(
            `UPDATE members SET status = 'active', updated_at = ? WHERE id = ?`,
            [ts, targetMemberId]
          );
        }
      }
      res.status(201).json({ id: payId, status: effStatus });
    }
  );
  router.post(
    "/payments/:id/confirm",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const payment = await queryOne(
        "SELECT * FROM payments WHERE id = ?",
        [req.params.id]
      );
      if (!payment) {
        res.status(404).json({ error: "Payment not found." });
        return;
      }
      const sub = await queryOne(
        "SELECT * FROM subscriptions WHERE id = ?",
        [payment.subscription_id]
      );
      if (!sub) {
        res.status(404).json({ error: "Linked subscription not found." });
        return;
      }
      const ts = nowIso();
      const today = todayDateStr();
      const startDate = sub.status === "pending_approval" && sub.start_date < today ? today : sub.start_date;
      const expiryDate = sub.status === "pending_approval" ? calculateExpiryDate(startDate, sub.duration) : sub.expiry_date;
      const subStatus = expiryDate < today ? "expired" : "active";
      await execute(
        `UPDATE payments SET status = 'confirmed', approved_by_user_id = ?, paid_at = ? WHERE id = ?`,
        [req.auth.userId, ts, payment.id]
      );
      await execute(
        `UPDATE subscriptions SET start_date = ?, expiry_date = ?, payment_status = 'paid', status = ?, approved_by_user_id = ?, updated_at = ? WHERE id = ?`,
        [startDate, expiryDate, subStatus, req.auth.userId, ts, sub.id]
      );
      await execute(
        `UPDATE members SET status = ?, updated_at = ? WHERE id = ? AND status != 'suspended'`,
        [subStatus === "active" ? "active" : "expired", ts, payment.member_id]
      );
      res.json({ ok: true });
    }
  );
  router.post(
    "/payments/:id/reject",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const payment = await queryOne(
        "SELECT * FROM payments WHERE id = ?",
        [req.params.id]
      );
      if (!payment) {
        res.status(404).json({ error: "Payment not found." });
        return;
      }
      const ts = nowIso();
      await execute(
        `UPDATE payments SET status = 'rejected', approved_by_user_id = ? WHERE id = ?`,
        [req.auth.userId, payment.id]
      );
      await execute(
        `UPDATE subscriptions SET payment_status = 'unpaid', status = 'cancelled', updated_at = ? WHERE id = ?`,
        [ts, payment.subscription_id]
      );
      res.json({ ok: true });
    }
  );
  router.get(
    "/attendance",
    requireAuth,
    async (req, res) => {
      const rows = req.auth.role === "admin" ? await query(
        `SELECT a.*, m.full_name as member_name, m.member_code, m.phone, s.package_name, s.expiry_date
             FROM attendance a
             JOIN members m ON a.member_id = m.id
             LEFT JOIN subscriptions s ON a.subscription_id = s.id
             ORDER BY a.scanned_at DESC
             LIMIT 300`
      ) : req.auth.memberId ? await query(
        `SELECT a.*, m.full_name as member_name, m.member_code, s.package_name, s.expiry_date
               FROM attendance a
               JOIN members m ON a.member_id = m.id
               LEFT JOIN subscriptions s ON a.subscription_id = s.id
               WHERE a.member_id = ?
               ORDER BY a.scanned_at DESC
               LIMIT 100`,
        [req.auth.memberId]
      ) : [];
      res.json({ attendance: rows });
    }
  );
  router.get(
    "/analytics/dashboard",
    requireAuth,
    requireAdmin,
    async (_req, res) => {
      await syncExpiredSubscriptions();
      const today = todayDateStr();
      const currentMonthPrefix = today.slice(0, 7);
      const members = await query(
        "SELECT * FROM members ORDER BY created_at DESC"
      );
      const subscriptions = await query(
        "SELECT * FROM subscriptions ORDER BY created_at DESC"
      );
      const payments = await query(
        "SELECT * FROM payments ORDER BY created_at DESC"
      );
      const attendance = await query(
        "SELECT id, scanned_at, verification_result FROM attendance ORDER BY scanned_at DESC LIMIT 1000"
      );
      const activeMembers = members.filter((m) => m.status === "active").length;
      const expiredMembers = members.filter(
        (m) => m.status === "expired"
      ).length;
      const suspendedMembers = members.filter(
        (m) => m.status === "suspended"
      ).length;
      const pendingMembers = members.filter(
        (m) => m.status === "pending"
      ).length;
      const activeSubscriptions = subscriptions.filter(
        (s) => s.status === "active"
      ).length;
      const expiredSubscriptions = subscriptions.filter(
        (s) => s.status === "expired"
      ).length;
      const pendingApprovals = payments.filter(
        (p) => p.status === "pending_approval"
      ).length;
      const confirmedPayments = payments.filter(
        (p) => p.status === "confirmed"
      );
      const totalRevenue = confirmedPayments.reduce(
        (acc, p) => acc + Number(p.amount),
        0
      );
      const monthRevenue = confirmedPayments.filter(
        (p) => (p.paid_at || p.created_at).startsWith(currentMonthPrefix)
      ).reduce((acc, p) => acc + Number(p.amount), 0);
      const unpaidAmount = payments.filter((p) => p.status === "unpaid" || p.status === "pending_approval").reduce((acc, p) => acc + Number(p.amount), 0);
      const todayAttendance = attendance.filter(
        (a) => a.scanned_at.startsWith(today)
      );
      const todayValidCheckins = todayAttendance.filter(
        (a) => a.verification_result === "valid"
      ).length;
      const memberMap = new Map(members.map((m) => [m.id, m]));
      const upcomingExpirations = subscriptions.filter(
        (s) => s.status === "active" && daysUntilDate(s.expiry_date) >= 0 && daysUntilDate(s.expiry_date) <= 14
      ).map((s) => {
        const mem = memberMap.get(s.member_id);
        return {
          subscriptionId: s.id,
          memberId: s.member_id,
          memberName: mem?.full_name ?? "Unknown",
          memberCode: mem?.member_code ?? "",
          phone: mem?.phone ?? "",
          packageName: s.package_name,
          expiryDate: s.expiry_date,
          daysRemaining: daysUntilDate(s.expiry_date)
        };
      }).sort((a, b) => a.daysRemaining - b.daysRemaining);
      const attendanceSeries = [];
      for (let i = 13; i >= 0; i -= 1) {
        const d = /* @__PURE__ */ new Date();
        d.setUTCDate(d.getUTCDate() - i);
        const dayStr = d.toISOString().slice(0, 10);
        const dayRows = attendance.filter(
          (a) => a.scanned_at.startsWith(dayStr)
        );
        attendanceSeries.push({
          date: dayStr,
          valid: dayRows.filter((a) => a.verification_result === "valid").length,
          denied: dayRows.filter((a) => a.verification_result !== "valid").length
        });
      }
      const revenueSeries = [];
      for (let i = 5; i >= 0; i -= 1) {
        const d = /* @__PURE__ */ new Date();
        d.setUTCMonth(d.getUTCMonth() - i);
        const monthPrefix = d.toISOString().slice(0, 7);
        const sum = confirmedPayments.filter((p) => (p.paid_at || p.created_at).startsWith(monthPrefix)).reduce((acc, p) => acc + Number(p.amount), 0);
        revenueSeries.push({ month: monthPrefix, amount: sum });
      }
      const packageCounts = /* @__PURE__ */ new Map();
      for (const sub of subscriptions.filter((s) => s.status === "active")) {
        packageCounts.set(
          sub.package_name,
          (packageCounts.get(sub.package_name) ?? 0) + 1
        );
      }
      res.json({
        stats: {
          totalMembers: members.length,
          activeMembers,
          expiredMembers,
          suspendedMembers,
          pendingMembers,
          activeSubscriptions,
          expiredSubscriptions,
          pendingApprovals,
          totalRevenue,
          monthRevenue,
          unpaidAmount,
          todayCheckins: todayAttendance.length,
          todayValidCheckins
        },
        recentRegistrations: members.slice(0, 8).map((m) => ({
          id: m.id,
          memberCode: m.member_code,
          fullName: m.full_name,
          phone: m.phone,
          age: Number(m.age),
          status: m.status,
          createdAt: m.created_at
        })),
        upcomingExpirations,
        attendanceSeries,
        revenueSeries,
        packageBreakdown: Array.from(packageCounts.entries()).map(
          ([name, count]) => ({ name, count })
        )
      });
    }
  );
  registerBiometricRoutes(router);
  return router;
}

// server/vercel-entry.ts
var cachedApp = null;
var initPromise = null;
function getApp() {
  if (!cachedApp) {
    const app = (0, import_express2.default)();
    app.set("trust proxy", 1);
    app.use(import_express2.default.json({ limit: "2mb" }));
    app.use("/api", createApiRouter());
    app.use(
      (err, _req, res, _next) => {
        console.error("Express error:", err);
        if (!res.headersSent) {
          res.status(500).json({
            error: err instanceof Error ? err.message : "Internal server error"
          });
        }
      }
    );
    cachedApp = app;
  }
  return cachedApp;
}
async function handler(req, res) {
  try {
    if (!initPromise) {
      initPromise = initDatabase().catch((err) => {
        initPromise = null;
        throw err;
      });
    }
    await initPromise;
    const app = getApp();
    await new Promise((resolve) => {
      res.on("finish", resolve);
      res.on("close", resolve);
      app(req, res);
    });
  } catch (err) {
    console.error("Vercel API error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Database initialization failed"
      });
    }
  }
}
if (module.exports && module.exports.default) { module.exports = module.exports.default; }
