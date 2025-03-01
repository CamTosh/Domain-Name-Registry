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
      "/registrar/create": async (req) => {
        if (req.method !== "POST") {
          return new Response("Method not allowed", { status: 405 });
        }

        try {
          const body = await req.json();

          // Validate input
          if (!body.id || !body.password) {
            return new Response(JSON.stringify({
              success: false,
              error: "Missing required fields: id and password"
            }), { status: 400 });
          }

          // Validate registrar ID format
          if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(body.id)) {
            return new Response(JSON.stringify({
              success: false,
              error: "Invalid registrar ID format. Use lowercase letters, numbers, and hyphens. Must start and end with letter or number."
            }), { status: 400 });
          }

          // Validate password strength
          if (body.password.length < 8) {
            return new Response(JSON.stringify({
              success: false,
              error: "Password must be at least 8 characters long"
            }), { status: 400 });
          }

          const result = queries.createRegistrar(state.db, body.id, body.password);

          if (!result.success) {
            return new Response(JSON.stringify({
              success: false,
              error: result.error
            }), { status: 409 });
          }

          return new Response(JSON.stringify({ id: result.registrarId }), { status: 201 });

        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Internal server error"
          }), { status: 500 });
        }
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
