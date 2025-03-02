import { Database } from "bun:sqlite";
import type { Domain, SafeRegistrar, Registrar } from "./types";
import { calculateExpiryDate, generateDomainScore } from "./utils/domains";

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
      expiry_date INTEGER,
      score INTEGER CHECK(score BETWEEN 1 AND 100)
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
    VALUES
      ('test1', '${Bun.password.hashSync('test1', 'bcrypt')}', 1000),
      ('test2', '${Bun.password.hashSync('test2', 'bcrypt')}', 1000)
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

  createDomain: (
    db: Database,
    domain: string,
    registrar: string,
    expiryDate = calculateExpiryDate(),
    score = generateDomainScore(),
  ) => {
    const now = Date.now();

    return db.prepare(`
      INSERT INTO domains (
        name,
        registrar,
        created_at,
        status,
        expiry_date,
        score
      ) VALUES (?, ?, ?, 'active', ?, ?)
    `).run(domain.toLowerCase(), registrar, now, expiryDate, score);
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

  getRegistrarInfo: (db: Database, registrarId: string) =>
    db.prepare(
      "SELECT id, credits FROM registrars WHERE id = ?"
    ).get(registrarId) as SafeRegistrar | undefined,

  checkRegistrar: (db: Database, id: string, password: string): Pick<SafeRegistrar, 'id'> | undefined => {
    const registrar = db.prepare(
      "SELECT id, password FROM registrars WHERE id = ?"
    ).get(id) as (Pick<Registrar, 'id' | 'password'> | undefined);

    if (!registrar) return undefined;

    const isValid = Bun.password.verifySync(password, registrar.password, 'bcrypt');
    return isValid ? { id: registrar.id } : undefined;
  },

  createRegistrar: (db: Database, id: string, password: string) => {
    const initialCredits = 1000;

    try {
      const hashedPassword = Bun.password.hashSync(password, 'bcrypt');

      db.prepare(`
        INSERT INTO registrars (id, password, credits)
        VALUES (?, ?, ?)
      `).run(id.toLowerCase(), hashedPassword, initialCredits);

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
  domainWhoExpire: (db: Database, targetDate: Date = new Date()) => {
    targetDate.setHours(0, 0, 0, 0);
    const dayStart = targetDate.getTime();

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayEnd = nextDay.getTime();

    return db.prepare(`
      SELECT name FROM domains
      WHERE status = 'active'
      AND expiry_date >= ?
      AND expiry_date < ?
      order by name asc
    `).all(dayStart, dayEnd) as { name: string }[];
  },
  todayExpirationWithScore: (db: Database) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = tomorrow.getTime();

    return db.prepare(`
      SELECT
        name,
        score,
        CASE
          WHEN score >= 90 THEN 'Rare'
          WHEN score >= 70 THEN 'Valuable'
          WHEN score >= 30 THEN 'Average'
          ELSE 'Low'
        END as category
      FROM domains
      WHERE status = 'active'
      AND expiry_date >= ?
      AND expiry_date < ?
      ORDER BY score DESC, name ASC
    `).all(todayStart, tomorrowStart) as {
      name: string;
      score: number;
      category: 'Rare' | 'Valuable' | 'Average' | 'Low';
    }[];
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
      SELECT domain, action, timestamp, success FROM registrar_actions
      WHERE registrar_id = ?
      AND timestamp >= ?
      ORDER BY timestamp ASC
    `).all(registrarId, startTime) as {
      domain: string;
      action: string;
      timestamp: number;
      success: boolean;
    }[];
  },

  getDomainHistory: (db: Database, domain: string) => {
    return db.prepare(`
      SELECT registrar_id, action, timestamp, success FROM registrar_actions
      WHERE domain = ?
      ORDER BY timestamp ASC
    `).all(domain) as {
      registrar_id: string;
      action: string;
      timestamp: number;
      success: boolean;
    }[];
  }
};

export type Queries = typeof queries;
