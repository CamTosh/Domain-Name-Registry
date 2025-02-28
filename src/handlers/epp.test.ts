import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { handleEppRequest } from "../../src/handlers/epp";
import { createTestState, MockSocket, cleanupTestState } from "../utils/helpers";
import type { AppState } from "../../src/types";

describe("EPP Handler", () => {
  let state: AppState;
  let socket: MockSocket;

  beforeEach(() => {
    state = createTestState();
    socket = new MockSocket();
  });

  afterEach(() => {
    cleanupTestState(state);
  });

  describe("Login Command", () => {
    test("should handle successful login", async () => {
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
      expect(state.sessions.size).toBe(1);
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
      expect(state.sessions.size).toBe(0);
    });
  });

  describe("Check Command", () => {
    test("should report available domain", async () => {
      const checkXml = `
        <epp>
          <command>
            <check>
              <domain:name>available.com</domain:name>
            </check>
          </command>
        </epp>
      `;

      await handleEppRequest(socket as any, Buffer.from(checkXml), state);
      expect(socket.getLastResponse()).toContain("avail=\"1\"");
    });

    test("should report unavailable domain", async () => {
      // First create a domain
      state.db.prepare(`
        INSERT INTO domains (name, status, registrar, created_at)
        VALUES ('taken.com', 'active', 'test1', ?)
      `).run(Date.now());

      const checkXml = `
        <epp>
          <command>
            <check>
              <domain:name>taken.com</domain:name>
            </check>
          </command>
        </epp>
      `;

      await handleEppRequest(socket as any, Buffer.from(checkXml), state);
      expect(socket.getLastResponse()).toContain("avail=\"0\"");
      expect(socket.getLastResponse()).toContain("<domain:reason>In use</domain:reason>");
    });
  });

  describe("Create Command", () => {
    beforeEach(async () => {
      // Login first
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
      socket.writtenData = []; // Clear previous responses
    });

    test("should create new domain", async () => {
      const createXml = `
        <epp>
          <command>
            <create>
              <domain:name>newdomain.com</domain:name>
              <clID>test1</clID>
            </create>
          </command>
        </epp>
      `;

      await handleEppRequest(socket as any, Buffer.from(createXml), state);
      expect(socket.getLastResponse()).toContain("Command completed successfully");

      const domain = state.db.prepare("SELECT * FROM domains WHERE name = ?")
        .get("newdomain.com");
      expect(domain).toBeDefined();
      expect(domain.status).toBe("active");
    });

    test("should reject creating existing domain", async () => {
      // First create a domain
      state.db.prepare(`
        INSERT INTO domains (name, status, registrar, created_at)
        VALUES ('existing.com', 'active', 'test1', ?)
      `).run(Date.now());

      const createXml = `
        <epp>
          <command>
            <create>
              <domain:name>existing.com</domain:name>
              <clID>test1</clID>
            </create>
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
        VALUES ('info-test.com', 'active', 'test1', ?)
      `).run(timestamp);

      const infoXml = `
        <epp>
          <command>
            <info>
              <domain:name>info-test.com</domain:name>
            </info>
          </command>
        </epp>
      `;

      await handleEppRequest(socket as any, Buffer.from(infoXml), state);
      const response = socket.getLastResponse();
      expect(response).toContain("Command completed successfully");
      expect(response).toContain("<domain:name>info-test.com</domain:name>");
      expect(response).toContain("<domain:status s=\"active\"/>");
      expect(response).toContain("<domain:registrant>test1</domain:registrant>");
    });

    test("should handle non-existent domain", async () => {
      const infoXml = `
        <epp>
          <command>
            <info>
              <domain:name>doesnotexist.com</domain:name>
            </info>
          </command>
        </epp>
      `;

      await handleEppRequest(socket as any, Buffer.from(infoXml), state);
      expect(socket.getLastResponse()).toContain("Object does not exist");
    });
  });

  describe("Rate Limiting", () => {
    test("should enforce rate limits", async () => {
      const checkXml = `
        <epp>
          <command>
            <check>
              <domain:name>test.com</domain:name>
            </check>
          </command>
        </epp>
      `;

      // Make 101 requests
      for (let i = 0; i < 101; i++) {
        await handleEppRequest(socket as any, Buffer.from(checkXml), state);
      }

      // The last request should be rate limited
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
              <domain:name>test.com</domain:name>
            </unknown>
          </command>
        </epp>
      `;

      await handleEppRequest(socket as any, Buffer.from(unknownXml), state);
      expect(socket.getLastResponse()).toContain("Unknown command");
    });
  });
});
