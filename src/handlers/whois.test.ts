import { expect, test, describe, beforeEach } from "bun:test";
import { handleWhoisRequest } from "./whois";
import { Database } from "bun:sqlite";
import { initializeDatabase } from "../database";
import { SessionManager } from "../utils/session";
import type { AppState } from "../types";
import { MockSocket } from "../utils/test";

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
      'test.com',
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
    };

    socket = new MockSocket();
  });

  test("should return domain information", () => {
    handleWhoisRequest(socket as any, Buffer.from("test.com"), state);

    const response = socket.getResponse();
    expect(response).toContain("Domain Information:");
    expect(response).toContain("Domain Name: test.com");
    expect(response).toContain("Domain Status: active");
    expect(response).toContain("Created Date:");
    expect(response).toContain("Expiration Date:");
  });

  test("should return registrar information", () => {
    handleWhoisRequest(socket as any, Buffer.from("registrar test1"), state);

    const response = socket.getResponse();
    expect(response).toContain("Registrar Information:");
    expect(response).toContain("Registrar ID: test1");
    expect(response).toContain("test.com (active)"); // Should show the domain we created
  });

  test("should handle non-existent domain", () => {
    handleWhoisRequest(socket as any, Buffer.from("nonexistent.com"), state);

    const response = socket.getResponse();
    expect(response).toContain("ERROR: No match for domain");
  });

  test("should show help message", () => {
    handleWhoisRequest(socket as any, Buffer.from("help"), state);

    const response = socket.getResponse();
    expect(response).toContain("Available WHOIS commands:");
  });
});
