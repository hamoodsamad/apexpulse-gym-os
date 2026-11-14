import "dotenv/config";
import express, { type Express, type Request, type Response } from "express";
import { initDatabase } from "../server/db.ts";
import { createApiRouter } from "../server/routes.ts";

let cachedApp: Express | null = null;
let initPromise: Promise<void> | null = null;

function getApp(): Express {
  if (!cachedApp) {
    const app = express();
    app.set("trust proxy", 1);
    app.use(express.json({ limit: "2mb" }));
    app.use("/api", createApiRouter());
    cachedApp = app;
  }
  return cachedApp;
}

export default async function handler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!initPromise) {
      initPromise = initDatabase().catch((err) => {
        initPromise = null;
        throw err;
      });
    }
    await initPromise;

    const app = getApp();
    app(req, res);
  } catch (err) {
    console.error("Vercel API initialization error:", err);
    res.status(500).json({
      error:
        err instanceof Error ? err.message : "Database initialization failed",
    });
  }
}
