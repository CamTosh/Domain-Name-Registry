import { expect, test, describe, afterEach, beforeEach } from "bun:test";
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

  test("should handle login command", async () => {
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
  });

  test("should handle domain check command", async () => {
    const checkXml = `
      <epp>
        <command>
          <check>
            <domain:name>test.com</domain:name>
          </check>
        </command>
      </epp>
    `;

    await handleEppRequest(socket as any, Buffer.from(checkXml), state);
    expect(socket.getLastResponse()).toContain("avail=\"1\"");
  });
});
