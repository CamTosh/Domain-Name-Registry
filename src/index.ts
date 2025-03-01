import { Database } from "bun:sqlite";
import { handleEppRequest } from "./handlers/epp";
import { handleWhoisRequest } from "./handlers/whois";
import { initializeDatabase, queries } from "./database";
import { logger } from "./utils/logger";
import type { AppState } from "./types";
import { SessionManager } from "./logic/session";
import { UsageManager } from "./logic/usage";

const db = new Database("registry.sqlite", { create: true });
initializeDatabase(db);

const state: AppState = {
  db,
  rateLimit: new Map(),
  sessionManager: new SessionManager(),
  usageManager: new UsageManager({
    requestsPerHour: 1000,
    requestsPerMinute: 100,
    penaltyThreshold: 3,
    penaltyDelay: 2000,
    penaltyTokens: 5,
  }),
};

const servers = {
  epp: Bun.listen({
    hostname: "0.0.0.0",
    port: 700,
    socket: {
      data: (socket, data) => handleEppRequest(socket, data, state),
      error: (_, error) => logger.error("EPP error:", error),
    },
  }),

  whois: Bun.listen({
    hostname: "0.0.0.0",
    port: 43,
    socket: {
      data: (socket, data) => handleWhoisRequest(socket, data, state),
      error: (_, error) => logger.error("WHOIS error:", error),
    },
  }),

  /*
   TODO: add leaderboard
   TODO: add metrics
  */
  api: Bun.serve({
    port: 3000,
    routes: {
      "/health": new Response("OK"),
      "/today-expiration": (req) => {
        const domains = queries.todayExpiration(state.db);
        const names = domains.map((domain) => domain.name);

        return new Response(JSON.stringify(names));
      },
      "/leaderboard": (req) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.getTime();

        // Get start of week (assuming week starts on Monday)
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        const weekStartTime = weekStart.getTime();

        const leaderboard = db.prepare(`
          WITH today_stats AS (
            SELECT
              registrar,
              COUNT(*) as today_count
            FROM domains
            WHERE created_at >= ?
            GROUP BY registrar
          ),
          week_stats AS (
            SELECT
              registrar,
              COUNT(*) as week_count
            FROM domains
            WHERE created_at >= ?
            GROUP BY registrar
          )
          SELECT
            r.id as registrar_id,
            COALESCE(t.today_count, 0) as today_count,
            COALESCE(w.week_count, 0) as week_count
          FROM registrars r
          LEFT JOIN today_stats t ON r.id = t.registrar
          LEFT JOIN week_stats w ON r.id = w.registrar
          WHERE r.id != 'registry'
          ORDER BY week_count DESC, today_count DESC, r.id ASC
        `).all(todayStart, weekStartTime) as {
          registrar_id: string;
          today_count: number;
          week_count: number;
        }[];

        return new Response(JSON.stringify(leaderboard, null, 2))
      },
    },
    fetch(req) {
      return new Response("Not Found", { status: 404 });
    },
  }),
};

for (const [name, server] of Object.entries(servers)) {
  logger.info(`${name.toUpperCase()} server listening on ${server.hostname}:${server.port}`);
}

// Start session cleanup and log status
state.sessionManager.startCleanup();
logger.info(".TSH Registry started successfully");

process.on("SIGTERM", () => {
  state.sessionManager.stopCleanup();
  state.db.close();
  process.exit();
});
