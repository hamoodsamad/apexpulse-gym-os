import "dotenv/config";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import express from "express";
import { createServer as createViteServer } from "vite";
import { initDatabase } from "./server/db.ts";
import { createApiRouter } from "./server/routes.ts";

const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";

async function startLocalServer(): Promise<void> {
  await initDatabase();

  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", createApiRouter());

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  app.use(vite.middlewares);

  app.get("/", async (req, res, next) => {
    try {
      const htmlPath = path.resolve(process.cwd(), "index-login.html");
      const rawHtml = await fs.readFile(htmlPath, "utf-8");
      const transformed = await vite.transformIndexHtml(
        req.originalUrl,
        rawHtml,
      );
      res.status(200).set({ "Content-Type": "text/html" }).end(transformed);
    } catch (err) {
      next(err);
    }
  });

  app.get("/:page", async (req, res, next) => {
    const page = req.params.page;
    if (!page.startsWith("index-") || !page.endsWith(".html")) {
      next();
      return;
    }
    try {
      const htmlPath = path.resolve(process.cwd(), page);
      const rawHtml = await fs.readFile(htmlPath, "utf-8");
      const transformed = await vite.transformIndexHtml(
        req.originalUrl,
        rawHtml,
      );
      res.status(200).set({ "Content-Type": "text/html" }).end(transformed);
    } catch {
      next();
    }
  });

  const httpServer = http.createServer(app);
  httpServer.listen(PORT, HOST, () => {
    console.log(
      `ApexPulse Gym OS local server running on http://localhost:${PORT}`,
    );
  });
}

startLocalServer().catch((err) => {
  console.error("Fatal local server error:", err);
  process.exit(1);
});
