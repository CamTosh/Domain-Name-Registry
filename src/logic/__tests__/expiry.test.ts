import { expect, test, describe, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import type { AppState } from "../../types";
import { initializeDatabase } from "../../database";
import { SessionManager } from "../session";
import { UsageManager } from "../usage";
import { handleDomainExpiry } from "../expiry";

describe("Domain Expiry System", () => {
  let state: AppState;

  beforeEach(() => {

    const db = new Database(":memory:");
    initializeDatabase(db);

    state = {
      db,
      rateLimit: new Map(),
      sessionManager: new SessionManager(),
      usageManager: new UsageManager(),
    };
  });

  test("should handle domains expiring today", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add test domains
    const domains = ['exp1.com', 'exp2.com', 'exp3.com'];
    for (const domain of domains) {
      state.db.prepare(`
        INSERT INTO domains (
          name,
          status,
          registrar,
          created_at,
          expiry_date
        ) VALUES (?, 'active', 'exp1', ?, ?)
      `).run(domain, Date.now(), today.getTime());
    }

    await handleDomainExpiry(state, 100);

    const inactive = state.db.prepare(
      "SELECT COUNT(*) as count FROM domains WHERE status = 'inactive'"
    ).get() as { count: number };

    expect(inactive.count).toBe(3);
  });
});
