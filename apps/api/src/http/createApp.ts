import express, { type ErrorRequestHandler } from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import type { DemoSystem } from "../infrastructure/demo/createDemoSystem.ts";

export function createApp(system: DemoSystem) {
  const app = express();
  app.use(express.json({ limit: "24kb" }));
  const server = createServer(app);
  const allowedOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  const io = new Server(server, { cors: { origin: allowedOrigin } });

  app.get("/api/health", (_request, response) => response.json({ status: "ok", mode: "demo" }));
  app.get("/api/dashboard", async (_request, response, next) => {
    try { response.json(await system.getDashboardSnapshot()); } catch (error) { next(error); }
  });
  app.get("/api/sessions", async (_request, response, next) => {
    try { response.json(await system.accounting.getActiveSessions()); } catch (error) { next(error); }
  });
  app.post("/api/sessions/:mac/disconnect", async (request, response, next) => {
    try { await system.accounting.disconnectUser(request.params.mac!); response.json({ ok: true }); } catch (error) { next(error); }
  });
  app.post("/api/sessions/:mac/pause", async (request, response, next) => {
    try { await system.accounting.pauseUser(request.params.mac!); response.json({ ok: true }); } catch (error) { next(error); }
  });
  app.post("/api/sessions/:mac/resume", async (request, response, next) => {
    try { await system.accounting.resumeUser(request.params.mac!); response.json({ ok: true }); } catch (error) { next(error); }
  });
  app.post("/api/sessions/:mac/extend", async (request, response, next) => {
    const minutes = Number(request.body?.minutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1_440) { response.status(400).json({ error: "minutes must be a whole number from 1 to 1440." }); return; }
    try { await system.accounting.extendSession(request.params.mac!, minutes); response.json({ ok: true }); } catch (error) { next(error); }
  });
  app.post("/api/sessions/:mac/throttle", async (request, response, next) => {
    const rateLimitMbps = Number(request.body?.rateLimitMbps);
    if (!Number.isFinite(rateLimitMbps) || rateLimitMbps <= 0 || rateLimitMbps > 1_000) { response.status(400).json({ error: "rateLimitMbps must be greater than 0 and no more than 1000." }); return; }
    try { await system.accounting.throttleUser(request.params.mac!, rateLimitMbps); response.json({ ok: true }); } catch (error) { next(error); }
  });
  app.post("/api/payments/collect", async (request, response, next) => {
    const { channel, amountTzs, reference, customerLabel, packageName } = request.body ?? {};
    if (!Number.isSafeInteger(amountTzs) || amountTzs <= 0 || typeof customerLabel !== "string" || typeof packageName !== "string") {
      response.status(400).json({ error: "amountTzs, customerLabel, and packageName are required." }); return;
    }
    try {
      const entry = await system.billing.collect(channel, { amountTzs, reference: typeof reference === "string" ? reference : "", customerLabel, packageName });
      response.status(201).json(entry);
    } catch (error) { next(error); }
  });

  const handleError: ErrorRequestHandler = (error, _request, response, _next) => {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    response.status(message.startsWith("No session") ? 404 : 400).json({ error: message });
  };
  app.use(handleError);

  const publishSnapshot = async () => {
    system.simulateTrafficTick();
    io.emit("dashboard:snapshot", await system.getDashboardSnapshot());
  };
  const timer = setInterval(() => { void publishSnapshot().catch((error: unknown) => console.error("Snapshot publish failed", error)); }, 5_000);
  io.on("connection", (socket) => {
    void system.getDashboardSnapshot().then((snapshot) => socket.emit("dashboard:snapshot", snapshot)).catch(() => undefined);
  });
  server.on("close", () => clearInterval(timer));

  return { app, io, server };
}
