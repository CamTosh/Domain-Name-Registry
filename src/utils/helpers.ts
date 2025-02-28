import { Database } from "bun:sqlite";
import { initializeDatabase } from "../database";
import type { AppState } from "../types";

export function createTestState(): AppState {
  const db = new Database(":memory:");
  initializeDatabase(db);

  return {
    db,
    sessions: new Map(),
    rateLimit: new Map(),
  };
}

export function cleanupTestState(state: AppState) {
  state.db.close();
  state.sessions.clear();
  state.rateLimit.clear();
}

export class MockSocket {
  public writtenData: string[] = [];
  public remoteAddress = "127.0.0.1";

  write(data: string) {
    this.writtenData.push(data);
  }

  end() {
    // Mock implementation
  }

  getLastResponse() {
    return this.writtenData[this.writtenData.length - 1];
  }
}
