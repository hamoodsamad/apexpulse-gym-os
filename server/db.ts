import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
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

function offsetDateStr(daysDelta: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysDelta);
  return d.toISOString().slice(0, 10);
}

function offsetMonthIso(monthsBack: number, day = 12): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - monthsBack);
  d.setUTCDate(day);
  return d.toISOString();
}

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
    {
      id: "pkg_executive_deal",
      name: "Executive Recovery Bundle",
      category: "custom_deal",
      description:
        "All-access Gym, Cardio, Finnish Sauna, and Eucalyptus Steam Recovery Suite.",
      is_deal: 1,
      serviceIds: ["svc_gym", "svc_cardio", "svc_steam", "svc_sauna"],
      prices: { "1m": 95, "3m": 255, "6m": 470, "1y": 850 },
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

async function seedPortfolioDemoData(): Promise<void> {
  const ts = nowIso();

  // Ensure a demo admin exists if no admin is created yet
  const existingAdmin = await queryOne<{ id: string }>(
    `SELECT id FROM users WHERE role = 'admin' LIMIT 1`,
  );
  let adminId = existingAdmin?.id;
  if (!adminId) {
    adminId = "usr_demo_admin";
    const hash = await bcrypt.hash("DemoAdmin123!", 10);
    await execute(
      "INSERT INTO users (id, email, password_hash, role, full_name, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING",
      [
        adminId,
        "admin@apexpulse.gym",
        hash,
        "admin",
        "Hamood Admin (Demo)",
        ts,
      ],
    );
  }

  // Only seed sample members/transactions if members table is completely empty
  const existingMember = await queryOne<{ id: string }>(
    "SELECT id FROM members LIMIT 1",
  );
  if (existingMember) return;

  // Ensure Executive Recovery Bundle exists even on upgraded DBs
  const dealPkg = await queryOne<{ id: string }>(
    "SELECT id FROM packages WHERE id = ?",
    ["pkg_executive_deal"],
  );
  if (!dealPkg) {
    await execute(
      "INSERT INTO packages (id, name, category, description, is_deal, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 1, ?, ?) ON CONFLICT DO NOTHING",
      [
        "pkg_executive_deal",
        "Executive Recovery Bundle",
        "custom_deal",
        "All-access Gym, Cardio, Finnish Sauna, and Eucalyptus Steam Recovery Suite.",
        ts,
        ts,
      ],
    );
    for (const sid of ["svc_gym", "svc_cardio", "svc_steam", "svc_sauna"]) {
      await execute(
        "INSERT INTO package_services (package_id, service_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
        ["pkg_executive_deal", sid],
      );
    }
    for (const [dur, price] of Object.entries({
      "1m": 95,
      "3m": 255,
      "6m": 470,
      "1y": 850,
    })) {
      await execute(
        "INSERT INTO package_prices (id, package_id, duration, price) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
        [`pp_exec_${dur}`, "pkg_executive_deal", dur, price],
      );
    }
  }

  const demoMemberUserHash = await bcrypt.hash("DemoMember123!", 10);
  await execute(
    "INSERT INTO users (id, email, password_hash, role, full_name, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING",
    [
      "usr_demo_member",
      "alex.rivera@member.gym",
      demoMemberUserHash,
      "member",
      "Alex Rivera",
      ts,
    ],
  );

  const demoMembers = [
    {
      id: "mem_demo_01",
      userId: "usr_demo_member",
      code: "MEM-1001",
      name: "Alex Rivera",
      email: "alex.rivera@member.gym",
      phone: "+1 555-0142",
      age: 27,
      status: "active",
      pkgId: "pkg_gym_cardio",
      pkgName: "Gym + Cardio",
      dur: "3m",
      amount: 175,
      start: offsetDateStr(-40),
      expiry: offsetDateStr(50),
      subStatus: "active",
      payStatus: "paid",
      payRecordStatus: "confirmed",
      method: "card",
      paidAt: offsetMonthIso(1, 14),
    },
    {
      id: "mem_demo_02",
      userId: null,
      code: "MEM-1002",
      name: "Sara Khan",
      email: "sara.khan@member.gym",
      phone: "+1 555-0188",
      age: 25,
      status: "active",
      pkgId: "pkg_executive_deal",
      pkgName: "Executive Recovery Bundle",
      dur: "6m",
      amount: 470,
      start: offsetDateStr(-176),
      expiry: offsetDateStr(4),
      subStatus: "active",
      payStatus: "paid",
      payRecordStatus: "confirmed",
      method: "transfer",
      paidAt: offsetMonthIso(5, 10),
    },
    {
      id: "mem_demo_03",
      userId: null,
      code: "MEM-1003",
      name: "Marcus Chen",
      email: "marcus.chen@member.gym",
      phone: "+1 555-0194",
      age: 31,
      status: "active",
      pkgId: "pkg_gym_only",
      pkgName: "Gym Only",
      dur: "1y",
      amount: 400,
      start: offsetDateStr(-120),
      expiry: offsetDateStr(245),
      subStatus: "active",
      payStatus: "paid",
      payRecordStatus: "confirmed",
      method: "online",
      paidAt: offsetMonthIso(4, 18),
    },
    {
      id: "mem_demo_04",
      userId: null,
      code: "MEM-1004",
      name: "Ayesha Tariq",
      email: "ayesha.tariq@member.gym",
      phone: "+1 555-0127",
      age: 23,
      status: "active",
      pkgId: "pkg_cardio_only",
      pkgName: "Cardio Only",
      dur: "1m",
      amount: 35,
      start: offsetDateStr(-22),
      expiry: offsetDateStr(8),
      subStatus: "active",
      payStatus: "paid",
      payRecordStatus: "confirmed",
      method: "cash",
      paidAt: offsetMonthIso(0, 6),
    },
    {
      id: "mem_demo_05",
      userId: null,
      code: "MEM-1005",
      name: "Daniel Brooks",
      email: "daniel.brooks@member.gym",
      phone: "+1 555-0163",
      age: 34,
      status: "active",
      pkgId: "pkg_gym_cardio",
      pkgName: "Gym + Cardio",
      dur: "6m",
      amount: 320,
      start: offsetDateStr(-90),
      expiry: offsetDateStr(90),
      subStatus: "active",
      payStatus: "paid",
      payRecordStatus: "confirmed",
      method: "card",
      paidAt: offsetMonthIso(3, 9),
    },
    {
      id: "mem_demo_06",
      userId: null,
      code: "MEM-1006",
      name: "Zainab Ali",
      email: "zainab.ali@member.gym",
      phone: "+1 555-0175",
      age: 29,
      status: "active",
      pkgId: "pkg_executive_deal",
      pkgName: "Executive Recovery Bundle",
      dur: "3m",
      amount: 255,
      start: offsetDateStr(-78),
      expiry: offsetDateStr(12),
      subStatus: "active",
      payStatus: "paid",
      payRecordStatus: "confirmed",
      method: "transfer",
      paidAt: offsetMonthIso(2, 21),
    },
    {
      id: "mem_demo_07",
      userId: null,
      code: "MEM-1007",
      name: "Omar Farooq",
      email: "omar.farooq@member.gym",
      phone: "+1 555-0119",
      age: 28,
      status: "expired",
      pkgId: "pkg_gym_only",
      pkgName: "Gym Only",
      dur: "1m",
      amount: 45,
      start: offsetDateStr(-42),
      expiry: offsetDateStr(-12),
      subStatus: "expired",
      payStatus: "paid",
      payRecordStatus: "confirmed",
      method: "cash",
      paidAt: offsetMonthIso(1, 20),
    },
    {
      id: "mem_demo_08",
      userId: null,
      code: "MEM-1008",
      name: "Elena Rostova",
      email: "elena.rostova@member.gym",
      phone: "+1 555-0154",
      age: 26,
      status: "expired",
      pkgId: "pkg_gym_cardio",
      pkgName: "Gym + Cardio",
      dur: "3m",
      amount: 175,
      start: offsetDateStr(-105),
      expiry: offsetDateStr(-15),
      subStatus: "expired",
      payStatus: "paid",
      payRecordStatus: "confirmed",
      method: "card",
      paidAt: offsetMonthIso(3, 15),
    },
    {
      id: "mem_demo_09",
      userId: null,
      code: "MEM-1009",
      name: "Bilal Ahmed",
      email: "bilal.ahmed@member.gym",
      phone: "+1 555-0131",
      age: 32,
      status: "suspended",
      pkgId: "pkg_gym_only",
      pkgName: "Gym Only",
      dur: "3m",
      amount: 120,
      start: offsetDateStr(-30),
      expiry: offsetDateStr(60),
      subStatus: "suspended",
      payStatus: "paid",
      payRecordStatus: "confirmed",
      method: "cash",
      paidAt: offsetMonthIso(0, 3),
    },
    {
      id: "mem_demo_10",
      userId: null,
      code: "MEM-1010",
      name: "Maya Patel",
      email: "maya.patel@member.gym",
      phone: "+1 555-0169",
      age: 24,
      status: "pending",
      pkgId: "pkg_executive_deal",
      pkgName: "Executive Recovery Bundle",
      dur: "1m",
      amount: 95,
      start: offsetDateStr(0),
      expiry: offsetDateStr(30),
      subStatus: "pending_approval",
      payStatus: "pending",
      payRecordStatus: "pending_approval",
      method: "transfer",
      paidAt: null,
    },
  ];

  for (let i = 0; i < demoMembers.length; i += 1) {
    const m = demoMembers[i];
    const createdAt = offsetMonthIso(Math.min(i % 5, 4), 10 + i);
    await execute(
      `INSERT INTO members (id, user_id, member_code, full_name, email, phone, age, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
      [
        m.id,
        m.userId,
        m.code,
        m.name,
        m.email,
        m.phone,
        m.age,
        m.status,
        "Demo portfolio profile",
        createdAt,
        ts,
      ],
    );

    const subId = `sub_demo_${i + 1}`;
    await execute(
      `INSERT INTO subscriptions (id, member_id, package_id, package_name, duration, amount, start_date, expiry_date, status, payment_status, approved_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
      [
        subId,
        m.id,
        m.pkgId,
        m.pkgName,
        m.dur,
        m.amount,
        m.start,
        m.expiry,
        m.subStatus,
        m.payStatus,
        m.payRecordStatus === "confirmed" ? adminId : null,
        createdAt,
        ts,
      ],
    );

    const payId = `pay_demo_${i + 1}`;
    await execute(
      `INSERT INTO payments (id, member_id, subscription_id, amount, method, status, reference_no, notes, approved_by_user_id, paid_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
      [
        payId,
        m.id,
        subId,
        m.amount,
        m.method,
        m.payRecordStatus,
        `REF-${2040 + i}`,
        `${m.pkgName} (${m.dur.toUpperCase()})`,
        m.payRecordStatus === "confirmed" ? adminId : null,
        m.paidAt,
        m.paidAt || ts,
      ],
    );
  }

  // Extra current-month confirmed payment for Alex Rivera's prior month so 6-month revenue curve looks full
  await execute(
    `INSERT INTO payments (id, member_id, subscription_id, amount, method, status, reference_no, notes, approved_by_user_id, paid_at, created_at)
     VALUES (?, 'mem_demo_01', 'sub_demo_1', 195, 'card', 'confirmed', 'REF-2099', 'Personal Training Add-On', ?, ?, ?) ON CONFLICT DO NOTHING`,
    ["pay_demo_extra_01", adminId, offsetMonthIso(0, 8), offsetMonthIso(0, 8)],
  );

  // Seed 14 days of realistic biometric check-ins
  const activeDemoIds = [
    "mem_demo_01",
    "mem_demo_02",
    "mem_demo_03",
    "mem_demo_04",
    "mem_demo_05",
    "mem_demo_06",
  ];
  for (let dayBack = 13; dayBack >= 0; dayBack -= 1) {
    const checkinsForDay = 3 + (dayBack % 4);
    for (let c = 0; c < checkinsForDay; c += 1) {
      const mIdx = (dayBack + c) % activeDemoIds.length;
      const memberId = activeDemoIds[mIdx];
      const subNum = mIdx + 1;
      const scanDate = new Date();
      scanDate.setUTCDate(scanDate.getUTCDate() - dayBack);
      scanDate.setUTCHours(7 + c * 2, 15 + c * 7, 0, 0);

      await execute(
        `INSERT INTO attendance (id, member_id, subscription_id, verification_method, verification_result, device_label, scanned_at)
         VALUES (?, ?, ?, 'webauthn', 'valid', ?, ?) ON CONFLICT DO NOTHING`,
        [
          `att_demo_${dayBack}_${c}`,
          memberId,
          `sub_demo_${subNum}`,
          c % 2 === 0 ? "Main Entrance Turnstile" : "Front Desk Sensor",
          scanDate.toISOString(),
        ],
      );
    }

    if (dayBack % 3 === 0) {
      const deniedDate = new Date();
      deniedDate.setUTCDate(deniedDate.getUTCDate() - dayBack);
      deniedDate.setUTCHours(18, 20, 0, 0);
      await execute(
        `INSERT INTO attendance (id, member_id, subscription_id, verification_method, verification_result, device_label, scanned_at)
         VALUES (?, 'mem_demo_07', 'sub_demo_7', 'hardware_sdk', 'expired', 'Main Entrance Turnstile', ?) ON CONFLICT DO NOTHING`,
        [`att_demo_denied_${dayBack}`, deniedDate.toISOString()],
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
    await seedPortfolioDemoData();
    globalStore.__apexpulseDbInitialized = true;
  }
}
