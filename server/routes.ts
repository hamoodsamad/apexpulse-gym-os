import crypto from "node:crypto";
import express, { type Router } from "express";
import { execute, getDbEngine, query, queryOne } from "./db.ts";
import {
  hashPassword,
  requireAdmin,
  requireAuth,
  signAuthToken,
  verifyPassword,
  type AuthenticatedRequest,
} from "./auth.ts";
import {
  calculateExpiryDate,
  daysUntilDate,
  nowIso,
  todayDateStr,
} from "./dates.ts";
import { syncExpiredSubscriptions } from "./syncExpiry.ts";
import { registerBiometricRoutes } from "./biometrics.ts";
import type {
  DbMember,
  DbPackage,
  DbPayment,
  DbService,
  DbSubscription,
  DbUser,
  PackageCategory,
  PaymentMethod,
  PaymentStatus,
  PlanDuration,
} from "./types.ts";

const VALID_DURATIONS: PlanDuration[] = ["1m", "3m", "6m", "1y"];

function isValidDuration(value: string): value is PlanDuration {
  return VALID_DURATIONS.includes(value as PlanDuration);
}

function setAuthCookie(res: express.Response, token: string): void {
  const isSecure = Boolean(
    process.env.VERCEL || process.env.NODE_ENV === "production",
  );
  res.cookie("apexpulse_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  });
}

async function generateNextMemberCode(): Promise<string> {
  const countRow = await queryOne<{ cnt: number | string }>(
    "SELECT COUNT(*) as cnt FROM members",
  );
  let seq = Number(countRow?.cnt ?? 0) + 1001;
  while (true) {
    const candidate = `MEM-${seq}`;
    const exists = await queryOne<{ id: string }>(
      "SELECT id FROM members WHERE member_code = ?",
      [candidate],
    );
    if (!exists) return candidate;
    seq += 1;
  }
}

async function hydratePackages() {
  const packages = await query<DbPackage>(
    "SELECT * FROM packages ORDER BY is_deal ASC, created_at ASC",
  );
  const services = await query<DbService>(
    "SELECT * FROM services ORDER BY name ASC",
  );
  const links = await query<{ package_id: string; service_id: string }>(
    "SELECT package_id, service_id FROM package_services",
  );
  const prices = await query<{
    package_id: string;
    duration: PlanDuration;
    price: number;
  }>("SELECT package_id, duration, price FROM package_prices");

  const serviceMap = new Map(services.map((s) => [s.id, s]));

  return packages.map((pkg) => {
    const pkgServiceIds = links
      .filter((l) => l.package_id === pkg.id)
      .map((l) => l.service_id);
    const pkgServices = pkgServiceIds
      .map((sid) => serviceMap.get(sid))
      .filter((s): s is DbService => Boolean(s));

    const priceMap: Record<PlanDuration, number> = {
      "1m": 0,
      "3m": 0,
      "6m": 0,
      "1y": 0,
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
      updatedAt: pkg.updated_at,
    };
  });
}

export function createApiRouter(): Router {
  const router = express.Router();

  // Health & DB Engine info
  router.get("/health", async (_req, res) => {
    res.json({ status: "ok", dbEngine: getDbEngine(), timestamp: nowIso() });
  });

  // Lightweight Cloud DB change-detection stamp for multi-device live sync on Vercel
  router.get(
    "/sync/stamp",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      const [mRow, sRow, pRow, pkgRow, svcRow, attRow, bioRow] =
        await Promise.all([
          queryOne<{ v: string | null; c: number | string }>(
            "SELECT MAX(updated_at) as v, COUNT(*) as c FROM members",
          ),
          queryOne<{ v: string | null; c: number | string }>(
            "SELECT MAX(updated_at) as v, COUNT(*) as c FROM subscriptions",
          ),
          queryOne<{ v: string | null; c: number | string }>(
            "SELECT MAX(created_at) as v, COUNT(*) as c FROM payments",
          ),
          queryOne<{ v: string | null; c: number | string }>(
            "SELECT MAX(updated_at) as v, COUNT(*) as c FROM packages",
          ),
          queryOne<{ v: string | null; c: number | string }>(
            "SELECT MAX(updated_at) as v, COUNT(*) as c FROM services",
          ),
          queryOne<{ v: string | null; c: number | string }>(
            "SELECT MAX(scanned_at) as v, COUNT(*) as c FROM attendance",
          ),
          queryOne<{ v: string | null; c: number | string }>(
            "SELECT MAX(created_at) as v, COUNT(*) as c FROM biometric_credentials",
          ),
        ]);

      const stamp = {
        members: `${mRow?.v ?? ""}:${Number(mRow?.c ?? 0)}`,
        subscriptions: `${sRow?.v ?? ""}:${Number(sRow?.c ?? 0)}`,
        payments: `${pRow?.v ?? ""}:${Number(pRow?.c ?? 0)}`,
        packages: `${pkgRow?.v ?? ""}:${Number(pkgRow?.c ?? 0)}`,
        services: `${svcRow?.v ?? ""}:${Number(svcRow?.c ?? 0)}`,
        attendance: `${attRow?.v ?? ""}:${Number(attRow?.c ?? 0)}`,
        biometrics: `${bioRow?.v ?? ""}:${Number(bioRow?.c ?? 0)}`,
        role: req.auth?.role,
      };

      res.json({ stamp });
    },
  );

  // Auth status (checks whether initial Admin exists)
  router.get("/auth/status", async (_req, res) => {
    const adminRow = await queryOne<{ cnt: number | string }>(
      `SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'`,
    );
    res.json({
      hasAdmin: Number(adminRow?.cnt ?? 0) > 0,
      dbEngine: getDbEngine(),
    });
  });

  // One-time Admin bootstrap when zero admins exist in the database
  router.post("/auth/setup-admin", async (req, res) => {
    const adminCount = await queryOne<{ cnt: number | string }>(
      `SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'`,
    );
    if (Number(adminCount?.cnt ?? 0) > 0) {
      res.status(403).json({
        error: "Facility administrator already initialized. Please sign in.",
      });
      return;
    }

    const { fullName, email, password } = req.body as {
      fullName?: string;
      email?: string;
      password?: string;
    };

    if (
      !fullName?.trim() ||
      !email?.trim() ||
      !password ||
      password.length < 8
    ) {
      res.status(400).json({
        error:
          "Full name, valid email, and password (min 8 chars) are required.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail],
    );
    if (existingUser) {
      res
        .status(409)
        .json({ error: "An account with this email already exists." });
      return;
    }

    const userId = `usr_${crypto.randomUUID().slice(0, 12)}`;
    const passwordHash = await hashPassword(password);
    await execute(
      "INSERT INTO users (id, email, password_hash, role, full_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [
        userId,
        normalizedEmail,
        passwordHash,
        "admin",
        fullName.trim(),
        nowIso(),
      ],
    );

    const payload = {
      userId,
      email: normalizedEmail,
      role: "admin" as const,
      fullName: fullName.trim(),
      memberId: null,
    };
    const token = signAuthToken(payload);
    setAuthCookie(res, token);
    res.status(201).json({ token, user: payload });
  });

  // Login (Admin & Member)
  router.post("/auth/login", async (req, res) => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };
    if (!email?.trim() || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await queryOne<DbUser>("SELECT * FROM users WHERE email = ?", [
      normalizedEmail,
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

    const memberRow = await queryOne<{ id: string }>(
      "SELECT id FROM members WHERE user_id = ? OR email = ?",
      [user.id, user.email],
    );

    if (memberRow) {
      await execute(
        "UPDATE members SET user_id = ? WHERE id = ? AND user_id IS NULL",
        [user.id, memberRow.id],
      );
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      memberId: memberRow?.id ?? null,
    };
    const token = signAuthToken(payload);
    setAuthCookie(res, token);
    res.json({ token, user: payload });
  });

  // Member Self-Registration
  router.post("/auth/register", async (req, res) => {
    const { fullName, email, phone, age, password } = req.body as {
      fullName?: string;
      email?: string;
      phone?: string;
      age?: number;
      password?: string;
    };

    if (
      !fullName?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !age ||
      !password ||
      password.length < 8
    ) {
      res.status(400).json({
        error:
          "Full name, email, phone, age, and password (min 8 chars) are required.",
      });
      return;
    }

    const parsedAge = Number(age);
    if (!Number.isInteger(parsedAge) || parsedAge < 12 || parsedAge > 110) {
      res
        .status(400)
        .json({ error: "Age must be an integer between 12 and 110." });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await queryOne<DbUser>(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail],
    );
    if (existingUser) {
      res
        .status(409)
        .json({ error: "An account with this email is already registered." });
      return;
    }

    const ts = nowIso();
    const userId = `usr_${crypto.randomUUID().slice(0, 12)}`;
    const passwordHash = await hashPassword(password);

    await execute(
      "INSERT INTO users (id, email, password_hash, role, full_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, normalizedEmail, passwordHash, "member", fullName.trim(), ts],
    );

    const member = await queryOne<DbMember>(
      "SELECT * FROM members WHERE email = ?",
      [normalizedEmail],
    );
    let memberId: string;

    if (member) {
      memberId = member.id;
      await execute(
        "UPDATE members SET user_id = ?, updated_at = ? WHERE id = ?",
        [userId, ts, memberId],
      );
    } else {
      memberId = `mem_${crypto.randomUUID().slice(0, 12)}`;
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
          ts,
        ],
      );
    }

    const payload = {
      userId,
      email: normalizedEmail,
      role: "member" as const,
      fullName: fullName.trim(),
      memberId,
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
    async (req: AuthenticatedRequest, res) => {
      res.json({ user: req.auth });
    },
  );

  // Services CRUD
  router.get("/services", requireAuth, async (_req, res) => {
    const rows = await query<DbService>(
      "SELECT * FROM services ORDER BY name ASC",
    );
    res.json({
      services: rows.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        isActive: Boolean(s.is_active),
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),
    });
  });
  // Instant Portfolio Demo Access (Admin View or Member View)
  router.post("/auth/demo", async (req, res) => {
    const { role } = (req.body || {}) as { role?: "admin" | "member" };
    const targetRole = role === "member" ? "member" : "admin";

    if (targetRole === "admin") {
      let adminUser = await queryOne<DbUser>(
        `SELECT * FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1`,
      );
      if (!adminUser) {
        const userId = `usr_${crypto.randomUUID().slice(0, 12)}`;
        const passwordHash = await hashPassword("DemoAdmin123!");
        await execute(
          "INSERT INTO users (id, email, password_hash, role, full_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [
            userId,
            "admin@apexpulse.gym",
            passwordHash,
            "admin",
            "Facility Administrator (Demo)",
            nowIso(),
          ],
        );
        adminUser = await queryOne<DbUser>("SELECT * FROM users WHERE id = ?", [
          userId,
        ]);
      }

      if (!adminUser) {
        res
          .status(500)
          .json({ error: "Unable to initialize demo administrator session." });
        return;
      }

      const payload = {
        userId: adminUser.id,
        email: adminUser.email,
        role: "admin" as const,
        fullName: adminUser.full_name,
        memberId: null,
      };
      const token = signAuthToken(payload);
      setAuthCookie(res, token);
      res.json({ token, user: payload });
      return;
    }

    // Member Demo View
    let memberUser = await queryOne<DbUser>(
      `SELECT * FROM users WHERE role = 'member' ORDER BY created_at ASC LIMIT 1`,
    );
    let linkedMember = memberUser
      ? await queryOne<DbMember>(
          "SELECT * FROM members WHERE user_id = ? OR email = ?",
          [memberUser.id, memberUser.email],
        )
      : null;

    if (!memberUser || !linkedMember) {
      const anyMember = await queryOne<DbMember>(
        "SELECT * FROM members ORDER BY created_at ASC LIMIT 1",
      );
      if (anyMember) {
        if (!memberUser) {
          const userId = `usr_${crypto.randomUUID().slice(0, 12)}`;
          const hash = await hashPassword("DemoMember123!");
          await execute(
            "INSERT INTO users (id, email, password_hash, role, full_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            [
              userId,
              anyMember.email,
              hash,
              "member",
              anyMember.full_name,
              nowIso(),
            ],
          );
          memberUser = await queryOne<DbUser>(
            "SELECT * FROM users WHERE id = ?",
            [userId],
          );
        }
        if (memberUser && !anyMember.user_id) {
          await execute("UPDATE members SET user_id = ? WHERE id = ?", [
            memberUser.id,
            anyMember.id,
          ]);
        }
        linkedMember = anyMember;
      }
    }

    if (!memberUser || !linkedMember) {
      res.status(404).json({ error: "No demo member profile available yet." });
      return;
    }

    const payload = {
      userId: memberUser.id,
      email: memberUser.email,
      role: "member" as const,
      fullName: memberUser.full_name,
      memberId: linkedMember.id,
    };
    const token = signAuthToken(payload);
    setAuthCookie(res, token);
    res.json({ token, user: payload });
  });

  router.post("/services", requireAuth, requireAdmin, async (req, res) => {
    const { name, description } = req.body as {
      name?: string;
      description?: string;
    };
    if (!name?.trim()) {
      res.status(400).json({ error: "Service name is required." });
      return;
    }
    const existing = await queryOne<DbService>(
      "SELECT id FROM services WHERE LOWER(name) = LOWER(?)",
      [name.trim()],
    );
    if (existing) {
      res
        .status(409)
        .json({ error: "A service with this name already exists." });
      return;
    }
    const id = `svc_${crypto.randomUUID().slice(0, 10)}`;
    const ts = nowIso();
    await execute(
      "INSERT INTO services (id, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
      [id, name.trim(), (description || "").trim(), ts, ts],
    );
    res.status(201).json({
      id,
      name: name.trim(),
      description: (description || "").trim(),
      isActive: true,
    });
  });

  router.put("/services/:id", requireAuth, requireAdmin, async (req, res) => {
    const { name, description, isActive } = req.body as {
      name?: string;
      description?: string;
      isActive?: boolean;
    };
    const existing = await queryOne<DbService>(
      "SELECT * FROM services WHERE id = ?",
      [req.params.id],
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
        description !== undefined ? description.trim() : existing.description,
        isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active,
        ts,
        existing.id,
      ],
    );
    res.json({ ok: true });
  });

  router.delete(
    "/services/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const existing = await queryOne<DbService>(
        "SELECT * FROM services WHERE id = ?",
        [req.params.id],
      );
      if (!existing) {
        res.status(404).json({ error: "Service not found." });
        return;
      }
      await execute("DELETE FROM services WHERE id = ?", [existing.id]);
      res.json({ ok: true });
    },
  );

  // Packages & Deals CRUD
  router.get("/packages", requireAuth, async (_req, res) => {
    const packages = await hydratePackages();
    res.json({ packages });
  });

  router.post("/packages", requireAuth, requireAdmin, async (req, res) => {
    const { name, category, description, isDeal, serviceIds, prices } =
      req.body as {
        name?: string;
        category?: PackageCategory;
        description?: string;
        isDeal?: boolean;
        serviceIds?: string[];
        prices?: Partial<Record<PlanDuration, number>>;
      };

    if (
      !name?.trim() ||
      !Array.isArray(serviceIds) ||
      serviceIds.length === 0 ||
      !prices
    ) {
      res.status(400).json({
        error:
          "Package name, at least one service, and duration prices are required.",
      });
      return;
    }

    for (const dur of VALID_DURATIONS) {
      const val = Number(prices[dur]);
      if (Number.isNaN(val) || val < 0) {
        res.status(400).json({
          error: `Valid non-negative price required for duration ${dur}.`,
        });
        return;
      }
    }

    const pkgCategory: PackageCategory =
      category &&
      ["gym_only", "cardio_only", "gym_cardio", "custom_deal"].includes(
        category,
      )
        ? category
        : "custom_deal";

    const pkgId = `pkg_${crypto.randomUUID().slice(0, 10)}`;
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
        ts,
      ],
    );

    for (const sid of serviceIds) {
      const svc = await queryOne<{ id: string }>(
        "SELECT id FROM services WHERE id = ?",
        [sid],
      );
      if (svc) {
        await execute(
          "INSERT INTO package_services (package_id, service_id) VALUES (?, ?)",
          [pkgId, sid],
        );
      }
    }

    for (const dur of VALID_DURATIONS) {
      await execute(
        "INSERT INTO package_prices (id, package_id, duration, price) VALUES (?, ?, ?, ?)",
        [
          `pp_${crypto.randomUUID().slice(0, 8)}`,
          pkgId,
          dur,
          Number(prices[dur]),
        ],
      );
    }

    const all = await hydratePackages();
    res.status(201).json({ package: all.find((p) => p.id === pkgId) });
  });

  router.put("/packages/:id", requireAuth, requireAdmin, async (req, res) => {
    const existing = await queryOne<DbPackage>(
      "SELECT * FROM packages WHERE id = ?",
      [req.params.id],
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
      prices,
    } = req.body as {
      name?: string;
      category?: PackageCategory;
      description?: string;
      isDeal?: boolean;
      isActive?: boolean;
      serviceIds?: string[];
      prices?: Partial<Record<PlanDuration, number>>;
    };

    const ts = nowIso();
    await execute(
      "UPDATE packages SET name = ?, category = ?, description = ?, is_deal = ?, is_active = ?, updated_at = ? WHERE id = ?",
      [
        name?.trim() || existing.name,
        category &&
        ["gym_only", "cardio_only", "gym_cardio", "custom_deal"].includes(
          category,
        )
          ? category
          : existing.category,
        description !== undefined ? description.trim() : existing.description,
        isDeal !== undefined ? (isDeal ? 1 : 0) : existing.is_deal,
        isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active,
        ts,
        existing.id,
      ],
    );

    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      await execute("DELETE FROM package_services WHERE package_id = ?", [
        existing.id,
      ]);
      for (const sid of serviceIds) {
        const svc = await queryOne<{ id: string }>(
          "SELECT id FROM services WHERE id = ?",
          [sid],
        );
        if (svc) {
          await execute(
            "INSERT INTO package_services (package_id, service_id) VALUES (?, ?)",
            [existing.id, sid],
          );
        }
      }
    }

    if (prices) {
      for (const dur of VALID_DURATIONS) {
        if (prices[dur] !== undefined) {
          const val = Number(prices[dur]);
          if (Number.isNaN(val) || val < 0) {
            res.status(400).json({ error: `Invalid price for ${dur}` });
            return;
          }
          const existingPrice = await queryOne<{ id: string }>(
            "SELECT id FROM package_prices WHERE package_id = ? AND duration = ?",
            [existing.id, dur],
          );
          if (existingPrice) {
            await execute("UPDATE package_prices SET price = ? WHERE id = ?", [
              val,
              existingPrice.id,
            ]);
          } else {
            await execute(
              "INSERT INTO package_prices (id, package_id, duration, price) VALUES (?, ?, ?, ?)",
              [`pp_${crypto.randomUUID().slice(0, 8)}`, existing.id, dur, val],
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
      const existing = await queryOne<DbPackage>(
        "SELECT * FROM packages WHERE id = ?",
        [req.params.id],
      );
      if (!existing) {
        res.status(404).json({ error: "Package not found." });
        return;
      }
      const used = await queryOne<{ id: string }>(
        "SELECT id FROM subscriptions WHERE package_id = ? LIMIT 1",
        [existing.id],
      );
      if (used) {
        await execute(
          "UPDATE packages SET is_active = 0, updated_at = ? WHERE id = ?",
          [nowIso(), existing.id],
        );
        res.json({ ok: true, archived: true });
        return;
      }
      await execute("DELETE FROM packages WHERE id = ?", [existing.id]);
      res.json({ ok: true, archived: false });
    },
  );

  // Members CRUD
  router.get(
    "/members",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      await syncExpiredSubscriptions();

      let members: DbMember[];
      if (req.auth!.role === "admin") {
        members = await query<DbMember>(
          "SELECT * FROM members ORDER BY created_at DESC",
        );
      } else if (req.auth!.memberId) {
        members = await query<DbMember>("SELECT * FROM members WHERE id = ?", [
          req.auth!.memberId,
        ]);
      } else {
        members = [];
      }

      const subscriptions = await query<DbSubscription>(
        "SELECT * FROM subscriptions ORDER BY created_at DESC",
      );
      const payments = await query<DbPayment>(
        "SELECT * FROM payments ORDER BY created_at DESC",
      );
      const bioCounts = await query<{
        member_id: string;
        cnt: number | string;
      }>(
        "SELECT member_id, COUNT(*) as cnt FROM biometric_credentials GROUP BY member_id",
      );
      const bioMap = new Map(
        bioCounts.map((b) => [b.member_id, Number(b.cnt)]),
      );

      const enriched = members.map((m) => {
        const memberSubs = subscriptions.filter((s) => s.member_id === m.id);
        const activeOrLatestSub =
          memberSubs.find((s) => s.status === "active") ??
          memberSubs[0] ??
          null;
        const latestPayment = activeOrLatestSub
          ? (payments.find((p) => p.subscription_id === activeOrLatestSub.id) ??
            null)
          : (payments.find((p) => p.member_id === m.id) ?? null);

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
          activeSubscription: activeOrLatestSub
            ? {
                id: activeOrLatestSub.id,
                packageId: activeOrLatestSub.package_id,
                packageName: activeOrLatestSub.package_name,
                duration: activeOrLatestSub.duration,
                amount: Number(activeOrLatestSub.amount),
                startDate: activeOrLatestSub.start_date,
                expiryDate: activeOrLatestSub.expiry_date,
                status: activeOrLatestSub.status,
                paymentStatus: activeOrLatestSub.payment_status,
              }
            : null,
          latestPayment: latestPayment
            ? {
                id: latestPayment.id,
                amount: Number(latestPayment.amount),
                method: latestPayment.method,
                status: latestPayment.status,
                paidAt: latestPayment.paid_at,
              }
            : null,
          createdAt: m.created_at,
          updatedAt: m.updated_at,
        };
      });

      res.json({ members: enriched });
    },
  );

  router.get(
    "/members/:id",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      await syncExpiredSubscriptions();
      const targetId = req.params.id;
      if (req.auth!.role !== "admin" && req.auth!.memberId !== targetId) {
        res
          .status(403)
          .json({ error: "Access denied to this member profile." });
        return;
      }

      const member = await queryOne<DbMember>(
        "SELECT * FROM members WHERE id = ?",
        [targetId],
      );
      if (!member) {
        res.status(404).json({ error: "Member not found." });
        return;
      }

      const subscriptions = await query<DbSubscription>(
        "SELECT * FROM subscriptions WHERE member_id = ? ORDER BY created_at DESC",
        [member.id],
      );
      const payments = await query<DbPayment>(
        "SELECT * FROM payments WHERE member_id = ? ORDER BY created_at DESC",
        [member.id],
      );
      const attendance = await query<Record<string, unknown>>(
        "SELECT * FROM attendance WHERE member_id = ? ORDER BY scanned_at DESC LIMIT 100",
        [member.id],
      );
      const biometrics = await query<Record<string, unknown>>(
        "SELECT id, provider, credential_id, device_label, created_at FROM biometric_credentials WHERE member_id = ? ORDER BY created_at DESC",
        [member.id],
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
          updatedAt: member.updated_at,
        },
        subscriptions,
        payments,
        attendance,
        biometrics,
      });
    },
  );

  router.post(
    "/members",
    requireAuth,
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
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
        referenceNo,
      } = req.body as {
        fullName?: string;
        email?: string;
        phone?: string;
        age?: number;
        notes?: string;
        accountPassword?: string;
        packageId?: string;
        duration?: PlanDuration;
        startDate?: string;
        paymentStatus?: "paid" | "unpaid";
        paymentMethod?: PaymentMethod;
        referenceNo?: string;
      };

      if (!fullName?.trim() || !email?.trim() || !phone?.trim() || !age) {
        res
          .status(400)
          .json({ error: "Full name, email, phone, and age are required." });
        return;
      }

      const parsedAge = Number(age);
      if (!Number.isInteger(parsedAge) || parsedAge < 12 || parsedAge > 110) {
        res.status(400).json({ error: "Age must be between 12 and 110." });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existingMember = await queryOne<DbMember>(
        "SELECT id FROM members WHERE email = ?",
        [normalizedEmail],
      );
      if (existingMember) {
        res.status(409).json({
          error: "A member with this email address is already registered.",
        });
        return;
      }

      const ts = nowIso();
      let userId: string | null = null;

      const existingUser = await queryOne<DbUser>(
        "SELECT id, role FROM users WHERE email = ?",
        [normalizedEmail],
      );
      if (existingUser) {
        userId = existingUser.id;
      } else if (accountPassword && accountPassword.length >= 8) {
        userId = `usr_${crypto.randomUUID().slice(0, 12)}`;
        const passwordHash = await hashPassword(accountPassword);
        await execute(
          "INSERT INTO users (id, email, password_hash, role, full_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [
            userId,
            normalizedEmail,
            passwordHash,
            "member",
            fullName.trim(),
            ts,
          ],
        );
      }

      const memberId = `mem_${crypto.randomUUID().slice(0, 12)}`;
      const memberCode = await generateNextMemberCode();
      const initialMemberStatus =
        packageId && paymentStatus === "paid" ? "active" : "pending";

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
          ts,
        ],
      );

      if (packageId && duration && isValidDuration(duration)) {
        const pkg = await queryOne<DbPackage>(
          "SELECT * FROM packages WHERE id = ?",
          [packageId],
        );
        const priceRow = await queryOne<{ price: number }>(
          "SELECT price FROM package_prices WHERE package_id = ? AND duration = ?",
          [packageId, duration],
        );
        if (pkg && priceRow) {
          const subId = `sub_${crypto.randomUUID().slice(0, 12)}`;
          const effStart = startDate?.slice(0, 10) || todayDateStr();
          const expiryDate = calculateExpiryDate(effStart, duration);
          const isPaid = paymentStatus === "paid";
          const subStatus = isPaid
            ? expiryDate < todayDateStr()
              ? "expired"
              : "active"
            : "pending_approval";
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
              req.auth!.userId,
              ts,
              ts,
            ],
          );

          if (subStatus === "expired") {
            await execute(
              `UPDATE members SET status = 'expired' WHERE id = ?`,
              [memberId],
            );
          }

          const payId = `pay_${crypto.randomUUID().slice(0, 12)}`;
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
              isPaid ? req.auth!.userId : null,
              isPaid ? ts : null,
              ts,
            ],
          );
        }
      }

      res.status(201).json({ id: memberId, memberCode });
    },
  );

  router.put(
    "/members/:id",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      const member = await queryOne<DbMember>(
        "SELECT * FROM members WHERE id = ?",
        [req.params.id],
      );
      if (!member) {
        res.status(404).json({ error: "Member not found." });
        return;
      }

      if (req.auth!.role !== "admin" && req.auth!.memberId !== member.id) {
        res.status(403).json({ error: "Access denied." });
        return;
      }

      const { fullName, phone, age, notes } = req.body as {
        fullName?: string;
        phone?: string;
        age?: number;
        notes?: string;
      };

      const nextAge = age !== undefined ? Number(age) : member.age;
      if (!Number.isInteger(nextAge) || nextAge < 12 || nextAge > 110) {
        res.status(400).json({ error: "Age must be between 12 and 110." });
        return;
      }

      const ts = nowIso();
      if (req.auth!.role === "admin") {
        await execute(
          "UPDATE members SET full_name = ?, phone = ?, age = ?, notes = ?, updated_at = ? WHERE id = ?",
          [
            fullName?.trim() || member.full_name,
            phone?.trim() || member.phone,
            nextAge,
            notes !== undefined ? notes.trim() : member.notes,
            ts,
            member.id,
          ],
        );
      } else {
        await execute(
          "UPDATE members SET phone = ?, age = ?, updated_at = ? WHERE id = ?",
          [phone?.trim() || member.phone, nextAge, ts, member.id],
        );
      }

      res.json({ ok: true });
    },
  );

  router.post(
    "/members/:id/status",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const member = await queryOne<DbMember>(
        "SELECT * FROM members WHERE id = ?",
        [req.params.id],
      );
      if (!member) {
        res.status(404).json({ error: "Member not found." });
        return;
      }

      const { status } = req.body as { status?: "active" | "suspended" };
      if (status !== "active" && status !== "suspended") {
        res.status(400).json({ error: "Status must be active or suspended." });
        return;
      }

      const ts = nowIso();
      if (status === "suspended") {
        await execute(
          `UPDATE members SET status = 'suspended', updated_at = ? WHERE id = ?`,
          [ts, member.id],
        );
        await execute(
          `UPDATE subscriptions SET status = 'suspended', updated_at = ? WHERE member_id = ? AND status = 'active'`,
          [ts, member.id],
        );
      } else {
        const today = todayDateStr();
        await execute(
          `UPDATE subscriptions SET status = 'active', updated_at = ? WHERE member_id = ? AND status = 'suspended' AND payment_status = 'paid' AND expiry_date >= ?`,
          [ts, member.id, today],
        );
        const activeSub = await queryOne<{ id: string }>(
          `SELECT id FROM subscriptions WHERE member_id = ? AND status = 'active' AND expiry_date >= ? LIMIT 1`,
          [member.id, today],
        );
        const nextStatus = activeSub ? "active" : "expired";
        await execute(
          "UPDATE members SET status = ?, updated_at = ? WHERE id = ?",
          [nextStatus, ts, member.id],
        );
      }

      res.json({ ok: true });
    },
  );

  router.delete("/members/:id", requireAuth, requireAdmin, async (req, res) => {
    const member = await queryOne<DbMember>(
      "SELECT * FROM members WHERE id = ?",
      [req.params.id],
    );
    if (!member) {
      res.status(404).json({ error: "Member not found." });
      return;
    }
    await execute("DELETE FROM members WHERE id = ?", [member.id]);
    res.json({ ok: true });
  });

  // Subscriptions & Renewals
  router.get(
    "/subscriptions",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      await syncExpiredSubscriptions();
      const rows =
        req.auth!.role === "admin"
          ? await query<Record<string, unknown>>(
              `SELECT s.*, m.full_name as member_name, m.member_code, m.phone
             FROM subscriptions s
             JOIN members m ON s.member_id = m.id
             ORDER BY s.created_at DESC`,
            )
          : req.auth!.memberId
            ? await query<Record<string, unknown>>(
                `SELECT s.*, m.full_name as member_name, m.member_code, m.phone
               FROM subscriptions s
               JOIN members m ON s.member_id = m.id
               WHERE s.member_id = ?
               ORDER BY s.created_at DESC`,
                [req.auth!.memberId],
              )
            : [];
      res.json({ subscriptions: rows });
    },
  );

  router.post(
    "/subscriptions",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      const {
        memberId,
        packageId,
        duration,
        startDate,
        paymentStatus,
        paymentMethod,
        referenceNo,
      } = req.body as {
        memberId?: string;
        packageId?: string;
        duration?: PlanDuration;
        startDate?: string;
        paymentStatus?: "paid" | "unpaid";
        paymentMethod?: PaymentMethod;
        referenceNo?: string;
      };

      const targetMemberId =
        req.auth!.role === "admin" ? memberId : req.auth!.memberId;
      if (
        !targetMemberId ||
        !packageId ||
        !duration ||
        !isValidDuration(duration)
      ) {
        res.status(400).json({
          error: "Valid member, packageId, and duration are required.",
        });
        return;
      }

      const member = await queryOne<DbMember>(
        "SELECT * FROM members WHERE id = ?",
        [targetMemberId],
      );
      if (!member) {
        res.status(404).json({ error: "Member not found." });
        return;
      }

      const pkg = await queryOne<DbPackage>(
        "SELECT * FROM packages WHERE id = ?",
        [packageId],
      );
      const priceRow = await queryOne<{ price: number }>(
        "SELECT price FROM package_prices WHERE package_id = ? AND duration = ?",
        [packageId, duration],
      );
      if (!pkg || !priceRow) {
        res
          .status(404)
          .json({ error: "Package or duration pricing not found." });
        return;
      }

      const ts = nowIso();
      const subId = `sub_${crypto.randomUUID().slice(0, 12)}`;
      const payId = `pay_${crypto.randomUUID().slice(0, 12)}`;
      const effStart = startDate?.slice(0, 10) || todayDateStr();
      const expiryDate = calculateExpiryDate(effStart, duration);
      const amount = Number(priceRow.price);

      if (req.auth!.role === "admin") {
        const isPaid = paymentStatus === "paid";
        const subStatus = isPaid
          ? expiryDate < todayDateStr()
            ? "expired"
            : "active"
          : "pending_approval";
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
            req.auth!.userId,
            ts,
            ts,
          ],
        );
        if (isPaid && subStatus === "active") {
          await execute(
            `UPDATE members SET status = 'active', updated_at = ? WHERE id = ?`,
            [ts, member.id],
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
            isPaid ? req.auth!.userId : null,
            isPaid ? ts : null,
            ts,
          ],
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
            ts,
          ],
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
            ts,
          ],
        );
      }

      res.status(201).json({ subscriptionId: subId, paymentId: payId });
    },
  );

  router.post(
    "/subscriptions/:id/renew",
    requireAuth,
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      const existing = await queryOne<DbSubscription>(
        "SELECT * FROM subscriptions WHERE id = ?",
        [req.params.id],
      );
      if (!existing) {
        res.status(404).json({ error: "Subscription not found." });
        return;
      }

      const { packageId, duration, paymentStatus, paymentMethod, referenceNo } =
        req.body as {
          packageId?: string;
          duration?: PlanDuration;
          paymentStatus?: "paid" | "unpaid";
          paymentMethod?: PaymentMethod;
          referenceNo?: string;
        };

      const nextPkgId = packageId || existing.package_id;
      const nextDuration =
        duration && isValidDuration(duration) ? duration : existing.duration;

      const pkg = await queryOne<DbPackage>(
        "SELECT * FROM packages WHERE id = ?",
        [nextPkgId],
      );
      const priceRow = await queryOne<{ price: number }>(
        "SELECT price FROM package_prices WHERE package_id = ? AND duration = ?",
        [nextPkgId, nextDuration],
      );
      if (!pkg || !priceRow) {
        res.status(404).json({ error: "Package pricing not found." });
        return;
      }

      const today = todayDateStr();
      const startDate =
        existing.expiry_date > today ? existing.expiry_date : today;
      const expiryDate = calculateExpiryDate(startDate, nextDuration);
      const ts = nowIso();
      const isPaid = paymentStatus !== "unpaid";

      const subId = `sub_${crypto.randomUUID().slice(0, 12)}`;
      const payId = `pay_${crypto.randomUUID().slice(0, 12)}`;

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
          req.auth!.userId,
          ts,
          ts,
        ],
      );

      if (isPaid) {
        await execute(
          `UPDATE members SET status = 'active', updated_at = ? WHERE id = ?`,
          [ts, existing.member_id],
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
          isPaid ? req.auth!.userId : null,
          isPaid ? ts : null,
          ts,
        ],
      );

      res.status(201).json({
        subscriptionId: subId,
        paymentId: payId,
        startDate,
        expiryDate,
      });
    },
  );

  router.post(
    "/subscriptions/:id/approve",
    requireAuth,
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      const sub = await queryOne<DbSubscription>(
        "SELECT * FROM subscriptions WHERE id = ?",
        [req.params.id],
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
        [startDate, expiryDate, req.auth!.userId, ts, sub.id],
      );
      await execute(
        `UPDATE payments SET status = 'confirmed', approved_by_user_id = ?, paid_at = ? WHERE subscription_id = ? AND status != 'confirmed'`,
        [req.auth!.userId, ts, sub.id],
      );
      await execute(
        `UPDATE members SET status = 'active', updated_at = ? WHERE id = ?`,
        [ts, sub.member_id],
      );

      res.json({ ok: true, startDate, expiryDate });
    },
  );

  // Payments Ledger & Admin Confirmation
  router.get(
    "/payments",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      const rows =
        req.auth!.role === "admin"
          ? await query<Record<string, unknown>>(
              `SELECT p.*, m.full_name as member_name, m.member_code, s.package_name, s.duration, s.expiry_date
             FROM payments p
             JOIN members m ON p.member_id = m.id
             JOIN subscriptions s ON p.subscription_id = s.id
             ORDER BY p.created_at DESC`,
            )
          : req.auth!.memberId
            ? await query<Record<string, unknown>>(
                `SELECT p.*, m.full_name as member_name, m.member_code, s.package_name, s.duration, s.expiry_date
               FROM payments p
               JOIN members m ON p.member_id = m.id
               JOIN subscriptions s ON p.subscription_id = s.id
               WHERE p.member_id = ?
               ORDER BY p.created_at DESC`,
                [req.auth!.memberId],
              )
            : [];
      res.json({ payments: rows });
    },
  );

  router.post(
    "/payments",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      const {
        memberId,
        subscriptionId,
        amount,
        method,
        status,
        referenceNo,
        notes,
      } = req.body as {
        memberId?: string;
        subscriptionId?: string;
        amount?: number;
        method?: PaymentMethod;
        status?: PaymentStatus;
        referenceNo?: string;
        notes?: string;
      };

      const targetMemberId =
        req.auth!.role === "admin" ? memberId : req.auth!.memberId;
      if (
        !targetMemberId ||
        !subscriptionId ||
        !amount ||
        Number(amount) <= 0
      ) {
        res.status(400).json({
          error:
            "Valid member, subscription, and positive amount are required.",
        });
        return;
      }

      const sub = await queryOne<DbSubscription>(
        "SELECT * FROM subscriptions WHERE id = ? AND member_id = ?",
        [subscriptionId, targetMemberId],
      );
      if (!sub) {
        res
          .status(404)
          .json({ error: "Subscription record not found for member." });
        return;
      }

      const ts = nowIso();
      const payId = `pay_${crypto.randomUUID().slice(0, 12)}`;
      const effStatus: PaymentStatus =
        req.auth!.role === "admin" &&
        (status === "confirmed" || status === "unpaid")
          ? status
          : "pending_approval";

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
          effStatus === "confirmed" ? req.auth!.userId : null,
          effStatus === "confirmed" ? ts : null,
          ts,
        ],
      );

      if (effStatus === "confirmed") {
        const today = todayDateStr();
        const nextStatus = sub.expiry_date < today ? "expired" : "active";
        await execute(
          `UPDATE subscriptions SET payment_status = 'paid', status = ?, approved_by_user_id = ?, updated_at = ? WHERE id = ?`,
          [nextStatus, req.auth!.userId, ts, sub.id],
        );
        if (nextStatus === "active") {
          await execute(
            `UPDATE members SET status = 'active', updated_at = ? WHERE id = ?`,
            [ts, targetMemberId],
          );
        }
      }

      res.status(201).json({ id: payId, status: effStatus });
    },
  );

  router.post(
    "/payments/:id/confirm",
    requireAuth,
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      const payment = await queryOne<DbPayment>(
        "SELECT * FROM payments WHERE id = ?",
        [req.params.id],
      );
      if (!payment) {
        res.status(404).json({ error: "Payment not found." });
        return;
      }

      const sub = await queryOne<DbSubscription>(
        "SELECT * FROM subscriptions WHERE id = ?",
        [payment.subscription_id],
      );
      if (!sub) {
        res.status(404).json({ error: "Linked subscription not found." });
        return;
      }

      const ts = nowIso();
      const today = todayDateStr();
      const startDate =
        sub.status === "pending_approval" && sub.start_date < today
          ? today
          : sub.start_date;
      const expiryDate =
        sub.status === "pending_approval"
          ? calculateExpiryDate(startDate, sub.duration)
          : sub.expiry_date;
      const subStatus = expiryDate < today ? "expired" : "active";

      await execute(
        `UPDATE payments SET status = 'confirmed', approved_by_user_id = ?, paid_at = ? WHERE id = ?`,
        [req.auth!.userId, ts, payment.id],
      );
      await execute(
        `UPDATE subscriptions SET start_date = ?, expiry_date = ?, payment_status = 'paid', status = ?, approved_by_user_id = ?, updated_at = ? WHERE id = ?`,
        [startDate, expiryDate, subStatus, req.auth!.userId, ts, sub.id],
      );
      await execute(
        `UPDATE members SET status = ?, updated_at = ? WHERE id = ? AND status != 'suspended'`,
        [subStatus === "active" ? "active" : "expired", ts, payment.member_id],
      );

      res.json({ ok: true });
    },
  );

  router.post(
    "/payments/:id/reject",
    requireAuth,
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      const payment = await queryOne<DbPayment>(
        "SELECT * FROM payments WHERE id = ?",
        [req.params.id],
      );
      if (!payment) {
        res.status(404).json({ error: "Payment not found." });
        return;
      }

      const ts = nowIso();
      await execute(
        `UPDATE payments SET status = 'rejected', approved_by_user_id = ? WHERE id = ?`,
        [req.auth!.userId, payment.id],
      );
      await execute(
        `UPDATE subscriptions SET payment_status = 'unpaid', status = 'cancelled', updated_at = ? WHERE id = ?`,
        [ts, payment.subscription_id],
      );

      res.json({ ok: true });
    },
  );

  // Attendance Logs
  router.get(
    "/attendance",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      const rows =
        req.auth!.role === "admin"
          ? await query<Record<string, unknown>>(
              `SELECT a.*, m.full_name as member_name, m.member_code, m.phone, s.package_name, s.expiry_date
             FROM attendance a
             JOIN members m ON a.member_id = m.id
             LEFT JOIN subscriptions s ON a.subscription_id = s.id
             ORDER BY a.scanned_at DESC
             LIMIT 300`,
            )
          : req.auth!.memberId
            ? await query<Record<string, unknown>>(
                `SELECT a.*, m.full_name as member_name, m.member_code, s.package_name, s.expiry_date
               FROM attendance a
               JOIN members m ON a.member_id = m.id
               LEFT JOIN subscriptions s ON a.subscription_id = s.id
               WHERE a.member_id = ?
               ORDER BY a.scanned_at DESC
               LIMIT 100`,
                [req.auth!.memberId],
              )
            : [];
      res.json({ attendance: rows });
    },
  );

  // Admin Analytics & Reporting Dashboard
  router.get(
    "/analytics/dashboard",
    requireAuth,
    requireAdmin,
    async (_req, res) => {
      await syncExpiredSubscriptions();

      const today = todayDateStr();
      const currentMonthPrefix = today.slice(0, 7);

      const members = await query<DbMember>(
        "SELECT * FROM members ORDER BY created_at DESC",
      );
      const subscriptions = await query<DbSubscription>(
        "SELECT * FROM subscriptions ORDER BY created_at DESC",
      );
      const payments = await query<DbPayment>(
        "SELECT * FROM payments ORDER BY created_at DESC",
      );
      const attendance = await query<{
        id: string;
        scanned_at: string;
        verification_result: string;
      }>(
        "SELECT id, scanned_at, verification_result FROM attendance ORDER BY scanned_at DESC LIMIT 1000",
      );

      const activeMembers = members.filter((m) => m.status === "active").length;
      const expiredMembers = members.filter(
        (m) => m.status === "expired",
      ).length;
      const suspendedMembers = members.filter(
        (m) => m.status === "suspended",
      ).length;
      const pendingMembers = members.filter(
        (m) => m.status === "pending",
      ).length;

      const activeSubscriptions = subscriptions.filter(
        (s) => s.status === "active",
      ).length;
      const expiredSubscriptions = subscriptions.filter(
        (s) => s.status === "expired",
      ).length;
      const pendingApprovals = payments.filter(
        (p) => p.status === "pending_approval",
      ).length;

      const confirmedPayments = payments.filter(
        (p) => p.status === "confirmed",
      );
      const totalRevenue = confirmedPayments.reduce(
        (acc, p) => acc + Number(p.amount),
        0,
      );
      const monthRevenue = confirmedPayments
        .filter((p) =>
          (p.paid_at || p.created_at).startsWith(currentMonthPrefix),
        )
        .reduce((acc, p) => acc + Number(p.amount), 0);
      const unpaidAmount = payments
        .filter((p) => p.status === "unpaid" || p.status === "pending_approval")
        .reduce((acc, p) => acc + Number(p.amount), 0);

      const todayAttendance = attendance.filter((a) =>
        a.scanned_at.startsWith(today),
      );
      const todayValidCheckins = todayAttendance.filter(
        (a) => a.verification_result === "valid",
      ).length;

      const memberMap = new Map(members.map((m) => [m.id, m]));
      const upcomingExpirations = subscriptions
        .filter(
          (s) =>
            s.status === "active" &&
            daysUntilDate(s.expiry_date) >= 0 &&
            daysUntilDate(s.expiry_date) <= 14,
        )
        .map((s) => {
          const mem = memberMap.get(s.member_id);
          return {
            subscriptionId: s.id,
            memberId: s.member_id,
            memberName: mem?.full_name ?? "Unknown",
            memberCode: mem?.member_code ?? "",
            phone: mem?.phone ?? "",
            packageName: s.package_name,
            expiryDate: s.expiry_date,
            daysRemaining: daysUntilDate(s.expiry_date),
          };
        })
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

      const attendanceSeries: Array<{
        date: string;
        valid: number;
        denied: number;
      }> = [];
      for (let i = 13; i >= 0; i -= 1) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i);
        const dayStr = d.toISOString().slice(0, 10);
        const dayRows = attendance.filter((a) =>
          a.scanned_at.startsWith(dayStr),
        );
        attendanceSeries.push({
          date: dayStr,
          valid: dayRows.filter((a) => a.verification_result === "valid")
            .length,
          denied: dayRows.filter((a) => a.verification_result !== "valid")
            .length,
        });
      }

      const revenueSeries: Array<{ month: string; amount: number }> = [];
      for (let i = 5; i >= 0; i -= 1) {
        const d = new Date();
        d.setUTCMonth(d.getUTCMonth() - i);
        const monthPrefix = d.toISOString().slice(0, 7);
        const sum = confirmedPayments
          .filter((p) => (p.paid_at || p.created_at).startsWith(monthPrefix))
          .reduce((acc, p) => acc + Number(p.amount), 0);
        revenueSeries.push({ month: monthPrefix, amount: sum });
      }

      const packageCounts = new Map<string, number>();
      for (const sub of subscriptions.filter((s) => s.status === "active")) {
        packageCounts.set(
          sub.package_name,
          (packageCounts.get(sub.package_name) ?? 0) + 1,
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
          todayValidCheckins,
        },
        recentRegistrations: members.slice(0, 8).map((m) => ({
          id: m.id,
          memberCode: m.member_code,
          fullName: m.full_name,
          phone: m.phone,
          age: Number(m.age),
          status: m.status,
          createdAt: m.created_at,
        })),
        upcomingExpirations,
        attendanceSeries,
        revenueSeries,
        packageBreakdown: Array.from(packageCounts.entries()).map(
          ([name, count]) => ({ name, count }),
        ),
      });
    },
  );

  registerBiometricRoutes(router);

  return router;
}
