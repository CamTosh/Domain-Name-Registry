import { expect, test, describe, beforeEach } from "bun:test";
import { handleWhoisRequest } from "../whois";
import { Database } from "bun:sqlite";
import { initializeDatabase } from "../../database";
import type { AppState } from "../../types";
import { MockSocket } from "../../utils/test";
import { SessionManager } from "../../logic/session";
import { UsageManager } from "../../logic/usage";

describe("WHOIS Handler", () => {
  let state: AppState;
  let socket: MockSocket;

  beforeEach(() => {
    const db = new Database(":memory:");
    initializeDatabase(db);

    const now = Date.now();
    const expiryDate = new Date(now).setFullYear(new Date(now).getFullYear() + 1);

    db.run(`
      INSERT INTO domains (
        name,
        status,
        registrar,
        created_at,
        updated_at,
        expiry_date
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'test.tsh',
      'active',
      'test1',
      now,
      now,
      expiryDate
    ]);

    state = {
      db,
      rateLimit: new Map(),
      sessionManager: new SessionManager(),
      usageManager: new UsageManager(),
    };

    socket = new MockSocket();
  });

  test("should return domain information", () => {
    handleWhoisRequest(socket as any, Buffer.from("test.tsh"), state);

    const response = socket.getResponse();
    expect(response).toContain("domain:       test.tsh");
    expect(response).toContain("status:       ACTIVE");
    expect(response).toContain("created:");
    expect(response).toContain("expires:");
    expect(response).toContain(">>> Last update of WHOIS database:");
  });

  test("should return registrar information", () => {
    handleWhoisRequest(socket as any, Buffer.from("registrar test1"), state);

    const response = socket.getResponse();
    expect(response).toContain("registrar:      test1");
    expect(response).toContain("organisation:   BULLSHIT Registry Accredited Registrar");
    expect(response).toContain("test.tsh (active)"); // Should show the domain we created
    expect(response).toContain("source:        BULLSHIT");
  });

  test("should handle non-existent domain", () => {
    handleWhoisRequest(socket as any, Buffer.from("nonexistent.tsh"), state);

    const response = socket.getResponse();
    expect(response).toContain("ERROR: No match for domain");
  });

  test("should show help message", () => {
    handleWhoisRequest(socket as any, Buffer.from("help"), state);

    const response = socket.getResponse();
    expect(response).toContain("Available WHOIS commands:");
  });
});
