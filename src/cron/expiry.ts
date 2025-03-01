import { Database } from "bun:sqlite";
import { handleDomainExpiry } from "../logic/expiry";
import { initializeDatabase } from "../database";
import { SessionManager } from "../logic/session";
import { UsageManager } from "../logic/usage";
import type { AppState } from "../types";

const db = new Database("registry.sqlite", { create: true });
initializeDatabase(db);

const state: AppState = {
  db,
  rateLimit: new Map(),
  sessionManager: new SessionManager(),
  usageManager: new UsageManager(),
};

handleDomainExpiry(state)
  .catch(console.error)
  .finally(() => db.close());
