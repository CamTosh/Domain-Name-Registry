import type { Session } from "../types";
import { logger } from "../utils/logger";

export type SessionConfig = {
  timeout: number;
  cleanupInterval: number;
}

const DEFAULT_CONFIG: SessionConfig = {
  timeout: 30 * 60 * 1000,
  cleanupInterval: 5 * 60 * 1000,
};

export class SessionManager {
  readonly #sessions: Map<string, Session>;
  #config: SessionConfig;
  #cleanupInterval: Timer | null;

  constructor(config: Partial<SessionConfig> = {}) {
    this.#sessions = new Map();
    this.#config = { ...DEFAULT_CONFIG, ...config };
    this.#cleanupInterval = null;
  }

  get size() {
    return this.#sessions.size;
  }

  startCleanup() {
    if (this.#cleanupInterval) return;

    this.#cleanupInterval = setInterval(() => {
      this.#cleanupSessions();
    }, this.#config.cleanupInterval);
  }

  stopCleanup() {
    if (this.#cleanupInterval) {
      clearInterval(this.#cleanupInterval);
      this.#cleanupInterval = null;
    }
  }

  createSession(registrar: string): string {
    const sessionId = crypto.randomUUID();
    const now = Date.now();

    this.#sessions.set(sessionId, {
      registrar,
      loginTime: now,
      lastActivity: now,
      isActive: true
    });

    return sessionId;
  }

  validateSession(sessionId: string): Session | null {
    const session = this.#sessions.get(sessionId);

    if (!session || !session.isActive) {
      return null;
    }

    const now = Date.now();
    if (now - session.lastActivity > this.#config.timeout) {
      this.closeSession(sessionId);
      return null;
    }

    session.lastActivity = now;
    this.#sessions.set(sessionId, session);
    return session;
  }

  closeSession(sessionId: string): void {
    const session = this.#sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.#sessions.set(sessionId, session);
      logger.info(`Session closed: ${sessionId}`);
    }
  }

  getSession(sessionId: string): Session | undefined {
    return this.#sessions.get(sessionId);
  }

  #cleanupSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.#sessions) {
      if (!session.isActive || now - session.lastActivity > this.#config.timeout) {
        this.#sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired sessions`);
    }
  }
}
