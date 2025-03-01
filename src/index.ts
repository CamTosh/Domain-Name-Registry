import { Database } from "bun:sqlite";
import { handleEppRequest } from "./handlers/epp";
import { handleWhoisRequest } from "./handlers/whois";
import { initializeDatabase } from "./database";
import { logger } from "./utils/logger";
import { SessionManager } from "./utils/session";
import type { AppState } from "./types";

const db = new Database("registry.sqlite", { create: true });
initializeDatabase(db);


export const state: AppState = {
  db: new Database("registry.sqlite", { create: true }),
  rateLimit: new Map(),
  sessionManager: new SessionManager(),
};

// EPP Server (Port 700)
const eppServer = Bun.listen({
  hostname: "0.0.0.0",
  port: 700,
  socket: {
    data: (socket, data) => handleEppRequest(socket, data, state),
  },
});

// WHOIS Server (Port 43)
const whoisServer = Bun.listen({
  hostname: "0.0.0.0",
  port: 43,
  socket: {
    data: (socket, data) => handleWhoisRequest(socket, data, state),
  },
});

// API Server (Port 3000)
Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    switch (url.pathname) {
      case "/health":
        return new Response("OK");
      case "/metrics":
        return new Response(JSON.stringify({
          sessions: state.sessionManager.size,
          rateLimits: state.rateLimit.size,
        }));
      default:
        return new Response("Not Found", { status: 404 });
    }
  },
});

logger.info("All servers started");
state.sessionManager.startCleanup();
