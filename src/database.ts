import { Database } from "bun:sqlite";
import type { Domain, Registrar } from "./types";
import { calculateExpiryDate } from "./utils/domains";

export function initializeDatabase(db: Database) {
  // db.run(`delete from domains;`);
  // db.run(`delete from registrars;`)

  db.run(`
    CREATE TABLE IF NOT EXISTS domains (
      name TEXT PRIMARY KEY,
      status TEXT CHECK(status IN ('active', 'inactive', 'pending', 'deleted')),
      registrar TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      expiry_date INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS registrars (
      id TEXT PRIMARY KEY,
      password TEXT,
      credits INTEGER DEFAULT 0
    )
  `);

  // Add test registrars if they don't exist
  db.run(`
    INSERT OR IGNORE INTO registrars (id, password, credits)
    VALUES ('test1', 'test1', 1000), ('test2', 'test2', 1000)
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS registrar_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registrar_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      action TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      success BOOLEAN NOT NULL,
      details TEXT,
      FOREIGN KEY (registrar_id) REFERENCES registrars(id)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_registrar_actions
    ON registrar_actions(registrar_id, timestamp)
  `);
}

export const queries = {
  /*
   * Domain
  */
  checkDomain: (db: Database, domain: string): Pick<Domain, 'name'> | undefined =>
    db.prepare("SELECT name FROM domains WHERE name = ?")
      .get(domain.toLowerCase()) as Pick<Domain, 'name'> | undefined,

  createDomain: (db: Database, domain: string, registrar: string, expiryDate = calculateExpiryDate()) => {
    const now = Date.now();

    return db.prepare(`
      INSERT INTO domains (
        name,
        registrar,
        created_at,
        status,
        expiry_date
      ) VALUES (?, ?, ?, 'active', ?)
    `).run(domain.toLowerCase(), registrar, now, expiryDate);
  },

  isDomainAvailable: (db: Database, domain: string): { available: boolean, status?: string } => {
    const result = db.prepare(`
      SELECT status
      FROM domains
      WHERE name = ?
    `).get(domain.toLowerCase()) as { status: string } | undefined;

    return {
      available: !result || result.status === 'inactive',
      status: result?.status
    };
  },

  transferDomain: (db: Database, domain: string, registrar: string) => {
    const now = Date.now();
    const expiryDate = calculateExpiryDate();

    return db.prepare(`
      UPDATE domains
      SET registrar = ?,
          status = 'active',
          updated_at = ?,
          expiry_date = ?
      WHERE name = ?
      AND status = 'inactive'
    `).run(registrar, now, expiryDate, domain.toLowerCase());
  },

  getDomainInfo: (db: Database, domain: string): Domain | undefined =>
    db.prepare("SELECT * FROM domains WHERE name = ?")
      .get(domain.toLowerCase()) as Domain | undefined,

  checkRegistrar: (db: Database, id: string, password: string): Pick<Registrar, 'id'> | undefined =>
    db.prepare(
      "SELECT id FROM registrars WHERE id = ? AND password = ?"
    ).get(id, password) as Pick<Registrar, 'id'> | undefined,

  updateDomainStatus: (db: Database, domain: string, status: Domain['status']) =>
    db.prepare(
      "UPDATE domains SET status = ?, updated_at = ? WHERE name = ?"
    ).run(status, Date.now(), domain.toLowerCase()),

  /*
   * Registrar
  */
  getRegistrarDomains: (db: Database, registrarId: string): Domain[] =>
    db.prepare(
      "SELECT * FROM domains WHERE registrar = ?"
    ).all(registrarId) as Domain[],

  updateRegistrarCredits: (db: Database, registrarId: string, credits: number) =>
    db.prepare(
      "UPDATE registrars SET credits = credits + ? WHERE id = ?"
    ).run(credits, registrarId),

  getRegistrarInfo: (db: Database, registrarId: string): Registrar | undefined =>
    db.prepare(
      "SELECT * FROM registrars WHERE id = ?"
    ).get(registrarId) as Registrar | undefined,

  createRegistrar: (db: Database, id: string, password: string) => {
    const initialCredits = 1000;

    try {
      db.prepare(`
        INSERT INTO registrars (id, password, credits)
        VALUES (?, ?, ?)
      `).run(id.toLowerCase(), password, initialCredits);

      return { success: true, registrarId: id };
    } catch (error) {
      if ((error as any).code === 'SQLITE_CONSTRAINT') {
        return { success: false, error: 'Registrar ID already exists' };
      }

      throw error;
    }
  },
  /*
   * Expiry
  */
  todayExpiration: (db: Database) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = tomorrow.getTime();

    return db.prepare(`
      SELECT name FROM domains
      WHERE status = 'active'
      AND expiry_date >= ?
      AND expiry_date < ?
      order by name asc
    `).all(todayStart, tomorrowStart) as { name: string }[];
  },

  /*
   * Log
  */
  logRegistrarAction: (
    db: Database,
    {
      registrarId,
      domain,
      action,
      success,
      details = null
    }: {
      registrarId: string;
      domain: string;
      action: string;
      success: boolean;
      details?: string | null;
    }
  ) => {
    return db.prepare(`
      INSERT INTO registrar_actions (
        registrar_id,
        domain,
        action,
        timestamp,
        success,
        details
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(registrarId, domain, action, Date.now(), success ? 1 : 0, details);
  },

  getRegistrarStats: (db: Database, registrarId: string, startTime: number) => {
    return db.prepare(`
      SELECT
        action,
        COUNT(*) as count,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
        COUNT(DISTINCT domain) as unique_domains
      FROM registrar_actions
      WHERE registrar_id = ?
        AND timestamp >= ?
      GROUP BY action
      ORDER BY count DESC
    `).all(registrarId, startTime) as {
      action: string;
      count: number;
      successful: number;
      unique_domains: number;
    }[];
  },

  getRegistrarTimeline: (db: Database, registrarId: string, startTime: number) => {
    return db.prepare(`
      SELECT domain, action, timestamp, success, details FROM registrar_actions
      WHERE registrar_id = ?
      AND timestamp >= ?
      ORDER BY timestamp ASC
    `).all(registrarId, startTime) as {
      domain: string;
      action: string;
      timestamp: number;
      success: boolean;
      details: string | null;
    }[];
  },

  getDomainHistory: (db: Database, domain: string) => {
    return db.prepare(`
      SELECT registrar_id, action, timestamp, success, details FROM registrar_actions
      WHERE domain = ?
      ORDER BY timestamp ASC
    `).all(domain) as {
      registrar_id: string;
      action: string;
      timestamp: number;
      success: boolean;
      details: string | null;
    }[];
  }
};

export type Queries = typeof queries;
