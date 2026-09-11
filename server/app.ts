import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { contactSchema, type Portfolio } from "../shared/schema";
import type { MessageStore } from "./store";
import { pageTitles, projectSlug } from "../shared/paths";

interface Options {
  portfolio: Portfolio;
  store: MessageStore;
  distDir?: string;
  origins: string[];
  trustProxy?: string;
  rateLimitMax?: number;
  getPortfolio?: () => Promise<Portfolio>;
}

export function createApp(options: Options) {
  const app = express();
  app.disable("x-powered-by");
  if (options.trustProxy) app.set("trust proxy", options.trustProxy);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { "upgrade-insecure-requests": null },
      },
      strictTransportSecurity: false,
    }),
  );
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.get("/api/health", (_req, res) => {
    res.json({ status: options.store.healthy() ? "ok" : "unavailable" });
  });
  const getPortfolio =
    options.getPortfolio || (() => Promise.resolve(options.portfolio));
  app.get("/api/portfolio", async (_req, res) => {
    res.json(await getPortfolio());
  });
  app.use(
    "/api/contact",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: options.rateLimitMax ?? 5,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        error:
          "Too many messages. Please try again in 15 minutes or use email.",
      },
    }),
  );
  app.post(
    "/api/contact",
    (req, res, next) => {
      if (
        req.get("sec-fetch-site") === "cross-site" ||
        (req.get("origin") && !options.origins.includes(req.get("origin")!))
      ) {
        res.status(403).json({ error: "This origin is not allowed." });
        return;
      }
      if (!req.is("application/json")) {
        res.status(415).json({ error: "Send a JSON request." });
        return;
      }
      next();
    },
    express.json({ limit: "16kb" }),
    (req, res) => {
      const input = contactSchema.safeParse(req.body);
      if (!input.success) {
        res.status(400).json({
          error: "Please check your message.",
          fields: z.flattenError(input.error).fieldErrors,
        });
        return;
      }
      const key = z.uuid().safeParse(req.get("Idempotency-Key"));
      if (!key.success) {
        res
          .status(400)
          .json({ error: "A valid request identifier is required." });
        return;
      }
      if (input.data.website) {
        res.status(202).json({ accepted: true });
        return;
      }
      const result = options.store.save(input.data, key.data);
      if ("conflict" in result) {
        res.status(409).json({
          error: "Request identifier already used for another message.",
        });
        return;
      }
      res.status(201).json({ accepted: true, id: result.id });
    },
  );
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Endpoint not found." });
  });
  if (options.distDir && existsSync(join(options.distDir, "index.html"))) {
    app.use(
      "/assets",
      express.static(join(options.distDir, "assets"), {
        immutable: true,
        maxAge: "1y",
        fallthrough: false,
      }),
    );
    app.use(express.static(options.distDir, { index: false, maxAge: "1h" }));
    app.get("/{*path}", async (req, res) => {
      if (req.path.includes(".") || !req.accepts("html")) {
        res.sendStatus(404);
        return;
      }
      const path = req.path.replace(/\/$/, "") || "/";
      const portfolio = await getPortfolio();
      const pages = new Set([
        ...Object.keys(pageTitles),
        ...portfolio.projects.map(
          (project) => "/projects/" + projectSlug(project),
        ),
      ]);
      res
        .status(pages.has(path) ? 200 : 404)
        .set("Cache-Control", "no-cache")
        .sendFile(join(options.distDir!, "index.html"));
    });
  }
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    const status =
      error.status === 413
        ? 413
        : error.status === 400
          ? 400
          : error.status === 404
            ? 404
            : 500;
    if (status === 500) console.error("Request failed:", error);
    res.status(status).json({
      error:
        status === 413
          ? "Message is too large."
          : status === 400
            ? "Invalid JSON."
            : status === 404
              ? "File not found."
              : "Unable to save your message. Please try again.",
    });
  };
  app.use(errors);
  return app;
}
