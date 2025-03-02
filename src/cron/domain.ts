import { Database } from "bun:sqlite";
import { initializeDatabase, queries } from "../database";
import { SessionManager } from "../logic/session";
import { UsageManager } from "../logic/usage";
import type { AppState } from "../types";
import { logger } from "../utils/logger";
import { isValidDomain } from "../utils/domains";
import { join } from "path";

const db = new Database("registry.sqlite", { create: true });
initializeDatabase(db);

const state: AppState = {
  db,
  rateLimit: new Map(),
  sessionManager: new SessionManager(),
  usageManager: new UsageManager(),
};

const MINIMUM_DOMAINS_PER_DAY = 42;
const DOMAINS_FILE = join(import.meta.dir, "../../storage/top-10000.csv");

async function generateDomains() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const expires = queries.domainWhoExpire(state.db, tomorrow)
  const needed = MINIMUM_DOMAINS_PER_DAY - expires.length;
  console.log({ needed })
  if (needed <= 0) {
    return;
  }

  logger.info(`Generating ${needed} domains for today`);

  try {
    const file = Bun.file(DOMAINS_FILE);
    const content = await file.text();
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length < MINIMUM_DOMAINS_PER_DAY * 2) {
      logger.info(`\n\nRunning low on domains! Only ${lines.length} domains remaining in file`);
    }

    const shuffled = lines.sort(() => Math.random() - 0.5);
    const domainsToUse = shuffled.slice(0, needed * 3);
    const remainingDomains = shuffled.slice(needed);

    const createdDomains: string[] = [];

    for (const domainLine of domainsToUse) {
      if (createdDomains.length >= needed) {
        break;
      }

      const name = domainLine.trim().split('.')[0];
      const domain = `${name}.tsh`;

      if (isValidDomain(domain)) {
        try {
          queries.createDomain(state.db, domain, 'registry', tomorrow.getTime());
          createdDomains.push(domain);
          logger.info(`Created domain: ${domain}`);
        } catch { }
      }
    }

    await Bun.write(DOMAINS_FILE, remainingDomains.join('\n') + '\n');

    logger.info(`${createdDomains.length} / ${needed} domains generated`);
    logger.info(`${remainingDomains.length} domains remaining in file`);
  } catch (error) {
    logger.error("Failed to process domains:", error);
  }
}

generateDomains()
  .catch(console.error)
  .finally(() => db.close());
