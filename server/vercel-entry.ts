import "dotenv/config";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { initDatabase } from "./db.ts";
import { createApiRouter } from "./routes.ts";

let cachedApp: Express | null = null;
let initPromise: Promise<void> | null = null;

function getApp(): Express {
  if (!cachedApp) {
    const app = express();
    app.set("trust proxy", 1);
    app.use(express.json({ limit: "2mb" }));
    app.use("/api", createApiRouter());

    app.use(
      (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
        console.error("Express error:", err);
        if (!res.headersSent) {
          res.status(500).json({
            error: err instanceof Error ? err.message : "Internal server error",
          });
        }
      },
    );

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
    await new Promise<void>((resolve) => {
      res.on("finish", resolve);
      res.on("close", resolve);
      app(req, res);
    });
  } catch (err) {
    console.error("Vercel API error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        error:
          err instanceof Error ? err.message : "Database initialization failed",
      });
    }
  }
}
