import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { AuthTokenPayload, DbUser } from "./types.ts";
import { queryOne } from "./db.ts";

let cachedFallbackSecret: string | null = null;

function getJwtSecret(): string {
  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret && envSecret !== "CHANGE_ME_TO_A_LONG_RANDOM_SECRET_KEY") {
    return envSecret;
  }
  if (!cachedFallbackSecret) {
    // Deterministic across serverless instances when DATABASE_URL is configured
    const seed =
      process.env.DATABASE_URL?.trim() ||
      crypto.randomBytes(32).toString("hex");
    cachedFallbackSecret = crypto
      .createHash("sha256")
      .update(`apexpulse:${seed}`)
      .digest("hex");
  }
  return cachedFallbackSecret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "24h" });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthTokenPayload;
}

export function extractTokenFromRequest(req: Request): string | null {
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

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
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

  const user = await queryOne<DbUser>(
    "SELECT id, email, role, full_name FROM users WHERE id = ?",
    [decoded.userId],
  );
  if (!user) {
    res.status(401).json({ error: "User account no longer exists" });
    return;
  }

  const memberRow = await queryOne<{ id: string }>(
    "SELECT id FROM members WHERE user_id = ? OR email = ?",
    [user.id, user.email],
  );

  req.auth = {
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
    memberId: memberRow?.id ?? null,
  };
  next();
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
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
