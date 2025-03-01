import { expect, test, describe, beforeEach } from "bun:test";
import { handleEppRequest } from "../../../src/handlers/epp";
import type { AppState } from "../../../src/types";
import { initializeDatabase } from "../../database";
import { Database } from "bun:sqlite";
import { MockSocket } from "../../utils/test";
import { SessionManager } from "../../logic/session";
import { UsageManager } from "../../logic/usage";

describe("EPP Handler", () => {
  let state: AppState;
  let socket: MockSocket;

  beforeEach(() => {
    socket = new MockSocket();

    const db = new Database(":memory:");
    initializeDatabase(db);

    state = {
      db,
      rateLimit: new Map(),
      sessionManager: new SessionManager(),
      usageManager: new UsageManager(),
    };
  });

  describe("Login Command", () => {
    test.only("should handle successful login", async () => {
      const loginXml = `
          <epp>
            <command>
              <login>
                <clID>test1</clID>
                <pw>test1</pw>
              </login>
            </command>
          </epp>
        `;

      await handleEppRequest(socket as any, Buffer.from(loginXml), state);
      expect(socket.getLastResponse()).toContain("Command completed successfully");
      expect(state.sessionManager.size).toBe(1);
    });

    test("should reject invalid credentials", async () => {
      const loginXml = `
          <epp>
            <command>
              <login>
                <clID>test1</clID>
                <pw>wrongpassword</pw>
              </login>
            </command>
          </epp>
        `;

      await handleEppRequest(socket as any, Buffer.from(loginXml), state);
      expect(socket.getLastResponse()).toContain("Authentication error");
      expect(state.sessionManager.size).toBe(0);
    });
  });

  describe("Authenticated Commands", () => {
    let sessionId: string;

    beforeEach(() => {
      sessionId = state.sessionManager.createSession('test1');
    });

    describe("Check Command", () => {
      test("should report available domain", async () => {
        const checkXml = `
          <epp>
            <command>
              <check>
                <domain:name>available.tsh</domain:name>
              </check>
              <clTRID>${sessionId}</clTRID>
            </command>
          </epp>
        `;

        await handleEppRequest(socket as any, Buffer.from(checkXml), state);
        expect(socket.getLastResponse()).toContain("avail=\"1\"");
      });

      test("should report unavailable domain", async () => {
        state.db.prepare(`
          INSERT INTO domains (name, status, registrar, created_at)
          VALUES ('taken.tsh', 'active', 'test1', ?)
        `).run(Date.now());

        const checkXml = `
          <epp>
            <command>
              <check>
                <domain:name>taken.tsh</domain:name>
              </check>
              <clTRID>${sessionId}</clTRID>
            </command>
          </epp>
        `;

        await handleEppRequest(socket as any, Buffer.from(checkXml), state);
        expect(socket.getLastResponse()).toContain("avail=\"0\"");
        expect(socket.getLastResponse()).toContain("<domain:reason>In use</domain:reason>");
      });
    });

    describe("Create Command", () => {
      test("should reject creating existing domain", async () => {
        state.db.prepare(`
          INSERT INTO domains (name, status, registrar, created_at)
          VALUES ('existing.tsh', 'active', 'test1', ?)
        `).run(Date.now());

        const createXml = `
          <epp>
            <command>
              <create>
                <domain:name>existing.tsh</domain:name>
                <clID>test1</clID>
              </create>
              <clTRID>${sessionId}</clTRID>
            </command>
          </epp>
        `;

        await handleEppRequest(socket as any, Buffer.from(createXml), state);
        expect(socket.getLastResponse()).toContain("Object exists");
      });
    });

    describe("Info Command", () => {
      test("should return domain information", async () => {
        const timestamp = Date.now();
        // Create a domain first
        state.db.prepare(`
          INSERT INTO domains (name, status, registrar, created_at)
          VALUES ('info-test.tsh', 'active', 'test1', ?)
        `).run(timestamp);

        const infoXml = `
          <epp>
            <command>
              <info>
                <domain:name>info-test.tsh</domain:name>
              </info>
              <clTRID>${sessionId}</clTRID>
            </command>
          </epp>
        `;

        await handleEppRequest(socket as any, Buffer.from(infoXml), state);
        const response = socket.getLastResponse();
        expect(response).toContain("<result code=\"1000\">");
        expect(response).toContain("<domain:name>info-test.tsh</domain:name>");
        expect(response).toContain("<domain:status s=\"active\"/>");
      });

      test("should handle non-existent domain", async () => {
        const infoXml = `
          <epp>
            <command>
              <info>
                <domain:name>doesnotexist.tsh</domain:name>
              </info>
              <clTRID>${sessionId}</clTRID>
            </command>
          </epp>
        `;

        await handleEppRequest(socket as any, Buffer.from(infoXml), state);
        expect(socket.getLastResponse()).toContain("<result code=\"2303\">");
      });
    });
  });

  describe("Rate Limiting", () => {
    test("should enforce rate limits", async () => {
      const checkXml = `
          <epp>
            <command>
              <check>
                <domain:name>test.tsh</domain:name>
              </check>
            </command>
          </epp>
        `;

      // Make 100 successful requests
      for (let i = 0; i < 100; i++) {
        await handleEppRequest(socket as any, Buffer.from(checkXml), state);
      }

      // Clear the response buffer
      socket.writtenData = [];

      // The 101st request should be rate limited
      await handleEppRequest(socket as any, Buffer.from(checkXml), state);
      expect(socket.getLastResponse()).toContain("Rate limit exceeded");
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid XML", async () => {
      const invalidXml = "This is not XML";
      await handleEppRequest(socket as any, Buffer.from(invalidXml), state);
      expect(socket.getLastResponse()).toContain("Command failed");
    });

    test("should handle unknown command", async () => {
      const unknownXml = `
          <epp>
            <command>
              <unknown>
                <something>test.tsh</something>
              </unknown>
            </command>
          </epp>
        `;

      await handleEppRequest(socket as any, Buffer.from(unknownXml), state);
      expect(socket.getLastResponse()).toContain("<msg>Unknown command</msg>");
    });
  });
});
