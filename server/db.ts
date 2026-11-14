import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type BetterSqlite3 from "better-sqlite3";
import { Pool } from "pg";
import { nowIso } from "./dates.ts";

export type DbEngine = "postgres" | "sqlite";

const globalStore = globalThis as typeof globalThis & {
  __apexpulsePgPool?: Pool;
  __apexpulseSqliteDb?: BetterSqlite3.Database;
  __apexpulseDbInitialized?: boolean;
};

let activeEngine: DbEngine = "postgres";

function convertPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

export function getDbEngine(): DbEngine {
  return activeEngine;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (activeEngine === "postgres") {
    const pool = globalStore.__apexpulsePgPool;
    if (!pool) throw new Error("PostgreSQL pool not initialized");
    const result = await pool.query(convertPlaceholders(sql), params);
    return result.rows as T[];
  }
  const sqliteDb = globalStore.__apexpulseSqliteDb;
  if (!sqliteDb) throw new Error("SQLite database not initialized");
  return sqliteDb.prepare(sql).all(...params) as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(
  sql: string,
  params: unknown[] = [],
): Promise<void> {
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

const SCHEMA_STATEMENTS = [
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
  )`,
];

async function seedInitialCatalog(): Promise<void> {
  const existingServices = await query<{ id: string }>(
    "SELECT id FROM services LIMIT 1",
  );
  if (existingServices.length > 0) return;

  const ts = nowIso();
  const baseServices = [
    {
      id: "svc_gym",
      name: "Gym",
      description:
        "Full access to strength training, free weights, and resistance machines.",
    },
    {
      id: "svc_cardio",
      name: "Cardio",
      description:
        "Treadmills, ellipticals, stair climbers, rowing, and cycling zones.",
    },
    {
      id: "svc_steam",
      name: "Steam Room",
      description: "Aromatic eucalyptus steam recovery suite.",
    },
    {
      id: "svc_sauna",
      name: "Sauna",
      description: "Dry Finnish cedarwood heat recovery room.",
    },
    {
      id: "svc_pt",
      name: "Personal Training",
      description:
        "Dedicated one-on-one certified coaching sessions and programming.",
    },
  ];

  for (const svc of baseServices) {
    await execute(
      "INSERT INTO services (id, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?) ON CONFLICT DO NOTHING",
      [svc.id, svc.name, svc.description, ts, ts],
    );
  }

  const basePackages = [
    {
      id: "pkg_gym_only",
      name: "Gym Only",
      category: "gym_only",
      description:
        "Core strength floor, Olympic lifting platforms, and weight machines.",
      is_deal: 0,
      serviceIds: ["svc_gym"],
      prices: { "1m": 45, "3m": 120, "6m": 220, "1y": 400 },
    },
    {
      id: "pkg_cardio_only",
      name: "Cardio Only",
      category: "cardio_only",
      description:
        "Unlimited cardio theater, endurance ergs, and heart-rate conditioning zone.",
      is_deal: 0,
      serviceIds: ["svc_cardio"],
      prices: { "1m": 35, "3m": 95, "6m": 175, "1y": 320 },
    },
    {
      id: "pkg_gym_cardio",
      name: "Gym + Cardio",
      category: "gym_cardio",
      description:
        "Complete access to both strength training equipment and the cardio theater.",
      is_deal: 0,
      serviceIds: ["svc_gym", "svc_cardio"],
      prices: { "1m": 65, "3m": 175, "6m": 320, "1y": 580 },
    },
  ];

  for (const pkg of basePackages) {
    await execute(
      "INSERT INTO packages (id, name, category, description, is_deal, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?) ON CONFLICT DO NOTHING",
      [pkg.id, pkg.name, pkg.category, pkg.description, pkg.is_deal, ts, ts],
    );
    for (const serviceId of pkg.serviceIds) {
      await execute(
        "INSERT INTO package_services (package_id, service_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
        [pkg.id, serviceId],
      );
    }
    for (const [duration, price] of Object.entries(pkg.prices)) {
      await execute(
        "INSERT INTO package_prices (id, package_id, duration, price) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
        [`pp_${crypto.randomUUID().slice(0, 8)}`, pkg.id, duration, price],
      );
    }
  }
}

export async function initDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    activeEngine = "postgres";
    if (!globalStore.__apexpulsePgPool) {
      const isLocal =
        databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
      globalStore.__apexpulsePgPool = new Pool({
        connectionString: databaseUrl,
        max: 5,
        idleTimeoutMillis: 30000,
        ssl: isLocal ? false : { rejectUnauthorized: false },
      });
    }
    await globalStore.__apexpulsePgPool.query("SELECT 1");
  } else {
    if (process.env.VERCEL) {
      throw new Error(
        "DATABASE_URL environment variable is required on Vercel. Connect a Cloud PostgreSQL database (Neon, Supabase, or Vercel Postgres).",
      );
    }

    activeEngine = "sqlite";
    if (!globalStore.__apexpulseSqliteDb) {
      const { default: Database } = await import("better-sqlite3");
      const dataDir = path.resolve(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = path.join(dataDir, "gym.db");
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
