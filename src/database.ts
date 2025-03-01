import { Database } from "bun:sqlite";
import type { Domain, Registrar } from "./types";

export function initializeDatabase(db: Database) {
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
}

export const queries = {
  /*
   * Domain
  */
  checkDomain: (db: Database, domain: string): Pick<Domain, 'name'> | undefined =>
    db.prepare("SELECT name FROM domains WHERE name = ?")
      .get(domain) as Pick<Domain, 'name'> | undefined,

  createDomain: (db: Database, domain: string, registrar: string) =>
    db.prepare(`
      INSERT INTO domains (
        name,
        registrar,
        created_at,
        status
      ) VALUES (?, ?, ?, 'active')
    `).run(domain, registrar, Date.now()),

  getDomainInfo: (db: Database, domain: string): Domain | undefined =>
    db.prepare("SELECT * FROM domains WHERE name = ?")
      .get(domain) as Domain | undefined,

  checkRegistrar: (db: Database, id: string, password: string): Pick<Registrar, 'id'> | undefined =>
    db.prepare(
      "SELECT id FROM registrars WHERE id = ? AND password = ?"
    ).get(id, password) as Pick<Registrar, 'id'> | undefined,

  updateDomainStatus: (db: Database, domain: string, status: Domain['status']) =>
    db.prepare(
      "UPDATE domains SET status = ?, updated_at = ? WHERE name = ?"
    ).run(status, Date.now(), domain),

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
  }
};

export type Queries = typeof queries;
